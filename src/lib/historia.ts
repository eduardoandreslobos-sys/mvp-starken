import type { Envio } from "./datos";
import { PROBLEMA } from "./agregados";

/* Todo lo que cuenta la historia se calcula aquí, en vivo, desde los envíos.
   Los titulares usan estos números: si cambian los datos, cambia el relato. */

export const REGIONES_NORTE_A_SUR = [
  "Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo", "Valparaíso", "Metropolitana",
  "O'Higgins", "Maule", "Ñuble", "Biobío", "La Araucanía", "Los Ríos", "Los Lagos", "Aysén", "Magallanes",
];
export const REGION_CORTA: Record<string, string> = {
  "Arica y Parinacota": "Arica", Tarapacá: "Tarapacá", Antofagasta: "Antofagasta", Atacama: "Atacama",
  Coquimbo: "Coquimbo", Valparaíso: "Valparaíso", Metropolitana: "RM", "O'Higgins": "O'Higgins", Maule: "Maule",
  Ñuble: "Ñuble", Biobío: "Biobío", "La Araucanía": "Araucanía", "Los Ríos": "Los Ríos", "Los Lagos": "Los Lagos",
  Aysén: "Aysén", Magallanes: "Magallanes",
};
const MOTIVOS_PUERTA = ["Destinatario ausente", "Domicilio cerrado", "Dirección incompleta", "Dirección inexistente"];
const SERVICIOS = ["Normal", "Express", "Mismo Día"];
const BULTOS = ["Sobre", "Bolsa", "Caja", "Pallet"];

const DIA = 86_400_000;
const dias = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DIA);
const prom = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

export type Mes = {
  mes: string;
  envios: number;
  ingresos: number;
  ticket: number;
  aTiempo: number | null;
  problemas: number;
  transito: number | null;
  nota: number | null;
  kgFacturados: number;
  parcial: boolean;
};

export function historia(envios: Envio[]) {
  const ultimo = envios.reduce((m, e) => (e.fecha > m ? e.fecha : m), envios[0].fecha);
  const primero = envios.reduce((m, e) => (e.fecha < m ? e.fecha : m), envios[0].fecha);
  const entregados = envios.filter((e) => e.estado === "Entregado" && e.sla !== "Pendiente");
  const aTiempo = entregados.filter((e) => e.sla === "Sí");
  const tarde = entregados.filter((e) => e.sla === "No");
  const ingresos = envios.reduce((s, e) => s + e.total, 0);

  /* ── Meses ── */
  const porMes = new Map<string, Envio[]>();
  for (const e of envios) {
    const l = porMes.get(e.mes);
    if (l) l.push(e);
    else porMes.set(e.mes, [e]);
  }
  const ultimoDiaMes = (mes: string) => {
    const [y, m] = mes.split("-").map(Number);
    return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  };
  const meses: Mes[] = [...porMes.keys()].sort().map((mes) => {
    const l = porMes.get(mes)!;
    const ent = l.filter((e) => e.sla !== "Pendiente");
    const notas = l.filter((e) => e.calificacion != null).map((e) => e.calificacion!);
    const tr = l.filter((e) => e.estado === "Entregado" && e.diasTransito != null).map((e) => e.diasTransito!);
    const ing = l.reduce((s, e) => s + e.total, 0);
    return {
      mes,
      envios: l.length,
      ingresos: ing,
      ticket: ing / l.length,
      aTiempo: ent.length ? (ent.filter((e) => e.sla === "Sí").length / ent.length) * 100 : null,
      problemas: (l.filter((e) => PROBLEMA.includes(e.estado)).length / l.length) * 100,
      transito: tr.length ? prom(tr) : null,
      nota: notas.length ? prom(notas) : null,
      kgFacturados: l.reduce((s, e) => s + e.pesoKg, 0),
      parcial: ultimoDiaMes(mes) > ultimo,
    };
  });
  const completos = meses.filter((m) => !m.parcial);
  const enviosMes = completos.map((m) => m.envios);
  const ticketMes = completos.map((m) => m.ticket);
  const mesTicketMax = completos.reduce((a, b) => (b.ticket > a.ticket ? b : a), completos[0]);

  /* ── Días de la semana ── */
  const porDia = Array.from({ length: 7 }, () => ({ envios: 0, ingresos: 0 }));
  for (const e of envios) { porDia[e.dia].envios++; porDia[e.dia].ingresos += e.total; }
  const otrosDias = porDia.slice(1, 6).filter((d) => d.envios > 0);
  const lunesVsResto = porDia[0].envios / prom(otrosDias.map((d) => d.envios));
  const lunesIngresos = (porDia[0].ingresos / ingresos) * 100;

  /* ── Promesa por servicio ── */
  const servicios = SERVICIOS.map((s) => {
    const l = entregados.filter((e) => e.servicio === s);
    const todos = envios.filter((e) => e.servicio === s);
    const t = l.filter((e) => e.sla === "No");
    return {
      servicio: s,
      envios: todos.length,
      ticket: prom(todos.map((e) => e.total)),
      prometido: prom(l.map((e) => dias(e.fecha, e.comprometida))),
      real: prom(l.map((e) => e.diasTransito ?? 0)),
      aTiempo: l.length ? ((l.length - t.length) / l.length) * 100 : 0,
      atrasoProm: prom(t.map((e) => dias(e.comprometida, e.entrega!))),
    };
  });
  const normal = servicios.find((s) => s.servicio === "Normal")!;
  const express = servicios.find((s) => s.servicio === "Express")!;

  /* ── Nota según días de atraso ── */
  const conNota = entregados.filter((e) => e.calificacion != null);
  const rango = [-3, -2, -1, 0, 1, 2, 3, 4, 5];
  const notaPorAtraso = rango.map((d) => {
    const l = conNota.filter((e) => {
      const x = dias(e.comprometida, e.entrega!);
      return d === -3 ? x <= -3 : d === 5 ? x >= 5 : x === d;
    });
    return { dias: d, nota: l.length ? prom(l.map((e) => e.calificacion!)) : null, respuestas: l.length };
  });
  const notaATiempo = prom(conNota.filter((e) => e.sla === "Sí").map((e) => e.calificacion!));
  const notaTarde = prom(conNota.filter((e) => e.sla === "No").map((e) => e.calificacion!));
  const dist = (l: Envio[]) => [1, 2, 3, 4, 5].map((n) => (l.length ? l.filter((e) => e.calificacion === n).length / l.length : 0));
  const distATiempo = dist(conNota.filter((e) => e.sla === "Sí"));
  const distTarde = dist(conNota.filter((e) => e.sla === "No"));
  const malas = conNota.filter((e) => e.calificacion! <= 2);
  const malasTarde = malas.filter((e) => e.sla === "No").length;
  const tasaRespuesta = conNota.length / entregados.length;

  /* ── La puerta ── */
  const domicilio = envios.filter((e) => e.tipoEntrega === "Domicilio");
  const retiro = envios.filter((e) => e.tipoEntrega === "Retiro en Sucursal");
  const extra = (e: Envio) => Math.max(0, e.intentos - 1);
  const visitasExtra = domicilio.reduce((s, e) => s + extra(e), 0);
  const visitasPorMotivo = new Map<string, number>();
  for (const e of domicilio) if (extra(e) && e.motivo) visitasPorMotivo.set(e.motivo, (visitasPorMotivo.get(e.motivo) ?? 0) + extra(e));
  const visitasPuerta = MOTIVOS_PUERTA.reduce((s, m) => s + (visitasPorMotivo.get(m) ?? 0), 0);
  const incidencia = (l: Envio[]) => (l.length ? (l.filter((e) => e.motivo).length / l.length) * 100 : 0);

  /* ── Regiones ── */
  const regiones = REGIONES_NORTE_A_SUR.map((r) => {
    const l = envios.filter((e) => e.region === r);
    const ent = entregados.filter((e) => e.region === r);
    return {
      region: r,
      envios: l.length,
      ingresos: l.reduce((s, e) => s + e.total, 0),
      aTiempo: ent.length ? (ent.filter((e) => e.sla === "Sí").length / ent.length) * 100 : 0,
      transito: prom(ent.map((e) => e.diasTransito ?? 0)),
      problemas: l.length ? (l.filter((e) => PROBLEMA.includes(e.estado)).length / l.length) * 100 : 0,
      nota: prom(l.filter((e) => e.calificacion != null).map((e) => e.calificacion!)),
    };
  });
  const aTiempoRegiones = regiones.filter((r) => r.envios >= 150).map((r) => r.aTiempo);

  /* ── Peso cobrado ── */
  const bultos = BULTOS.map((b) => {
    const l = envios.filter((e) => e.bulto === b);
    const real = l.reduce((s, e) => s + e.pesoRealKg, 0);
    const fact = l.reduce((s, e) => s + e.pesoKg, 0);
    return { bulto: b, envios: l.length, real, aire: fact - real, porVolumen: l.length ? (l.filter((e) => e.pesoVolKg > e.pesoRealKg).length / l.length) * 100 : 0 };
  });
  const kgFact = envios.reduce((s, e) => s + e.pesoKg, 0);
  const kgAire = envios.reduce((s, e) => s + (e.pesoKg - e.pesoRealKg), 0);
  const fleteAire = envios.reduce((s, e) => s + (e.pesoKg ? (e.flete / e.pesoKg) * (e.pesoKg - e.pesoRealKg) : 0), 0);
  const fleteTotal = envios.reduce((s, e) => s + e.flete, 0);

  return {
    primero,
    ultimo,
    envios: envios.length,
    ingresos,
    entregados: entregados.length,
    aTiempo: (aTiempo.length / entregados.length) * 100,
    tarde: tarde.length,
    nota: prom(conNota.map((e) => e.calificacion!)),
    problemas: (envios.filter((e) => PROBLEMA.includes(e.estado)).length / envios.length) * 100,
    comunas: new Set(envios.map((e) => e.comuna)).size,
    regionesN: new Set(envios.map((e) => e.region)).size,
    canales: new Set(envios.map((e) => e.canal)).size,
    meses,
    crecimiento: {
      enviosMin: Math.min(...enviosMes),
      enviosMax: Math.max(...enviosMes),
      enviosProm: prom(enviosMes),
      ticketMin: Math.min(...ticketMes),
      ticketMax: Math.max(...ticketMes),
      mesTicketMax,
    },
    semana: { porDia, lunesVsResto, lunesIngresos },
    promesa: { servicios, normal, express, premiumExpress: (express.ticket / normal.ticket - 1) * 100 },
    nota_: { notaPorAtraso, notaATiempo, notaTarde, distATiempo, distTarde, malas: malas.length, malasTarde, pctTarde: (tarde.length / entregados.length) * 100, tasaRespuesta },
    puerta: {
      domicilio: domicilio.length,
      visitasExtra,
      visitasPuerta,
      visitasPorMotivo: [...visitasPorMotivo].map(([nombre, valor]) => ({ nombre, valor, puerta: MOTIVOS_PUERTA.includes(nombre) })).sort((a, b) => b.valor - a.valor),
      incDomicilio: incidencia(domicilio),
      incRetiro: incidencia(retiro),
    },
    mapa: { regiones, min: Math.min(...aTiempoRegiones), max: Math.max(...aTiempoRegiones) },
    peso: { bultos, kgFact, kgAire, pctAire: (kgAire / kgFact) * 100, porVolumen: (envios.filter((e) => e.pesoVolKg > e.pesoRealKg).length / envios.length) * 100, fleteAire, pctFleteAire: (fleteAire / fleteTotal) * 100 },
  };
}

export type Historia = ReturnType<typeof historia>;

/** Nota esperada y % de notas 1–2 si un porcentaje p de las entregas llegara a tiempo. */
export function simular(h: Historia, p: number) {
  const q = p / 100;
  const dist = h.nota_.distATiempo.map((v, i) => q * v + (1 - q) * h.nota_.distTarde[i]);
  const nota = dist.reduce((s, v, i) => s + v * (i + 1), 0);
  return { dist, nota, malas: (dist[0] + dist[1]) * 100 };
}
