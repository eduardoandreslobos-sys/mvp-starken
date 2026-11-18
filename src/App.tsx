import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { cargarEnvios, type Envio } from "./lib/datos";
import { historia, simular, type Historia } from "./lib/historia";
import { clp, clpCorto, d1, fechaCorta, n, pct } from "./lib/formato";
import { Cargando, ErrorCarga, Explorador, TemaToggle } from "./components/explorador";
import {
  Bajar,
  Capitulo,
  CintaChile,
  GraficoCaida,
  GraficoMeses,
  GraficoPeso,
  GraficoPromesa,
  GraficoPuerta,
  GraficoSemana,
  Indice,
  Marca,
  OchoNumeros,
  Simulador,
} from "./components/historia";

const EASE = [0.22, 1, 0.36, 1] as const;

const CAPITULOS = [
  { id: "resumen", titulo: "El año en ocho números" },
  { id: "crecimiento", titulo: "01 · ¿Estamos creciendo?" },
  { id: "semana", titulo: "02 · ¿Cuándo llega el trabajo?" },
  { id: "promesa", titulo: "03 · ¿Cumplimos la promesa?" },
  { id: "nota", titulo: "04 · ¿Cuánto cuesta un día tarde?" },
  { id: "puerta", titulo: "05 · ¿Dónde se traba?" },
  { id: "mapa", titulo: "06 · ¿Es el mapa?" },
  { id: "peso", titulo: "07 · ¿Qué cobramos?" },
  { id: "simulador", titulo: "08 · ¿Y si cumpliéramos?" },
  { id: "decisiones", titulo: "¿Y ahora qué?" },
  { id: "explora", titulo: "Explora tú mismo" },
];

/** "uno de cada cinco", "tres de cada cuatro"… para porcentajes redondos; si no, el porcentaje. */
function fraccion(p: number) {
  const opciones: [number, string][] = [
    [75, "tres de cada cuatro"], [66.7, "dos de cada tres"], [50, "la mitad de las"], [33.3, "uno de cada tres"],
    [25, "uno de cada cuatro"], [20, "uno de cada cinco"], [16.7, "uno de cada seis"], [10, "uno de cada diez"],
  ];
  const [, texto] = opciones.reduce((m, o) => (Math.abs(o[0] - p) < Math.abs(m[0] - p) ? o : m));
  const objetivo = opciones.find((o) => o[1] === texto)![0];
  return Math.abs(objetivo - p) <= 3 ? texto : `el ${pct(p)} de los`;
}
const mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function App() {
  const consulta = useQuery({ queryKey: ["envios"], queryFn: cargarEnvios, staleTime: 5 * 60_000 });
  return (
    <>
      <Cabecera />
      {consulta.isPending && (
        <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-10">
          <Cargando />
        </div>
      )}
      {consulta.isError && (
        <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-10">
          <ErrorCarga onReintentar={() => consulta.refetch()} />
        </div>
      )}
      {consulta.data && <Relato envios={consulta.data} />}
    </>
  );
}

function Cabecera() {
  return (
    <header className="mx-auto flex max-w-[1360px] items-center justify-between gap-4 px-4 pt-6 sm:px-6 lg:px-10">
      <a href="#" className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-ink">
          <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
            <rect x="3" y="11" width="3" height="6" rx="1" fill="var(--seq-200)" />
            <rect x="8.5" y="7" width="3" height="10" rx="1" fill="var(--seq-400)" />
            <rect x="14" y="3" width="3" height="14" rx="1" fill="var(--page)" />
          </svg>
        </span>
        <span className="leading-tight">
          <span className="block text-[14px] font-semibold tracking-[-0.01em]">MVP Starken</span>
          <span className="block text-[12px] text-ink-2">Lectura de envíos 2026</span>
        </span>
      </a>
      <TemaToggle />
    </header>
  );
}

function Relato({ envios }: { envios: Envio[] }) {
  const h = useMemo(() => historia(envios), [envios]);
  return (
    <>
      <Indice capitulos={CAPITULOS} />
      <Portada h={h} />
      <OchoNumeros h={h} />
      <Capitulos h={h} />
      <Decisiones h={h} />
      <Explorador envios={envios} />
      <PieLegal />
    </>
  );
}

/* ═══════════ Portada ═══════════ */

const RUTA = "M-20,250 C120,250 140,120 280,130 S460,300 600,240 S800,60 940,110 S1120,260 1260,170 S1400,90 1480,120";
const PARADAS: [number, number][] = [[280, 130], [600, 240], [940, 110], [1260, 170]];

function Portada({ h }: { h: Historia }) {
  const reducir = useReducedMotion();
  return (
    <section className="relative overflow-hidden">
      {/* Una ruta que se dibuja con un envío recorriéndola: la idea del producto, sin datos. */}
      <svg aria-hidden viewBox="0 0 1460 360" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-x-0 top-[40%] h-[360px] w-full opacity-70">
        <motion.path
          id="ruta"
          d={RUTA}
          fill="none"
          stroke="var(--axis)"
          strokeWidth={1.5}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.4, ease: EASE }}
        />
        {PARADAS.map(([x, y], i) => (
          <motion.circle key={i} cx={x} cy={y} r={5} fill="var(--page)" stroke="var(--axis)" strokeWidth={1.5} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.4 }} />
        ))}
        {!reducir && (
          <g>
            <circle r={14} fill="var(--series-1)" opacity={0.18}>
              <animateMotion dur="9s" repeatCount="indefinite" begin="2.4s" path={RUTA} />
            </circle>
            <circle r={6} fill="var(--series-1)" stroke="var(--page)" strokeWidth={2}>
              <animateMotion dur="9s" repeatCount="indefinite" begin="2.4s" path={RUTA} />
            </circle>
          </g>
        )}
      </svg>

      <div className="relative mx-auto grid min-h-[calc(100svh-80px)] max-w-[1360px] content-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.5fr_1fr] lg:items-end lg:px-10">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-[12px] font-medium text-ink-2 ring-1 ring-ring">
            <span className="size-1.5 rounded-full bg-serie" /> Caso académico · Envíos 2026
          </p>
          <h1 className="text-[clamp(2.8rem,8vw,7rem)] leading-[0.92] font-semibold tracking-[-0.055em]">
            Lo que nos cuentan
            <br />
            <span className="text-serie">{n(h.envios)}</span> envíos.
          </h1>
          <p className="mt-8 max-w-[560px] text-[clamp(1rem,1.4vw,1.2rem)] leading-relaxed text-ink-2">
            Una lectura de punta a punta: cuánto movimos, cuándo, si cumplimos lo que prometimos y dónde se pierde la confianza del cliente.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Bajar href="#resumen" />
            <span className="num text-[13px] text-ink-2">
              {fechaCorta(h.primero)} – {fechaCorta(h.ultimo)} 2026 · {h.comunas} comunas · {h.regionesN} regiones · {h.canales} canales
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
          className="grid gap-3 rounded-[28px] bg-surface/80 p-3 ring-1 ring-ring backdrop-blur-xl"
        >
          <div className="rounded-[20px] bg-ink p-6 text-page">
            <div className="text-[13px] opacity-70">Ingresos con IVA</div>
            <div className="mt-2 text-[clamp(2.6rem,5vw,4rem)] leading-none font-semibold tracking-[-0.045em]">{clpCorto(h.ingresos)}</div>
            <div className="num mt-3 text-[13px] opacity-60">{clp(h.ingresos)}</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { v: pct(h.aTiempo), t: "a tiempo" },
              { v: d1(h.nota), t: "nota de 5" },
              { v: n(h.puerta.visitasExtra), t: "visitas extra" },
            ].map((x) => (
              <div key={x.t} className="rounded-[18px] bg-page p-4">
                <div className="text-[clamp(1.1rem,1.8vw,1.5rem)] font-semibold tracking-[-0.03em]">{x.v}</div>
                <div className="mt-1 text-[12px] text-ink-2">{x.t}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════ Capítulos ═══════════ */

function Capitulos({ h }: { h: Historia }) {
  const c = h.crecimiento;
  const s = h.promesa;
  const nt = h.nota_;
  const notaUnDia = nt.notaPorAtraso.find((x) => x.dias === 1)?.nota ?? nt.notaTarde;
  const pctMalasTarde = (nt.malasTarde / nt.malas) * 100;
  const pctPuerta = (h.puerta.visitasPuerta / h.puerta.visitasExtra) * 100;
  const rm = h.mapa.regiones.find((r) => r.region === "Metropolitana")!;
  const chicas = h.mapa.regiones.filter((r) => r.envios < 150).map((r) => r.region);
  const bolsa = h.peso.bultos.find((b) => b.bulto === "Bolsa")!;
  const sobre = h.peso.bultos.find((b) => b.bulto === "Sobre")!;
  const sim90 = simular(h, 90);
  const base = simular(h, h.aTiempo);
  const enviosMesTxt = `${n(c.enviosMin)} y ${n(c.enviosMax)}`;

  return (
    <>
      <Capitulo
        id="crecimiento"
        numero={1}
        pregunta="¿Estamos creciendo?"
        titular={
          <>
            No: fue un año plano. Lo que se movió fue <Marca>el ticket</Marca>, no el volumen.
          </>
        }
        bajada={`Cada mes completo cerró entre ${enviosMesTxt} envíos. El ticket promedio, en cambio, fue de ${clp(c.ticketMin)} a ${clp(c.ticketMax)}.`}
        lectura={
          <>
            <p>
              El volumen se mueve en una franja de ±{d1(((c.enviosMax - c.enviosMin) / 2 / c.enviosProm) * 100)} % alrededor de {n(Math.round(c.enviosProm))} envíos al mes. Los
              ingresos suben y bajan con el ticket: el mes más alto fue {c.mesTicketMax ? new Date(`${c.mesTicketMax.mes}-15`).toLocaleDateString("es-CL", { month: "long" }) : ""}, con {clp(c.ticketMax)} por envío.
            </p>
            <p>Para crecer de verdad hacen falta más envíos, no envíos más caros: el negocio está estable, pero no está ganando clientes.</p>
          </>
        }
        ojo="el último mes va a medias y no entra en la comparación."
      >
        <GraficoMeses meses={h.meses} />
      </Capitulo>

      <Capitulo
        id="semana"
        numero={2}
        pregunta="¿Cuándo llega el trabajo?"
        titular={
          <>
            El lunes llega <Marca>{h.semana.lunesVsResto >= 1.8 ? "el doble" : `${d1(h.semana.lunesVsResto)} veces más`}</Marca>.
          </>
        }
        bajada={`Los domingos no se emite: lo del fin de semana se acumula y cae el lunes. Un solo día de la semana trae el ${pct(h.semana.lunesIngresos)} de los ingresos.`}
        lectura={
          <>
            <p>
              Con la misma dotación todos los días, el lunes es el día con más riesgo de romper la promesa. Clasificación, ruteo y atención
              deberían planificarse para un lunes que pesa ×{d1(h.semana.lunesVsResto)}, no para un día promedio.
            </p>
            <p>La otra salida es suavizar la ola: retiro programado el sábado para cuentas corporativas y e-commerce.</p>
          </>
        }
        ojo="el día es el de emisión del envío, no el de entrega."
      >
        <GraficoSemana h={h} />
      </Capitulo>

      <Capitulo
        id="promesa"
        numero={3}
        pregunta="¿Cumplimos lo que prometemos?"
        titular={
          <>
            {mayus(fraccion(100 - h.aTiempo))} envíos llega tarde, y pagar Express <Marca>no cambia eso</Marca>.
          </>
        }
        bajada={`Express cuesta ${pct(s.premiumExpress)} más y llega antes (${d1(s.express.real)} contra ${d1(s.normal.real)} días), pero incumple su propia promesa igual que Normal: ${pct(s.express.aTiempo)} contra ${pct(s.normal.aTiempo)} a tiempo.`}
        lectura={
          <>
            <p>
              Quien paga Express compra velocidad, y la recibe. Lo que no compra es certeza: la probabilidad de que llegue el día prometido es la misma
              que en el servicio más barato. Y cuando falla, el atraso es parecido en los tres servicios: entre {d1(Math.min(...s.servicios.map((x) => x.atrasoProm)))} y{" "}
              {d1(Math.max(...s.servicios.map((x) => x.atrasoProm)))} días.
            </p>
            <p>El problema no está en qué servicio se vende, sino en cómo se fija y se protege la fecha comprometida.</p>
          </>
        }
        ojo="se miden solo los envíos ya entregados; los que siguen en camino no entran."
      >
        <GraficoPromesa h={h} />
      </Capitulo>

      <Capitulo
        id="nota"
        numero={4}
        oscuro
        pregunta="¿Cuánto cuesta un día de atraso?"
        titular={
          <>
            Un día tarde baja la nota de {d1(nt.notaATiempo)} a {d1(notaUnDia)}. <Marca>Cinco días cuestan lo mismo.</Marca>
          </>
        }
        bajada={`Los envíos atrasados son el ${pct(nt.pctTarde)} de las entregas, pero explican el ${pct(pctMalasTarde)} de las notas 1 y 2.`}
        lectura={
          <>
            <p>
              La nota no se degrada de a poco: cae de golpe al pasar la fecha comprometida y se queda abajo. Para el cliente, la promesa es binaria:
              se cumple o no.
            </p>
            <p>
              Eso cambia las prioridades. Rescatar un envío que va a llegar un día tarde vale tanto como uno que va cinco días tarde, y es mucho más
              fácil. Detectar a tiempo los envíos en riesgo, y avisar al cliente antes de la fecha, es donde más rinde cada peso.
            </p>
          </>
        }
        ojo={`solo el ${pct(nt.tasaRespuesta * 100)} de los clientes con envío entregado contestó la encuesta: la nota es de quienes respondieron.`}
      >
        <GraficoCaida h={h} />
      </Capitulo>

      <Capitulo
        id="puerta"
        numero={5}
        pregunta="¿Dónde se traba la entrega?"
        titular={
          <>
            En la puerta: <Marca>{fraccion(pctPuerta)}</Marca> visitas extra son por nadie en casa o una dirección mala.
          </>
        }
        bajada={`Las entregas a domicilio tienen alguna incidencia en el ${pct(h.puerta.incDomicilio)} de los casos; los retiros en sucursal, en el ${pct(h.puerta.incRetiro)}.`}
        lectura={
          <>
            <p>
              Destinatario ausente, domicilio cerrado y dirección incompleta o inexistente se pueden resolver antes de salir a ruta: validar la dirección
              al emitir, avisar por mensaje con una ventana horaria y ofrecer cambiar a retiro en sucursal.
            </p>
            <p>Cada visita evitada es un viaje, un conductor y una hora de ruta que se liberan para otro envío.</p>
          </>
        }
        ojo="en estos datos, los envíos con dos o tres visitas no tienen peor nota que el resto: el costo de la puerta es operativo, no de experiencia."
      >
        <GraficoPuerta h={h} />
      </Capitulo>

      <Capitulo
        id="mapa"
        numero={6}
        pregunta="¿Es un problema del mapa?"
        titular={
          <>
            No. De Arica a Magallanes, todas las regiones cumplen <Marca>entre {pct(h.mapa.min)} y {pct(h.mapa.max)}</Marca>.
          </>
        }
        bajada={`La Región Metropolitana concentra el ${pct((rm.envios / h.envios) * 100)} de los envíos. El extremo sur tarda más días, pero también se le promete más.`}
        lectura={
          <>
            <p>
              Si el cumplimiento fuera un problema de distancia, el sur y el norte estarían muy por debajo de Santiago. No lo están: la brecha entre la
              mejor y la peor región con volumen suficiente es de {d1(h.mapa.max - h.mapa.min)} puntos.
            </p>
            <p>El atraso es del proceso, no del territorio. Abrir sucursales o rutas en una región no lo resolvería.</p>
          </>
        }
        ojo={chicas.length ? `${chicas.join(" y ")} tienen menos de 150 envíos: su porcentaje se mueve mucho con pocos casos y queda fuera del rango del titular.` : undefined}
      >
        <CintaChile h={h} />
      </Capitulo>

      <Capitulo
        id="peso"
        numero={7}
        pregunta="¿Qué estamos cobrando?"
        titular={
          <>
            {mayus(fraccion(h.peso.pctAire).replace("uno de cada", "uno de cada"))} kilos que cobramos <Marca>es aire</Marca>.
          </>
        }
        bajada={`El ${pct(h.peso.porVolumen)} de los envíos se cobra por peso volumétrico: el ${pct(bolsa.porVolumen)} de las bolsas y apenas el ${pct(sobre.porVolumen)} de los sobres.`}
        lectura={
          <>
            <p>
              Cobrar por volumen es correcto: el espacio en el camión cuesta. Pero es una conversación pendiente con el cliente, que suele creer que
              paga por kilo y se sorprende con la boleta.
            </p>
            <p>
              Una guía de embalaje para PYME y e-commerce, o una calculadora de volumen en la web, convierte una fuente de reclamos en una ventaja: el
              cliente que embala mejor paga menos y la operación carga mejor el camión.
            </p>
          </>
        }
        ojo="el flete atribuible al volumen es una estimación lineal por kilo; la tarifa real tiene tramos."
      >
        <GraficoPeso h={h} />
      </Capitulo>

      <Capitulo
        id="simulador"
        numero={8}
        oscuro
        pregunta="¿Y si cumpliéramos la promesa?"
        titular={
          <>
            Con 90 % a tiempo, las notas 1 y 2 bajarían de {pct(base.malas)} a <Marca>{pct(sim90.malas)}</Marca>.
          </>
        }
        bajada="Mueve la barra para ver qué pasaría con la encuesta si más envíos llegaran el día prometido."
        lectura={
          <p>
            Pasar de {pct(h.aTiempo)} a 90 % a tiempo llevaría la nota promedio de {d1(base.nota)} a {d1(sim90.nota)}. No parece mucho, pero el cambio
            está en la cola: las notas 1 y 2 caen un {pct(((base.malas - sim90.malas) / base.malas) * 100)}, y esos son los clientes que no vuelven y
            los que reclaman en público.
          </p>
        }
        ojo="la simulación supone que la nota depende solo de llegar a tiempo. Otros factores, como daños o la atención, quedan fuera."
      >
        <Simulador h={h} />
      </Capitulo>
    </>
  );
}

/* ═══════════ ¿Y ahora qué? ═══════════ */

function Decisiones({ h }: { h: Historia }) {
  const nt = h.nota_;
  const notaUnDia = nt.notaPorAtraso.find((x) => x.dias === 1)?.nota ?? nt.notaTarde;
  const respuestas = [
    ["Crecimiento", `Año plano: entre ${n(h.crecimiento.enviosMin)} y ${n(h.crecimiento.enviosMax)} envíos al mes. El ingreso se mueve con el ticket.`],
    ["Semana", `El lunes pesa ×${d1(h.semana.lunesVsResto)} y trae el ${pct(h.semana.lunesIngresos)} de los ingresos.`],
    ["Promesa", `${pct(100 - h.aTiempo)} llega tarde. Express es más rápido, pero no más puntual.`],
    ["Nota", `Un día tarde baja la nota de ${d1(nt.notaATiempo)} a ${d1(notaUnDia)}; más días no la bajan más.`],
    ["Puerta", `${n(h.puerta.visitasExtra)} visitas extra; ${pct((h.puerta.visitasPuerta / h.puerta.visitasExtra) * 100)} por nadie en casa o dirección mala.`],
    ["Mapa", `Todas las regiones con volumen cumplen entre ${pct(h.mapa.min)} y ${pct(h.mapa.max)}: no es geográfico.`],
    ["Cobro", `${pct(h.peso.pctAire)} de los kilos cobrados es volumen, no peso.`],
    ["Simulación", `Con 90 % a tiempo, las notas 1–2 bajarían de ${pct(simular(h, h.aTiempo).malas)} a ${pct(simular(h, 90).malas)}.`],
  ];
  const decisiones = [
    { t: "Proteger la fecha comprometida", d: "Alerta temprana para los envíos en riesgo y aviso al cliente antes de que venza el plazo. Es donde se gana o se pierde la nota." },
    { t: "Resolver la puerta antes de salir a ruta", d: "Validar la dirección al emitir, coordinar una ventana horaria y ofrecer retiro en sucursal. Menos viajes perdidos." },
    { t: "Planificar para el lunes y revisar Express", d: "Dimensionar la operación para el día que pesa el doble. Y que Express venda certeza, no solo velocidad." },
  ];
  return (
    <section id="decisiones" data-capitulo={10} className="tono-oscuro scroll-mt-4 bg-page py-20 text-ink sm:py-28">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-10">
        <div className="mb-12 grid gap-6 lg:grid-cols-[120px_1fr]">
          <div className="font-mono text-[13px] text-muted">Cierre</div>
          <div>
            <p className="mb-4 text-[13px] font-medium tracking-[0.08em] text-serie uppercase">¿Y ahora qué?</p>
            <h2 className="max-w-[880px] text-[clamp(1.9rem,4.2vw,3.4rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-balance">
              Ocho preguntas, ocho respuestas con datos, y <Marca>tres decisiones</Marca>.
            </h2>
          </div>
        </div>
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:pl-[144px]">
          <ol className="divide-y divide-[var(--grid)]">
            {respuestas.map(([t, d], i) => (
              <motion.li
                key={t}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.04, ease: EASE }}
                className="grid grid-cols-[44px_1fr] gap-3 py-3.5"
              >
                <span className="font-mono text-[12px] text-muted">P{i + 1}</span>
                <p className="text-[14px] leading-snug text-ink-2">
                  <strong className="font-semibold text-ink">{t}.</strong> {d}
                </p>
              </motion.li>
            ))}
          </ol>
          <div className="grid content-start gap-3">
            {decisiones.map((x, i) => (
              <motion.div
                key={x.t}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: EASE }}
                className="rounded-3xl bg-surface p-6 ring-1 ring-ring"
              >
                <div className="mb-3 inline-flex rounded-full bg-serie px-2.5 py-0.5 font-mono text-[11px] font-medium text-white">Decisión {i + 1}</div>
                <h3 className="text-[18px] font-semibold tracking-[-0.02em]">{x.t}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{x.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PieLegal() {
  return (
    <footer className="mx-auto max-w-[1360px] px-4 pb-12 text-[12px] leading-relaxed text-muted sm:px-6 lg:px-10">
      Caso académico con datos de ejemplo de un curso. No son cifras oficiales de Starken ni deben usarse para decisiones reales. El panel no muestra
      datos personales.
    </footer>
  );
}
