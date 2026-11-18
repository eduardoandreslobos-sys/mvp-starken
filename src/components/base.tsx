import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

/* ───────── Tarjeta con vista de gráfico o tabla ───────── */

export type Tabla = { columnas: string[]; filas: (string | number)[][]; alinear?: ("izq" | "der")[] };

export function Tarjeta({
  titulo,
  subtitulo,
  tabla,
  acciones,
  children,
  className,
  indice = 0,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  tabla?: Tabla;
  acciones?: ReactNode;
  children: ReactNode;
  className?: string;
  indice?: number;
}) {
  const [verTabla, setVerTabla] = useState(false);
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: Math.min(indice, 6) * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className={clsx(
        "relative flex min-w-0 flex-col rounded-3xl bg-surface p-5 ring-1 ring-ring sm:p-6",
        className,
      )}
      aria-label={titulo}
    >
      <header className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{titulo}</h2>
          {subtitulo && <p className="mt-1 text-[13px] leading-snug text-ink-2">{subtitulo}</p>}
        </div>
        <div className="flex items-center gap-2">
          {acciones}
          {tabla && (
            <Segmentado
              etiqueta={`Vista de ${titulo}`}
              valor={verTabla ? "tabla" : "grafico"}
              opciones={[
                { valor: "grafico", texto: "Gráfico" },
                { valor: "tabla", texto: "Tabla" },
              ]}
              onCambio={(v) => setVerTabla(v === "tabla")}
              chico
            />
          )}
        </div>
      </header>
      <div className="min-w-0 flex-1">{verTabla && tabla ? <TablaDatos {...tabla} /> : children}</div>
    </motion.section>
  );
}

export function TablaDatos({ columnas, filas, alinear }: Tabla) {
  return (
    <div className="max-h-[360px] overflow-auto rounded-xl ring-1 ring-ring">
      <table className="w-full border-collapse text-[13px]">
        <thead className="sticky top-0 bg-surface-2">
          <tr>
            {columnas.map((c, i) => (
              <th
                key={c}
                scope="col"
                className={clsx(
                  "px-3 py-2 font-medium text-ink-2",
                  (alinear?.[i] ?? (i === 0 ? "izq" : "der")) === "der" ? "text-right" : "text-left",
                )}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, r) => (
            <tr key={r} className="border-t border-grid">
              {f.map((v, i) => (
                <td
                  key={i}
                  className={clsx(
                    "px-3 py-1.5 text-ink",
                    (alinear?.[i] ?? (i === 0 ? "izq" : "der")) === "der" ? "num text-right" : "text-left",
                  )}
                >
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ───────── Control segmentado ───────── */

export function Segmentado<T extends string>({
  etiqueta,
  valor,
  opciones,
  onCambio,
  chico,
}: {
  etiqueta: string;
  valor: T;
  opciones: { valor: T; texto: string }[];
  onCambio: (v: T) => void;
  chico?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="inline-flex rounded-full bg-wash p-1 ring-1 ring-ring">
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onCambio(o.valor)}
            className={clsx(
              "relative rounded-full font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-serie",
              chico ? "px-2.5 py-1 text-[12px]" : "px-3.5 py-1.5 text-[13px]",
              activo ? "text-ink" : "text-ink-2 hover:text-ink",
            )}
          >
            {activo && (
              <motion.span
                layoutId={`seg-${etiqueta}`}
                className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.08)] ring-1 ring-ring"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{o.texto}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ───────── Selector de dimensión ───────── */

export function Selector({
  etiqueta,
  valor,
  opciones,
  onCambio,
}: {
  etiqueta: string;
  valor: string;
  opciones: string[];
  onCambio: (v: string) => void;
}) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{etiqueta}</span>
      <select
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        className={clsx(
          "h-9 appearance-none rounded-full bg-surface py-0 pr-8 pl-3.5 text-[13px] font-medium ring-1 ring-ring transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-serie",
          valor ? "text-ink" : "text-ink-2",
        )}
      >
        <option value="">{etiqueta}: todos</option>
        {opciones.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <svg aria-hidden className="pointer-events-none absolute right-3 size-3 text-muted" viewBox="0 0 12 12">
        <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </label>
  );
}

/* ───────── Variación contra el periodo anterior ───────── */

export function Delta({
  actual,
  anterior,
  subirEsBueno = true,
  puntos = false,
}: {
  actual: number | null;
  anterior: number | null;
  subirEsBueno?: boolean;
  puntos?: boolean; // diferencia en puntos porcentuales en vez de %
}) {
  if (actual == null || anterior == null || (!puntos && anterior === 0)) return null;
  const dif = puntos ? actual - anterior : ((actual - anterior) / anterior) * 100;
  const plano = Math.abs(dif) < 0.05;
  const bueno = dif > 0 === subirEsBueno;
  const Icono = plano ? Minus : dif > 0 ? ArrowUpRight : ArrowDownRight;
  const texto = `${dif > 0 ? "+" : dif < 0 ? "−" : ""}${Math.abs(dif).toLocaleString("es-CL", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}${puntos ? " pp" : " %"}`;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-0.5 text-[12px] font-medium",
        plano ? "text-muted" : bueno ? "text-up" : "text-down",
      )}
      title="Contra el periodo anterior del mismo largo"
    >
      <Icono aria-hidden className="size-3.5" strokeWidth={2.25} />
      {texto}
      <span className="sr-only">{bueno ? " (mejora)" : " (empeora)"} contra el periodo anterior</span>
    </span>
  );
}

/* ───────── Tooltip flotante ───────── */

export function Tooltip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 max-w-60 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-xl bg-ink px-3 py-2 text-[12px] leading-snug text-page shadow-lg"
      style={{ left: x, top: y }}
    >
      {children}
    </div>
  );
}
