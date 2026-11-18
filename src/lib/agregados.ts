import type { Envio, Estado } from "./datos";

export type Periodo = "todo" | "90" | "30" | "mes";
export type Filtros = {
  periodo: Periodo;
  servicio: string; // "" = todos
  zona: string;
  tipoCliente: string;
  canal: string;
};
export const FILTROS_INICIALES: Filtros = { periodo: "todo", servicio: "", zona: "", tipoCliente: "", canal: "" };

const DIA_MS = 86_400_000;
const aFecha = (s: string) => new Date(`${s}T00:00:00Z`);
const aTexto = (d: Date) => d.toISOString().slice(0, 10);

/** Rango [desde, hasta] del periodo, contado hacia atrás desde el último día con datos. */
export function rango(periodo: Periodo, ultimo: string, primero: string): [string, string] {
  const fin = aFecha(ultimo);
  if (periodo === "todo") return [primero, ultimo];
  if (periodo === "mes") return [`${ultimo.slice(0, 7)}-01`, ultimo];
  const dias = Number(periodo);
  return [aTexto(new Date(fin.getTime() - (dias - 1) * DIA_MS)), ultimo];
}

/** El periodo anterior del mismo largo, para comparar. */
export function rangoAnterior([desde, hasta]: [string, string]): [string, string] {
  const d = aFecha(desde).getTime();
  const largo = aFecha(hasta).getTime() - d;
  return [aTexto(new Date(d - DIA_MS - largo)), aTexto(new Date(d - DIA_MS))];
}

export function filtrar(envios: Envio[], f: Filtros, [desde, hasta]: [string, string]) {
  return envios.filter(
    (e) =>
      e.fecha >= desde &&
      e.fecha <= hasta &&
      (!f.servicio || e.servicio === f.servicio) &&
      (!f.zona || e.zona === f.zona) &&
      (!f.tipoCliente || e.tipoCliente === f.tipoCliente) &&
      (!f.canal || e.canal === f.canal),
  );
}

export const PROBLEMA: Estado[] = ["Con Incidencia", "Devuelto a Origen", "Siniestrado"];

export type Kpis = {
  envios: number;
  ingresos: number;
  ticket: number;
  sla: number | null; // % de entregados a tiempo
  problemas: number | null; // % con incidencia, devueltos o siniestrados
  calificacion: number | null;
  respuestas: number;
  transito: number | null;
  pesoKg: number;
};

export function kpis(lista: Envio[]): Kpis {
  let ingresos = 0, pesoKg = 0, si = 0, no = 0, prob = 0, cal = 0, nCal = 0, tr = 0, nTr = 0;
  for (const e of lista) {
    ingresos += e.total;
    pesoKg += e.pesoKg;
    if (e.sla === "Sí") si++;
    else if (e.sla === "No") no++;
    if (PROBLEMA.includes(e.estado)) prob++;
    if (e.calificacion != null) { cal += e.calificacion; nCal++; }
    if (e.estado === "Entregado" && e.diasTransito != null) { tr += e.diasTransito; nTr++; }
  }
  const n = lista.length;
  return {
    envios: n,
    ingresos,
    ticket: n ? ingresos / n : 0,
    sla: si + no ? (si / (si + no)) * 100 : null,
    problemas: n ? (prob / n) * 100 : null,
    calificacion: nCal ? cal / nCal : null,
    respuestas: nCal,
    transito: nTr ? tr / nTr : null,
    pesoKg,
  };
}

/** Lunes de la semana de una fecha YYYY-MM-DD. */
function lunes(fecha: string) {
  const d = aFecha(fecha);
  const dow = (d.getUTCDay() + 6) % 7;
  return aTexto(new Date(d.getTime() - dow * DIA_MS));
}

export type PuntoSemana = { semana: string; envios: number; ingresos: number; parcial: boolean };

export function porSemana(lista: Envio[], [desde, hasta]: [string, string]): PuntoSemana[] {
  const m = new Map<string, PuntoSemana>();
  // Todas las semanas del rango, aunque no tengan envíos, para que el eje no salte.
  for (let t = aFecha(lunes(desde)).getTime(); t <= aFecha(hasta).getTime(); t += 7 * DIA_MS) {
    const s = aTexto(new Date(t));
    const finSemana = aTexto(new Date(t + 6 * DIA_MS));
    m.set(s, { semana: s, envios: 0, ingresos: 0, parcial: s < desde || finSemana > hasta });
  }
  for (const e of lista) {
    const p = m.get(lunes(e.fecha));
    if (p) { p.envios++; p.ingresos += e.total; }
  }
  return [...m.values()];
}

export type Barra = { nombre: string; valor: number; extra?: number };

export function contar(lista: Envio[], clave: (e: Envio) => string | null, valor: (e: Envio) => number = () => 1): Barra[] {
  const m = new Map<string, number>();
  for (const e of lista) {
    const k = clave(e);
    if (k == null) continue;
    m.set(k, (m.get(k) ?? 0) + valor(e));
  }
  return [...m].map(([nombre, v]) => ({ nombre, valor: v })).sort((a, b) => b.valor - a.valor);
}

/** % de entregados dentro de plazo, por grupo. extra = entregados medidos. */
export function slaPor(lista: Envio[], clave: (e: Envio) => string): Barra[] {
  const m = new Map<string, { si: number; n: number }>();
  for (const e of lista) {
    if (e.sla === "Pendiente") continue;
    const k = clave(e);
    const g = m.get(k) ?? { si: 0, n: 0 };
    g.n++;
    if (e.sla === "Sí") g.si++;
    m.set(k, g);
  }
  return [...m].map(([nombre, g]) => ({ nombre, valor: (g.si / g.n) * 100, extra: g.n })).sort((a, b) => b.valor - a.valor);
}

/** Envíos por día de la semana × hora de emisión. */
export function mapaHorario(lista: Envio[]) {
  const horas = new Set<number>();
  const celdas = new Map<string, number>();
  for (const e of lista) {
    horas.add(e.hora);
    const k = `${e.dia}-${e.hora}`;
    celdas.set(k, (celdas.get(k) ?? 0) + 1);
  }
  const listaHoras = [...horas].sort((a, b) => a - b);
  const max = Math.max(1, ...celdas.values());
  return { horas: listaHoras, celdas, max };
}
