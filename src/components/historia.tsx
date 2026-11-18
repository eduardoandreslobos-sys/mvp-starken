import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import clsx from "clsx";
import { BookOpen, ChevronDown, X } from "lucide-react";
import { Tooltip } from "./base";
import { REGION_CORTA, simular, type Historia, type Mes } from "../lib/historia";
import { clp, clpCorto, d1, n, pct } from "../lib/formato";

const EASE = [0.22, 1, 0.36, 1] as const;
const MES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
const MES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mesCorto = (m: string) => MES_CORTO[Number(m.slice(5, 7)) - 1];
const mesLargo = (m: string) => MES_LARGO[Number(m.slice(5, 7)) - 1];
type Pos = { x: number; y: number } | null;

/* Los gráficos no detectan por sí mismos cuándo se ven (una barra de alto 0 nunca "entra" en
   pantalla). El capítulo pasa de "oculto" a "visible" una vez y cada marca hereda ese estado. */
const crece = (desde: Record<string, string | number>, hasta: Record<string, string | number>, delay = 0, duration = 0.7): Variants => ({
  oculto: desde,
  visible: { ...hasta, transition: { duration, delay, ease: EASE } },
});

/* ════════════════ Piezas del relato ════════════════ */

/** Resalta la frase que lleva el hallazgo. */
export function Marca({ children }: { children: ReactNode }) {
  return (
    <span className="relative whitespace-nowrap">
      <motion.span
        aria-hidden
        className="absolute inset-x-[-0.08em] bottom-[0.06em] -z-0 h-[0.36em] origin-left rounded-[3px] bg-[var(--marca)]"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, delay: 0.25, ease: EASE }}
      />
      <span className="relative">{children}</span>
    </span>
  );
}

export function Capitulo({
  id,
  numero,
  pregunta,
  titular,
  bajada,
  lectura,
  ojo,
  oscuro,
  children,
}: {
  id: string;
  numero: number;
  pregunta: string;
  titular: ReactNode;
  bajada?: ReactNode;
  lectura?: ReactNode;
  ojo?: ReactNode;
  oscuro?: boolean;
  children: ReactNode;
}) {
  const [abierta, setAbierta] = useState(false);
  return (
    <section
      id={id}
      data-capitulo={numero}
      className={clsx("scroll-mt-4 py-20 sm:py-28", oscuro && "tono-oscuro bg-page text-ink")}
      aria-labelledby={`${id}-titulo`}
    >
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-10">
        <motion.header
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-10 grid gap-6 lg:mb-14 lg:grid-cols-[120px_1fr]"
        >
          <div className="font-mono text-[13px] text-muted">
            <span className="text-ink">{String(numero).padStart(2, "0")}</span> / 08
          </div>
          <div className="max-w-[880px]">
            <p className="mb-4 text-[13px] font-medium tracking-[0.08em] text-serie uppercase">{pregunta}</p>
            <h2 id={`${id}-titulo`} className="text-[clamp(1.9rem,4.2vw,3.4rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-balance">
              {titular}
            </h2>
            {bajada && <p className="mt-5 max-w-[640px] text-[16px] leading-relaxed text-ink-2">{bajada}</p>}
          </div>
        </motion.header>

        <motion.div
          initial="oculto"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={crece({ opacity: 0, y: 24 }, { opacity: 1, y: 0 }, 0.1, 0.6)}
          className="lg:pl-[144px]"
        >
          {children}

          {lectura && (
            <div className="mt-8">
              <button
                type="button"
                onClick={() => setAbierta((a) => !a)}
                aria-expanded={abierta}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[14px] font-medium text-page transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-serie active:scale-[0.98]"
              >
                {abierta ? <X className="size-4" /> : <BookOpen className="size-4" />}
                {abierta ? "Cerrar la lectura" : "Ver la lectura"}
              </button>
              <AnimatePresence initial={false}>
                {abierta && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 grid max-w-[880px] gap-4 rounded-3xl bg-surface p-6 ring-1 ring-ring sm:grid-cols-[auto_1fr] sm:p-7">
                      <span className="font-mono text-[12px] tracking-[0.08em] text-muted uppercase">Lectura</span>
                      <div className="space-y-3 text-[15px] leading-relaxed text-ink">
                        {lectura}
                        {ojo && (
                          <p className="border-t border-grid pt-3 text-[14px] text-ink-2">
                            <strong className="font-semibold text-ink">Ojo: </strong>
                            {ojo}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("rounded-3xl bg-surface p-5 ring-1 ring-ring sm:p-7", className)}>{children}</div>;
}

function Cifra({ valor, etiqueta, nota, acento }: { valor: string; etiqueta: string; nota?: string; acento?: boolean }) {
  return (
    <div>
      <div className={clsx("text-[clamp(2rem,3.6vw,2.9rem)] leading-none font-semibold tracking-[-0.04em]", acento && "text-serie")}>{valor}</div>
      <div className="mt-2 text-[13px] text-ink-2">{etiqueta}</div>
      {nota && <div className="mt-0.5 text-[12px] text-muted">{nota}</div>}
    </div>
  );
}

function Leyenda({ items }: { items: { color: string; texto: string; forma?: "punto" | "aro" }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-ink-2">
      {items.map((i) => (
        <li key={i.texto} className="flex items-center gap-2">
          {i.forma === "aro" ? (
            <span className="size-2.5 rounded-full bg-surface" style={{ boxShadow: `inset 0 0 0 2px ${i.color}` }} />
          ) : (
            <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} />
          )}
          {i.texto}
        </li>
      ))}
    </ul>
  );
}

function useTip<T>() {
  const [tip, setTip] = useState<{ v: T; pos: Pos } | null>(null);
  return {
    tip,
    on: (v: T) => ({
      onMouseMove: (e: React.MouseEvent) => setTip({ v, pos: { x: e.clientX, y: e.clientY } }),
      onMouseLeave: () => setTip(null),
    }),
  };
}

/* ════════════════ 00 · El año en ocho números ════════════════ */

function Sparkline({ valores, ultimoParcial }: { valores: (number | null)[]; ultimoParcial?: boolean }) {
  const v = valores.map((x) => x ?? NaN);
  const finitos = v.filter(Number.isFinite);
  const min = Math.min(...finitos), max = Math.max(...finitos);
  const W = 120, H = 32;
  const x = (i: number) => (i / (v.length - 1)) * W;
  const y = (val: number) => (max === min ? H / 2 : H - 3 - ((val - min) / (max - min)) * (H - 6));
  const completos = ultimoParcial ? v.slice(0, -1) : v;
  const d = completos.map((val, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(val).toFixed(1)}`).join("");
  const iu = completos.length - 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-8 w-full overflow-visible" aria-hidden preserveAspectRatio="none">
      <path d={d} fill="none" stroke="var(--muted)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(iu)} cy={y(completos[iu])} r={3} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={1.5} />
    </svg>
  );
}

export function OchoNumeros({ h }: { h: Historia }) {
  const m = h.meses;
  const parcial = m.at(-1)?.parcial;
  const transito = m.reduce((s, x) => s + (x.transito ?? 0) * x.envios, 0) / m.reduce((s, x) => s + (x.transito != null ? x.envios : 0), 0);
  const tiles: { etiqueta: string; valor: string; serie: (number | null)[] }[] = [
    { etiqueta: "Envíos", valor: n(h.envios), serie: m.map((x) => x.envios) },
    { etiqueta: "Ingresos con IVA", valor: clpCorto(h.ingresos), serie: m.map((x) => x.ingresos) },
    { etiqueta: "Ticket promedio", valor: clp(h.ingresos / h.envios), serie: m.map((x) => x.ticket) },
    { etiqueta: "Entregados a tiempo", valor: pct(h.aTiempo), serie: m.map((x) => x.aTiempo) },
    { etiqueta: "Con problema", valor: pct(h.problemas), serie: m.map((x) => x.problemas) },
    { etiqueta: "Tránsito promedio", valor: `${d1(transito)} días`, serie: m.map((x) => x.transito) },
    { etiqueta: "Nota de clientes", valor: `${d1(h.nota)} / 5`, serie: m.map((x) => x.nota) },
    { etiqueta: "Kilos cobrados", valor: `${n(Math.round(h.peso.kgFact / 1000))} t`, serie: m.map((x) => x.kgFacturados) },
  ];
  return (
    <section id="resumen" data-capitulo={0} className="mx-auto max-w-[1240px] scroll-mt-4 px-4 py-16 sm:px-6 lg:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-[clamp(1.5rem,2.6vw,2rem)] font-semibold tracking-[-0.03em]">El año en ocho números</h2>
        <p className="text-[13px] text-ink-2">La línea es la serie mensual; el punto, el último mes completo.</p>
      </div>
      <motion.div
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
        initial="oculto"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
      >
        {tiles.map((t, i) => (
          <motion.div
            key={t.etiqueta}
            variants={crece({ opacity: 0, y: 16 }, { opacity: 1, y: 0 }, i * 0.04, 0.5)}
            className="flex flex-col gap-4 rounded-2xl bg-surface p-4 ring-1 ring-ring sm:p-5"
          >
            <div className="text-[12px] text-ink-2">{t.etiqueta}</div>
            <div className="text-[clamp(1.35rem,2.2vw,1.85rem)] leading-none font-semibold tracking-[-0.03em]">{t.valor}</div>
            <Sparkline valores={t.serie} ultimoParcial={parcial} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

/* ════════════════ 01 · ¿Estamos creciendo? ════════════════ */

export function GraficoMeses({ meses }: { meses: Mes[] }) {
  const { tip, on } = useTip<Mes>();
  const max = Math.max(...meses.map((m) => m.envios));
  const completos = meses.filter((m) => !m.parcial);
  const tMin = Math.min(...completos.map((m) => m.ticket)), tMax = Math.max(...completos.map((m) => m.ticket));
  const W = 1000, H = 120;
  const x = (i: number) => ((i + 0.5) / meses.length) * W;
  const y = (t: number) => H - 14 - ((t - tMin) / (tMax - tMin || 1)) * (H - 34);
  const linea = completos.map((m, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(m.ticket).toFixed(1)}`).join("");
  const iMax = completos.findIndex((m) => m.ticket === tMax);
  return (
    <div className="grid gap-4">
      <Panel>
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[14px] font-semibold">Envíos por mes</h3>
          <span className="text-[12px] text-muted">{mesLargo(meses.at(-1)!.mes)} va a medias: se muestra más claro</span>
        </div>
        <div className="flex h-[220px] items-end gap-2 sm:gap-4">
          {meses.map((m, i) => (
            <div key={m.mes} className="flex h-full flex-1 flex-col items-center justify-end gap-2" {...on(m)}>
              <span className="num text-[11px] text-ink-2">{m.envios === max || i === 0 || m.parcial ? n(m.envios) : ""}</span>
              <motion.div
                className="w-full max-w-[24px] rounded-t-[4px] bg-serie"
                style={{ opacity: m.parcial ? 0.35 : 1 }}
                variants={crece({ height: 0 }, { height: `${(m.envios / max) * 170}px` }, i * 0.04)}
              />
              <span className="text-[11px] text-muted">{mesCorto(m.mes)}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[14px] font-semibold">Ticket promedio por mes</h3>
          <span className="text-[12px] text-muted">solo meses completos</span>
        </div>
        <div className="relative h-[120px]">
          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none" role="img" aria-label="Ticket promedio mensual">
            <line x1={0} x2={W} y1={H - 4} y2={H - 4} stroke="var(--axis)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <motion.path
              d={linea}
              fill="none"
              stroke="var(--series-1)"
              strokeWidth={2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              variants={crece({ pathLength: 0 }, { pathLength: 1 }, 0.1, 1.2)}
            />
          </svg>
          <div className="absolute inset-0 flex">
            {meses.map((m, i) =>
              m.parcial ? (
                <span key={m.mes} className="flex-1" />
              ) : (
                <span key={m.mes} className="relative flex-1" {...on(m)}>
                  <span
                    className="absolute left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-serie ring-2 ring-[var(--surface)]"
                    style={{ top: `${(y(m.ticket) / H) * 100}%` }}
                  />
                  {i === iMax && (
                    <span className="num absolute left-1/2 -translate-x-1/2 text-[11px] font-medium whitespace-nowrap" style={{ top: `calc(${(y(m.ticket) / H) * 100}% - 26px)` }}>
                      {clp(m.ticket)}
                    </span>
                  )}
                </span>
              ),
            )}
          </div>
        </div>
        <div className="mt-3 flex">
          {meses.map((m) => (
            <span key={m.mes} className="flex-1 text-center text-[11px] text-muted">
              {mesCorto(m.mes)}
            </span>
          ))}
        </div>
      </Panel>
      {tip?.pos && (
        <Tooltip {...tip.pos}>
          <div className="font-medium capitalize">
            {mesLargo(tip.v.mes)}
            {tip.v.parcial ? " (en curso)" : ""}
          </div>
          <div className="num opacity-80">
            {n(tip.v.envios)} envíos · ticket {clp(tip.v.ticket)}
          </div>
          <div className="num opacity-60">{clpCorto(tip.v.ingresos)} con IVA</div>
        </Tooltip>
      )}
    </div>
  );
}

/* ════════════════ 02 · ¿Cuándo llega el trabajo? ════════════════ */

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function GraficoSemana({ h }: { h: Historia }) {
  const { tip, on } = useTip<number>();
  const d = h.semana.porDia;
  const max = Math.max(...d.map((x) => x.envios));
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <Panel>
        <h3 className="mb-6 text-[14px] font-semibold">Envíos según el día en que se emiten</h3>
        <div className="flex h-[240px] items-end gap-3 sm:gap-6">
          {d.map((x, i) => (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2" {...on(i)}>
              <span className={clsx("num text-[12px]", i === 0 ? "font-semibold text-ink" : "text-ink-2")}>{x.envios ? n(x.envios) : "—"}</span>
              <motion.div
                className={clsx("w-full max-w-[24px] rounded-t-[4px]", i === 0 ? "bg-serie" : "bg-[var(--axis)]")}
                variants={crece({ height: 0 }, { height: `${Math.max(2, (x.envios / max) * 190)}px` }, i * 0.05)}
              />
              <span className={clsx("text-[12px]", i === 0 ? "font-medium text-ink" : "text-muted")}>{DIAS[i].slice(0, 3)}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="flex flex-col justify-between gap-8">
        <Cifra valor={`×${d1(h.semana.lunesVsResto)}`} etiqueta="envíos del lunes contra el promedio de martes a viernes" acento />
        <Cifra valor={pct(h.semana.lunesIngresos)} etiqueta="de los ingresos del año entra un lunes" />
      </Panel>
      {tip?.pos && (
        <Tooltip {...tip.pos}>
          <div className="font-medium">{DIAS[tip.v]}</div>
          <div className="num opacity-80">{d[tip.v].envios ? `${n(d[tip.v].envios)} envíos · ${clpCorto(d[tip.v].ingresos)}` : "Sin emisión"}</div>
        </Tooltip>
      )}
    </div>
  );
}

/* ════════════════ 03 · ¿Cumplimos lo que prometemos? ════════════════ */

export function GraficoPromesa({ h }: { h: Historia }) {
  const s = h.promesa.servicios;
  const maxDias = Math.ceil(Math.max(...s.map((x) => Math.max(x.prometido, x.real))) + 0.5);
  const xp = (v: number) => `${(v / maxDias) * 100}%`;
  return (
    <Panel>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[14px] font-semibold">Días hábiles: lo prometido y lo que de verdad toma</h3>
        <Leyenda
          items={[
            { color: "var(--muted)", texto: "Plazo prometido", forma: "aro" },
            { color: "var(--series-1)", texto: "Tránsito real promedio" },
          ]}
        />
      </div>
      <div className="grid gap-9">
        {s.map((x, i) => (
          <div key={x.servicio} className="grid items-center gap-x-6 gap-y-3 sm:grid-cols-[110px_1fr_170px]">
            <div>
              <div className="text-[14px] font-medium">{x.servicio}</div>
              <div className="num text-[12px] text-muted">ticket {clp(x.ticket)}</div>
            </div>
            <div className="relative mx-2 h-8">
              <div className="absolute inset-x-0 top-1/2 h-px bg-grid" />
              <motion.div
                className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[var(--axis)]"
                style={{ left: xp(Math.min(x.prometido, x.real)) }}
                variants={crece({ width: "0%" }, { width: `${(Math.abs(x.prometido - x.real) / maxDias) * 100}%` }, 0.2 + i * 0.1, 0.8)}
              />
              <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface ring-2 ring-[var(--muted)]" style={{ left: xp(x.prometido) }} />
              <motion.span
                className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-serie ring-2 ring-[var(--surface)]"
                variants={crece({ left: xp(x.prometido) }, { left: xp(x.real) }, 0.2 + i * 0.1, 0.8)}
              />
              <span className="num absolute -top-4 -translate-x-1/2 text-[11px] text-muted" style={{ left: xp(x.prometido) }}>
                {d1(x.prometido)}
              </span>
              <span className="num absolute top-7 -translate-x-1/2 text-[11px] font-medium" style={{ left: xp(x.real) }}>
                {d1(x.real)}
              </span>
            </div>
            <div className="flex items-baseline gap-2 sm:justify-end">
              <span className="num text-[22px] font-semibold tracking-[-0.02em]">{pct(x.aTiempo)}</span>
              <span className="text-[12px] text-ink-2">a tiempo</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 hidden border-t border-grid pt-3 sm:ml-[142px] sm:mr-[202px] sm:block">
        <div className="relative mx-2 h-4">
          {Array.from({ length: maxDias + 1 }, (_, i) => (
            <span key={i} className="num absolute -translate-x-1/2 text-[11px] text-muted" style={{ left: xp(i) }}>
              {i}
            </span>
          ))}
        </div>
        <div className="mt-1 text-center text-[11px] text-muted">días hábiles desde la emisión</div>
      </div>
    </Panel>
  );
}

/* ════════════════ 04 · ¿Cuánto cuesta un día de atraso? ════════════════ */

const ESCALA_NOTA = ["#e34948", "#f2a09f", "var(--nota-3)", "#86b6ef", "#2a78d6"];
const TINTA_NOTA = ["#fff", "#0b0b0b", "#0b0b0b", "#0b0b0b", "#fff"];

export function GraficoCaida({ h }: { h: Historia }) {
  const { tip, on } = useTip<(typeof h.nota_.notaPorAtraso)[number]>();
  const datos = h.nota_.notaPorAtraso.filter((d) => d.nota != null);
  const etiqueta = (d: number) => (d < 0 ? (d === -3 ? "3+ antes" : `${-d} antes`) : d === 0 ? "el día" : d === 5 ? "5+ tarde" : `${d} tarde`);
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Panel>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[14px] font-semibold">Nota promedio según los días respecto de la fecha comprometida</h3>
          <Leyenda items={[{ color: "var(--series-1)", texto: "A tiempo" }, { color: "var(--series-2)", texto: "Tarde" }]} />
        </div>
        <div className="relative flex h-[260px] items-end gap-2 sm:gap-4">
          {datos.map((d, i) => {
            const tarde = d.dias > 0;
            const destacado = d.dias === 0 || d.dias === 1;
            return (
              <div key={d.dias} className="relative flex h-full flex-1 flex-col items-center justify-end gap-2" {...on(d)}>
                {d.dias === 1 && <span aria-hidden className="absolute top-0 bottom-7 -left-1 w-px bg-[var(--axis)] sm:-left-2" />}
                <span className={clsx("num text-[12px]", destacado ? "font-semibold text-ink" : "text-transparent")}>{d1(d.nota!)}</span>
                <motion.div
                  className="w-full max-w-[24px] rounded-t-[4px]"
                  style={{ background: tarde ? "var(--series-2)" : "var(--series-1)" }}
                  variants={crece({ height: 0 }, { height: `${(d.nota! / 5) * 200}px` }, i * 0.05)}
                />
                <span className="text-center text-[10px] leading-tight text-muted sm:text-[11px]">{etiqueta(d.dias)}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[12px] text-muted">La línea vertical es la fecha comprometida. Pasa el cursor para ver cada barra.</p>
      </Panel>
      <Panel>
        <h3 className="mb-5 text-[14px] font-semibold">Cómo se reparten las notas</h3>
        {[
          { t: "Llegó a tiempo", d: h.nota_.distATiempo },
          { t: "Llegó tarde", d: h.nota_.distTarde },
        ].map((fila) => (
          <div key={fila.t} className="mb-5">
            <div className="mb-2 text-[13px] text-ink-2">{fila.t}</div>
            <div className="flex h-7 gap-[2px]">
              {fila.d.map((v, i) => (
                <motion.div
                  key={i}
                  className="flex items-center overflow-hidden rounded-[4px] pl-1.5"
                  style={{ background: ESCALA_NOTA[i] }}
                  variants={crece({ flexGrow: 0.001 }, { flexGrow: Math.max(v, 0.001) }, 0.2, 0.8)}
                >
                  {v >= 0.12 && (
                    <span className="num text-[11px] font-semibold" style={{ color: TINTA_NOTA[i] }}>
                      {Math.round(v * 100)} %
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-2">
          {ESCALA_NOTA.map((c, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px]" style={{ background: c }} />
              Nota {i + 1}
            </li>
          ))}
        </ul>
      </Panel>
      {tip?.pos && (
        <Tooltip {...tip.pos}>
          <div className="font-medium">
            {tip.v.dias > 0
              ? `${tip.v.dias}${tip.v.dias === 5 ? " o más" : ""} día${tip.v.dias > 1 ? "s" : ""} tarde`
              : tip.v.dias === 0
                ? "Justo el día comprometido"
                : `${-tip.v.dias}${tip.v.dias === -3 ? " o más" : ""} día${tip.v.dias < -1 ? "s" : ""} antes`}
          </div>
          <div className="num opacity-80">
            Nota {d1(tip.v.nota!)} · {n(tip.v.respuestas)} respuestas
          </div>
        </Tooltip>
      )}
    </div>
  );
}

/* ════════════════ 05 · ¿Dónde se traba la entrega? ════════════════ */

export function GraficoPuerta({ h }: { h: Historia }) {
  const datos = h.puerta.visitasPorMotivo;
  const max = Math.max(...datos.map((d) => d.valor));
  const maxInc = Math.max(h.puerta.incDomicilio, h.puerta.incRetiro);
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Panel>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[14px] font-semibold">Visitas extra a domicilio, según el motivo</h3>
          <Leyenda items={[{ color: "var(--series-1)", texto: "Nadie en casa o dirección mala" }, { color: "var(--axis)", texto: "Otros motivos" }]} />
        </div>
        <ul className="space-y-2.5">
          {datos.map((d, i) => (
            <li key={d.nombre} className="grid grid-cols-[minmax(110px,38%)_1fr] items-center gap-3">
              <span className={clsx("truncate text-[13px]", d.puerta ? "text-ink" : "text-ink-2")}>{d.nombre}</span>
              <span className="flex items-center gap-2">
                <motion.span
                  className="block h-[14px] rounded-r-[4px]"
                  style={{ background: d.puerta ? "var(--series-1)" : "var(--axis)" }}
                  variants={crece({ width: "0%" }, { width: `calc(${(d.valor / max) * 100}% - ${(d.valor / max) * 56}px)` }, i * 0.03, 0.6)}
                />
                <span className="num text-[12px] font-medium">{n(d.valor)}</span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel className="flex flex-col justify-between gap-8">
        <Cifra valor={n(h.puerta.visitasExtra)} etiqueta="visitas extra a domicilio en el año" nota={`sobre ${n(h.puerta.domicilio)} entregas a domicilio`} />
        <Cifra valor={pct((h.puerta.visitasPuerta / h.puerta.visitasExtra) * 100)} etiqueta="de esas visitas se explican por nadie en casa o una dirección mala" acento />
        <div>
          <div className="mb-3 text-[13px] text-ink-2">Envíos con alguna incidencia</div>
          {[
            { t: "A domicilio", v: h.puerta.incDomicilio },
            { t: "Retiro en sucursal", v: h.puerta.incRetiro },
          ].map((x) => (
            <div key={x.t} className="mb-2 grid grid-cols-[120px_1fr_auto] items-center gap-3 text-[13px]">
              <span className="text-ink-2">{x.t}</span>
              <span className="h-2 overflow-hidden rounded-full bg-wash">
                <motion.span className="block h-full rounded-full bg-ink" variants={crece({ width: "0%" }, { width: `${(x.v / maxInc) * 100}%` }, 0.3)} />
              </span>
              <span className="num font-medium">{pct(x.v)}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ════════════════ 06 · ¿Es un problema del mapa? ════════════════ */

export function CintaChile({ h }: { h: Historia }) {
  const r = h.mapa.regiones;
  const [sel, setSel] = useState(Math.max(0, r.findIndex((x) => x.region === "Metropolitana")));
  const max = Math.max(...r.map((x) => x.envios));
  const prom = h.aTiempo;
  // Divergente alrededor del promedio nacional: azul = sobre el promedio, rojo = bajo, gris = cerca.
  const color = (v: number) => {
    const dif = v - prom;
    // Umbrales de 3 y 6 puntos: diferencias menores son ruido para una región, y pintarlas exagera el contraste.
    if (Math.abs(dif) < 3) return "var(--div-0)";
    if (dif > 0) return dif >= 6 ? "var(--div-pos-2)" : "var(--div-pos-1)";
    return dif <= -6 ? "var(--div-neg-2)" : "var(--div-neg-1)";
  };
  const s = r[sel];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <Panel>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[14px] font-semibold">Chile de norte a sur · alto = envíos · color = % a tiempo</h3>
          <span className="text-[12px] text-muted">toca una región</span>
        </div>
        <div className="mb-6">
          <Leyenda
            items={[
              { color: "var(--div-neg-2)", texto: "6 pp o más bajo el promedio" },
              { color: "var(--div-neg-1)", texto: "3 a 6 pp bajo" },
              { color: "var(--div-0)", texto: `a menos de 3 pp del promedio (${pct(prom)})` },
              { color: "var(--div-pos-1)", texto: "3 a 6 pp sobre" },
              { color: "var(--div-pos-2)", texto: "6 pp o más sobre" },
            ]}
          />
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="flex h-[260px] min-w-[620px] items-end gap-1.5">
            {r.map((x, i) => (
              <button
                key={x.region}
                type="button"
                onClick={() => setSel(i)}
                onMouseEnter={() => setSel(i)}
                aria-pressed={sel === i}
                aria-label={`${x.region}: ${n(x.envios)} envíos, ${pct(x.aTiempo)} a tiempo`}
                className="group flex h-full flex-1 flex-col items-center justify-end gap-2 focus-visible:outline-2 focus-visible:outline-serie"
              >
                <motion.span
                  className={clsx("block w-full rounded-t-[4px] transition-[outline]", sel === i && "outline-2 outline-offset-2 outline-ink")}
                  style={{ background: color(x.aTiempo) }}
                  variants={crece({ height: 0 }, { height: `${Math.max(10, Math.sqrt(x.envios / max) * 200)}px` }, i * 0.03)}
                />
                <span className={clsx("w-full truncate text-center text-[10px]", sel === i ? "font-semibold text-ink" : "text-muted")}>{REGION_CORTA[x.region]}</span>
              </button>
            ))}
          </div>
          <div className="mt-1 flex min-w-[620px] justify-between text-[11px] text-muted">
            <span>← Norte</span>
            <span>Sur →</span>
          </div>
        </div>
        <p className="mt-2 text-[12px] text-muted">La altura usa raíz cuadrada para que las regiones chicas se vean; el número exacto aparece al tocar.</p>
      </Panel>
      <Panel>
        <AnimatePresence mode="wait">
          <motion.div key={s.region} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            <div className="text-[12px] text-muted">Región seleccionada</div>
            <div className="mt-1 text-[24px] font-semibold tracking-[-0.02em]">{s.region}</div>
            <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5">
              {[
                ["Envíos", n(s.envios)],
                ["A tiempo", pct(s.aTiempo)],
                ["Tránsito", `${d1(s.transito)} días`],
                ["Con problema", pct(s.problemas)],
                ["Ingresos", clpCorto(s.ingresos)],
                ["Nota", `${d1(s.nota)} / 5`],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[12px] text-ink-2">{k}</dt>
                  <dd className="num mt-0.5 text-[18px] font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            {s.envios < 150 && <p className="mt-5 text-[12px] text-muted">Muestra chica: con menos de 150 envíos, el porcentaje se mueve mucho con pocos casos.</p>}
          </motion.div>
        </AnimatePresence>
      </Panel>
    </div>
  );
}

/* ════════════════ 07 · ¿Qué estamos cobrando? ════════════════ */

export function GraficoPeso({ h }: { h: Historia }) {
  const { tip, on } = useTip<(typeof h.peso.bultos)[number]>();
  const b = h.peso.bultos;
  const max = Math.max(...b.map((x) => x.real + x.aire));
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Panel>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[14px] font-semibold">Kilos cobrados por tipo de bulto</h3>
          <Leyenda items={[{ color: "var(--series-1)", texto: "Peso real" }, { color: "var(--series-2)", texto: "Volumen cobrado sobre el peso real" }]} />
        </div>
        <ul className="space-y-5">
          {b.map((x, i) => {
            const total = x.real + x.aire;
            return (
              <li key={x.bulto} {...on(x)}>
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-[13px]">
                  <span className="font-medium">{x.bulto}</span>
                  <span className="num text-ink-2">
                    {n(Math.round(total))} kg · <span className="font-medium text-ink">{pct(total ? (x.aire / total) * 100 : 0)}</span> es volumen
                  </span>
                </div>
                <div className="flex h-[14px] gap-[2px]">
                  <motion.span className="block rounded-l-[4px] bg-serie" variants={crece({ width: "0%" }, { width: `${(x.real / max) * 100}%` }, i * 0.05)} />
                  {x.aire > 0.5 && (
                    <motion.span className="block rounded-r-[4px] bg-[var(--series-2)]" variants={crece({ width: "0%" }, { width: `${(x.aire / max) * 100}%` }, 0.2 + i * 0.05)} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
      <Panel className="flex flex-col justify-between gap-8">
        <Cifra valor={pct(h.peso.pctAire)} etiqueta="de los kilos cobrados son volumen, no peso" acento />
        <Cifra valor={pct(h.peso.porVolumen)} etiqueta="de los envíos se cobran por peso volumétrico" />
        <Cifra valor={`≈ ${clpCorto(h.peso.fleteAire)}`} etiqueta="de flete neto atribuible a ese volumen" nota={`≈ ${pct(h.peso.pctFleteAire)} del flete; estimación lineal por kilo`} />
      </Panel>
      {tip?.pos && (
        <Tooltip {...tip.pos}>
          <div className="font-medium">
            {tip.v.bulto} · {n(tip.v.envios)} envíos
          </div>
          <div className="num opacity-80">
            {n(Math.round(tip.v.real))} kg reales + {n(Math.round(tip.v.aire))} kg de volumen
          </div>
          <div className="num opacity-60">{pct(tip.v.porVolumen)} se cobra por volumen</div>
        </Tooltip>
      )}
    </div>
  );
}

/* ════════════════ 08 · ¿Y si cumpliéramos? (simulador) ════════════════ */

export function Simulador({ h }: { h: Historia }) {
  const [p, setP] = useState(90);
  const base = useMemo(() => simular(h, h.aTiempo), [h]);
  const sim = useMemo(() => simular(h, p), [h, p]);
  const respuestasAnio = h.entregados * h.nota_.tasaRespuesta;
  const menosMalas = ((base.malas - sim.malas) / 100) * respuestasAnio;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <Panel>
        <label htmlFor="sim" className="text-[14px] font-semibold">
          Entregas a tiempo
        </label>
        <div className="mt-4 flex items-baseline gap-3">
          <span className="num text-[clamp(3rem,7vw,5rem)] leading-none font-semibold tracking-[-0.05em]">{p} %</span>
          <span className="text-[13px] text-ink-2">hoy: {pct(h.aTiempo)}</span>
        </div>
        <input
          id="sim"
          type="range"
          min={60}
          max={98}
          step={1}
          value={p}
          onChange={(e) => setP(Number(e.target.value))}
          className="rango mt-8 w-full"
          style={{ ["--lleno" as string]: `${((p - 60) / 38) * 100}%` }}
          aria-valuetext={`${p} por ciento a tiempo`}
        />
        <div className="mt-2 flex justify-between text-[11px] text-muted">
          <span>60 %</span>
          <span>98 %</span>
        </div>
        <p className="mt-6 text-[13px] leading-relaxed text-ink-2">
          La simulación aplica a cada envío la distribución de notas que hoy tienen los envíos a tiempo y los atrasados. No supone nada más.
        </p>
      </Panel>
      <Panel>
        <div className="grid grid-cols-2 gap-6">
          <Cifra valor={`${d1(sim.nota)} / 5`} etiqueta="nota promedio esperada" nota={`hoy ${d1(base.nota)}`} acento />
          <Cifra valor={pct(sim.malas)} etiqueta="de notas 1 o 2" nota={`hoy ${pct(base.malas)}`} />
        </div>
        <div className="mt-8">
          <div className="mb-3 text-[13px] text-ink-2">Distribución de notas esperada · la raya es la de hoy</div>
          <div className="flex h-[150px] items-end gap-4">
            {sim.dist.map((v, i) => (
              <div key={i} className="relative flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="num text-[11px] text-ink-2">{Math.round(v * 100)} %</span>
                <div className="relative w-full max-w-[40px]">
                  <motion.div className="w-full rounded-t-[4px]" style={{ background: ESCALA_NOTA[i] }} animate={{ height: `${v * 200}px` }} transition={{ type: "spring", stiffness: 260, damping: 30 }} />
                  <span aria-hidden className="absolute inset-x-[-4px] h-[2px] rounded-full bg-ink" style={{ bottom: `${base.dist[i] * 200}px` }} />
                </div>
                <span className="text-[11px] text-muted">Nota {i + 1}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-6 text-[13px] text-ink-2">
          {menosMalas > 0 ? (
            <>
              Al año serían <strong className="num text-ink">≈ {n(Math.round(menosMalas))}</strong> notas 1–2 menos entre los clientes que contestan la encuesta.
            </>
          ) : (
            <>Con menos entregas a tiempo que hoy, aparecen más notas 1–2.</>
          )}
        </p>
      </Panel>
    </div>
  );
}

/* ════════════════ Navegación: barra de progreso e índice ════════════════ */

export function Indice({ capitulos }: { capitulos: { id: string; titulo: string }[] }) {
  const [activo, setActivo] = useState(-1);
  const [progreso, setProgreso] = useState(0);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setActivo(capitulos.findIndex((c) => c.id === e.target.id));
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const c of capitulos) {
      const el = document.getElementById(c.id);
      if (el) obs.observe(el);
    }
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      setProgreso(max > 0 ? scrollY / max : 0);
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      obs.disconnect();
      removeEventListener("scroll", onScroll);
    };
  }, [capitulos]);
  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 h-[3px]">
        <div className="h-full origin-left bg-serie" style={{ transform: `scaleX(${progreso})` }} />
      </div>
      <nav aria-label="Capítulos" className="fixed top-1/2 right-4 z-40 hidden -translate-y-1/2 2xl:block">
        <ol className="flex flex-col items-end gap-2.5">
          {capitulos.map((c, i) => (
            <li key={c.id}>
              <a href={`#${c.id}`} className="group flex items-center gap-3" aria-current={activo === i ? "step" : undefined}>
                <span className="rounded-full bg-surface px-2.5 py-1 text-[12px] whitespace-nowrap text-ink opacity-0 shadow-sm ring-1 ring-ring transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  {c.titulo}
                </span>
                <span className={clsx("block rounded-full transition-all", activo === i ? "h-5 w-1.5 bg-serie" : "size-1.5 bg-[var(--axis)] group-hover:bg-ink-2")} />
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

export function Bajar({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-medium text-page transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-serie active:scale-[0.98]"
    >
      Empezar la lectura <ChevronDown className="size-4" />
    </a>
  );
}
