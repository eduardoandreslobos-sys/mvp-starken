import { useState, type ComponentType } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { motion } from "motion/react";
import clsx from "clsx";
import { Tooltip } from "./base";
import type { Barra, PuntoSemana } from "../lib/agregados";
import { DIAS_CORTOS, clp, clpCorto, fechaCorta, n, nCorto, pct } from "../lib/formato";

type Pos = { x: number; y: number } | null;

/* ───────── Serie semanal (una sola métrica a la vez: nunca doble eje) ───────── */

export function SerieSemanal({ datos, metrica }: { datos: PuntoSemana[]; metrica: "envios" | "ingresos" }) {
  const fmtEje = metrica === "envios" ? nCorto : (v: number) => clpCorto(v).replace(" mil", "k");
  const ultimo = datos.at(-1);
  return (
    <div className="h-[280px] w-full" role="img" aria-label={`${metrica === "envios" ? "Envíos" : "Ingresos"} por semana`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={datos} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`relleno-${metrica}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--grid)" strokeWidth={1} />
          <XAxis
            dataKey="semana"
            tickFormatter={fechaCorta}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--axis)" }}
            tickLine={false}
            minTickGap={28}
            tickMargin={8}
          />
          <YAxis
            tickFormatter={fmtEje}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={metrica === "envios" ? 36 : 52}
            tickCount={5}
          />
          <RTooltip
            cursor={{ stroke: "var(--axis)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as PuntoSemana;
              return (
                <div className="rounded-xl bg-ink px-3 py-2 text-[12px] leading-snug text-page shadow-lg">
                  <div className="font-medium">Semana del {fechaCorta(p.semana)}</div>
                  <div className="num mt-0.5 opacity-80">
                    {n(p.envios)} envíos · {clp(p.ingresos)}
                  </div>
                  {p.parcial && <div className="mt-0.5 opacity-60">Semana incompleta en el periodo</div>}
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey={metrica}
            stroke="var(--series-1)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill={`url(#relleno-${metrica})`}
            activeDot={{ r: 5, fill: "var(--series-1)", stroke: "var(--surface)", strokeWidth: 2 }}
            dot={false}
            isAnimationActive
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
      {ultimo && <span className="sr-only">Última semana: {n(ultimo.envios)} envíos.</span>}
    </div>
  );
}

/* ───────── Barras horizontales ordenadas (una serie, un color) ───────── */

export function BarrasRanking({
  datos,
  formato = n,
  total,
  max: maxFijo,
  detalle,
}: {
  datos: Barra[];
  formato?: (v: number) => string;
  total?: number; // para mostrar participación en el tooltip
  max?: number;
  detalle?: (b: Barra) => string;
}) {
  const [hover, setHover] = useState<{ i: number; pos: Pos }>({ i: -1, pos: null });
  const max = maxFijo ?? Math.max(1, ...datos.map((d) => d.valor));
  if (!datos.length) return <Vacio />;
  return (
    <ul className="space-y-2.5" onMouseLeave={() => setHover({ i: -1, pos: null })}>
      {datos.map((d, i) => {
        const ancho = (d.valor / max) * 100;
        const atenuado = hover.i !== -1 && hover.i !== i;
        return (
          <li
            key={d.nombre}
            className="grid grid-cols-[minmax(84px,34%)_1fr] items-center gap-3"
            onMouseMove={(e) => setHover({ i, pos: { x: e.clientX, y: e.clientY } })}
            tabIndex={0}
            onFocus={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setHover({ i, pos: { x: r.left + r.width / 2, y: r.top } });
            }}
            onBlur={() => setHover({ i: -1, pos: null })}
            aria-label={`${d.nombre}: ${formato(d.valor)}`}
          >
            <span className={clsx("truncate text-[13px] transition-opacity", atenuado ? "text-muted" : "text-ink-2")}>
              {d.nombre}
            </span>
            <span className="flex min-w-0 items-center gap-2 py-1">
              <motion.span
                className="block h-[14px] shrink-0 rounded-r-[4px] bg-serie transition-opacity"
                style={{ opacity: atenuado ? 0.35 : 1 }}
                initial={{ width: 0 }}
                animate={{ width: `calc(${ancho}% - ${(ancho / 100) * 72}px)` }}
                transition={{ duration: 0.6, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
              />
              <span className="num shrink-0 text-[12px] font-medium text-ink">{formato(d.valor)}</span>
            </span>
          </li>
        );
      })}
      {hover.pos && hover.i >= 0 && (
        <Tooltip {...hover.pos}>
          <div className="font-medium">{datos[hover.i].nombre}</div>
          <div className="num opacity-80">
            {formato(datos[hover.i].valor)}
            {total ? ` · ${pct((datos[hover.i].valor / total) * 100)} del total` : ""}
          </div>
          {detalle && <div className="num opacity-60">{detalle(datos[hover.i])}</div>}
        </Tooltip>
      )}
    </ul>
  );
}

/* ───────── Barra segmentada alta (un todo dividido en partes) ───────── */

export type Parte = { nombre: string; valor: number; color: string; tinta?: "blanca" | "negra"; icono?: ComponentType<{ className?: string }> };

export function BarraSegmentada({
  partes,
  formato = n,
  dosColumnas = false,
}: {
  partes: Parte[];
  formato?: (v: number) => string;
  dosColumnas?: boolean;
}) {
  const [hover, setHover] = useState<{ i: number; pos: Pos }>({ i: -1, pos: null });
  const total = partes.reduce((s, p) => s + p.valor, 0);
  if (!total) return <Vacio />;
  const visibles = partes.filter((p) => p.valor > 0);
  return (
    <div>
      <div
        className="flex h-7 w-full gap-[2px]"
        role="img"
        aria-label={visibles.map((p) => `${p.nombre} ${pct((p.valor / total) * 100)}`).join(", ")}
        onMouseLeave={() => setHover({ i: -1, pos: null })}
      >
        {visibles.map((p, i) => {
          const share = (p.valor / total) * 100;
          return (
            <motion.div
              key={p.nombre}
              className="flex h-full min-w-[3px] items-center overflow-hidden rounded-[4px] pl-2"
              style={{ background: p.color, opacity: hover.i !== -1 && hover.i !== i ? 0.45 : 1 }}
              initial={{ flexGrow: 0 }}
              animate={{ flexGrow: p.valor }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              onMouseMove={(e) => setHover({ i, pos: { x: e.clientX, y: e.clientY } })}
            >
              {share >= 9 && (
                <span
                  className={clsx(
                    "num text-[12px] font-semibold whitespace-nowrap",
                    p.tinta === "negra" ? "text-[#0b0b0b]" : "text-white",
                  )}
                >
                  {Math.round(share)} %
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
      <ul className={clsx("mt-4 grid grid-cols-1 gap-x-6 gap-y-2", dosColumnas && "sm:grid-cols-2")}>
        {visibles.map((p) => {
          const Icono = p.icono;
          return (
            <li key={p.nombre} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="flex min-w-0 items-center gap-2 text-ink-2">
                {Icono ? (
                  <span className="grid size-4 shrink-0 place-items-center rounded-full" style={{ background: p.color }}>
                    <Icono className={clsx("size-2.5", p.tinta === "negra" ? "text-[#0b0b0b]" : "text-white")} />
                  </span>
                ) : (
                  <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: p.color }} />
                )}
                <span className="truncate">{p.nombre}</span>
              </span>
              <span className="num shrink-0 text-ink">
                {formato(p.valor)} <span className="text-muted">· {pct((p.valor / total) * 100)}</span>
              </span>
            </li>
          );
        })}
      </ul>
      {hover.pos && hover.i >= 0 && (
        <Tooltip {...hover.pos}>
          <div className="font-medium">{visibles[hover.i].nombre}</div>
          <div className="num opacity-80">
            {formato(visibles[hover.i].valor)} · {pct((visibles[hover.i].valor / total) * 100)}
          </div>
        </Tooltip>
      )}
    </div>
  );
}

/* ───────── Mapa de calor: día × hora (rampa secuencial azul) ───────── */

const RAMPA = ["var(--seq-100)", "var(--seq-200)", "var(--seq-300)", "var(--seq-400)", "var(--seq-500)", "var(--seq-600)", "var(--seq-700)"];

export function MapaCalor({ horas, celdas, max }: { horas: number[]; celdas: Map<string, number>; max: number }) {
  const [hover, setHover] = useState<{ k: string; pos: Pos }>({ k: "", pos: null });
  if (!horas.length) return <Vacio />;
  const dias = [0, 1, 2, 3, 4, 5, 6].filter((d) => horas.some((h) => celdas.has(`${d}-${h}`)));
  const paso = (v: number) => RAMPA[Math.min(RAMPA.length - 1, Math.floor((v / max) * RAMPA.length))];
  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div
          className="grid min-w-[520px] gap-[2px]"
          style={{ gridTemplateColumns: `36px repeat(${horas.length}, minmax(0, 1fr))` }}
          onMouseLeave={() => setHover({ k: "", pos: null })}
        >
          <span />
          {horas.map((h) => (
            <span key={h} className="num pb-1 text-center text-[11px] text-muted">
              {h}h
            </span>
          ))}
          {dias.map((d) => (
            <div key={d} className="contents">
              <span className="self-center text-[12px] text-ink-2">{DIAS_CORTOS[d]}</span>
              {horas.map((h) => {
                const k = `${d}-${h}`;
                const v = celdas.get(k) ?? 0;
                return (
                  <span
                    key={k}
                    className={clsx(
                      "aspect-[1.6] rounded-[4px] transition-[outline] outline-offset-1",
                      hover.k === k && "outline-2 outline-ink",
                    )}
                    style={{ background: v ? paso(v) : "var(--wash)" }}
                    onMouseMove={(e) => setHover({ k, pos: { x: e.clientX, y: e.clientY } })}
                    aria-label={`${DIAS_CORTOS[d]} ${h}:00, ${n(v)} envíos`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-muted">
        <span>Menos</span>
        <span className="flex gap-[2px]">
          {RAMPA.map((c) => (
            <span key={c} className="h-2.5 w-5 rounded-[3px]" style={{ background: c }} />
          ))}
        </span>
        <span>Más envíos</span>
      </div>
      {hover.pos && hover.k && (
        <Tooltip {...hover.pos}>
          <div className="font-medium">
            {DIAS_CORTOS[Number(hover.k.split("-")[0])]} · {hover.k.split("-")[1]}:00–{hover.k.split("-")[1]}:59
          </div>
          <div className="num opacity-80">{n(celdas.get(hover.k) ?? 0)} envíos emitidos</div>
        </Tooltip>
      )}
    </div>
  );
}

export function Vacio() {
  return <p className="py-10 text-center text-[13px] text-muted">Sin envíos con estos filtros.</p>;
}
