import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { animate, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, Check, Clock, Moon, RotateCcw, ShieldCheck, Sun, Undo2, XOctagon } from "lucide-react";
import clsx from "clsx";
import { cargarEnvios, type Envio } from "./lib/datos";
import {
  FILTROS_INICIALES,
  contar,
  filtrar,
  kpis,
  mapaHorario,
  porSemana,
  rango,
  rangoAnterior,
  slaPor,
  type Filtros,
  type Periodo,
} from "./lib/agregados";
import { Delta, Segmentado, Selector, Tarjeta } from "./components/base";
import { BarraSegmentada, BarrasRanking, MapaCalor, SerieSemanal, type Parte } from "./components/graficos";
import { clp, clpCorto, d1, fechaLarga, fechaCorta, n, pct } from "./lib/formato";

export default function App() {
  const consulta = useQuery({ queryKey: ["envios"], queryFn: cargarEnvios, staleTime: 5 * 60_000 });

  return (
    <div className="mx-auto max-w-[1360px] px-4 pt-6 pb-16 sm:px-6 lg:px-10 lg:pt-10">
      <Cabecera />
      {consulta.isPending && <Cargando />}
      {consulta.isError && <ErrorCarga onReintentar={() => consulta.refetch()} />}
      {consulta.data && <Panel envios={consulta.data} />}
    </div>
  );
}

/* ───────── Cabecera ───────── */

function Cabecera() {
  return (
    <header className="mb-8 flex items-center justify-between gap-4 lg:mb-12">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-ink">
          <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
            <rect x="3" y="11" width="3" height="6" rx="1" fill="var(--seq-200)" />
            <rect x="8.5" y="7" width="3" height="10" rx="1" fill="var(--seq-400)" />
            <rect x="14" y="3" width="3" height="14" rx="1" fill="var(--page)" />
          </svg>
        </span>
        <div className="leading-tight">
          <div className="text-[14px] font-semibold tracking-[-0.01em]">MVP Starken</div>
          <div className="text-[12px] text-ink-2">Panel público de envíos</div>
        </div>
      </div>
      <TemaToggle />
    </header>
  );
}

function TemaToggle() {
  const [tema, setTema] = useState<"light" | "dark">(() => {
    const fijado = document.documentElement.dataset.theme;
    if (fijado === "light" || fijado === "dark") return fijado;
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const cambiar = () => {
    const nuevo = tema === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nuevo;
    try {
      localStorage.setItem("tema", nuevo);
    } catch {
      /* sin almacenamiento: el tema dura hasta recargar */
    }
    setTema(nuevo);
  };
  return (
    <button
      type="button"
      onClick={cambiar}
      className="grid size-9 place-items-center rounded-full bg-surface text-ink-2 ring-1 ring-ring transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-serie"
      aria-label={tema === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      {tema === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

/* ───────── Panel ───────── */

const PERIODOS: { valor: Periodo; texto: string }[] = [
  { valor: "todo", texto: "Todo 2026" },
  { valor: "90", texto: "90 días" },
  { valor: "30", texto: "30 días" },
  { valor: "mes", texto: "Este mes" },
];

const unicos = (envios: Envio[], k: keyof Envio) => [...new Set(envios.map((e) => String(e[k])))].sort((a, b) => a.localeCompare(b, "es"));

function Panel({ envios }: { envios: Envio[] }) {
  const [f, setF] = useState<Filtros>(FILTROS_INICIALES);
  const [metrica, setMetrica] = useState<"envios" | "ingresos">("envios");
  const set = <K extends keyof Filtros>(k: K, v: Filtros[K]) => setF((x) => ({ ...x, [k]: v }));

  const { primero, ultimo, opciones } = useMemo(() => {
    let primero = envios[0].fecha, ultimo = envios[0].fecha;
    for (const e of envios) {
      if (e.fecha < primero) primero = e.fecha;
      if (e.fecha > ultimo) ultimo = e.fecha;
    }
    return {
      primero,
      ultimo,
      opciones: {
        servicio: ["Normal", "Express", "Mismo Día"],
        zona: ["Norte", "Centro", "Sur", "Austral"],
        tipoCliente: ["Persona", "PYME", "Empresa", "E-commerce"],
        canal: unicos(envios, "canal"),
      },
    };
  }, [envios]);

  const r = rango(f.periodo, ultimo, primero);
  const actual = useMemo(() => filtrar(envios, f, r), [envios, f, r[0], r[1]]);
  const anterior = useMemo(
    () => (f.periodo === "todo" ? null : filtrar(envios, f, rangoAnterior(r))),
    [envios, f, r[0], r[1]],
  );
  const k = useMemo(() => kpis(actual), [actual]);
  const ka = useMemo(() => (anterior ? kpis(anterior) : null), [anterior]);

  const semanas = useMemo(() => porSemana(actual, r), [actual, r[0], r[1]]);
  // En el gráfico solo van semanas completas: una semana a medias parece una caída que no existe.
  const semanasCompletas = useMemo(() => {
    const completas = semanas.filter((s) => !s.parcial);
    return completas.length >= 2 ? completas : semanas;
  }, [semanas]);
  const estados = useMemo(() => contar(actual, (e) => e.estado), [actual]);
  const clientes = useMemo(() => contar(actual, (e) => e.tipoCliente), [actual]);
  const zonas = useMemo(() => contar(actual, (e) => e.zona, (e) => e.total), [actual]);
  const comunas = useMemo(() => contar(actual, (e) => e.comuna).slice(0, 10), [actual]);
  const canales = useMemo(() => contar(actual, (e) => e.canal), [actual]);
  const motivos = useMemo(() => contar(actual, (e) => e.motivo), [actual]);
  const slaServicio = useMemo(() => slaPor(actual, (e) => e.servicio), [actual]);
  const slaZona = useMemo(() => slaPor(actual, (e) => e.zona), [actual]);
  const contenido = useMemo(() => contar(actual, (e) => e.contenido, (e) => e.total), [actual]);
  const mapa = useMemo(() => mapaHorario(actual), [actual]);

  const hayFiltros = f.servicio || f.zona || f.tipoCliente || f.canal || f.periodo !== "todo";
  const textoRango = `${fechaCorta(r[0])} – ${fechaCorta(r[1])} ${r[1].slice(0, 4)}`;

  return (
    <main>
      {/* Hero */}
      <section className="mb-8 grid gap-8 lg:mb-10 lg:grid-cols-[1.25fr_1fr] lg:items-end">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-[12px] font-medium text-ink-2 ring-1 ring-ring">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--good)] opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-[var(--good)]" />
            </span>
            Datos al {fechaLarga(ultimo)}
          </p>
          <h1 className="max-w-[16ch] text-[clamp(2.25rem,5.5vw,4.25rem)] leading-[0.98] font-semibold tracking-[-0.045em] text-balance">
            Cada envío de 2026, en un solo vistazo.
          </h1>
        </div>
        <div className="rounded-3xl bg-ink p-6 text-page sm:p-7">
          <div className="flex items-center justify-between text-[13px] opacity-70">
            <span>Ingresos con IVA</span>
            <span className="num">{textoRango}</span>
          </div>
          <div className="mt-3 text-[clamp(2.75rem,6vw,4.5rem)] leading-none font-semibold tracking-[-0.04em]">
            <Numero valor={k.ingresos} formato={clpCorto} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
            <span className="num opacity-70">{clp(k.ingresos)}</span>
            {ka && (
              <span className="rounded-full bg-page/10 px-2 py-0.5 [&_*]:!text-page">
                <Delta actual={k.ingresos} anterior={ka.ingresos} />
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Filtros: una sola fila sobre los gráficos */}
      <div className="z-30 -mx-4 mb-6 sm:sticky sm:top-0 bg-page/80 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center gap-2">
          <Segmentado etiqueta="Periodo" valor={f.periodo} opciones={PERIODOS} onCambio={(v) => set("periodo", v)} />
          <span className="mx-1 hidden h-5 w-px bg-grid sm:block" />
          <Selector etiqueta="Servicio" valor={f.servicio} opciones={opciones.servicio} onCambio={(v) => set("servicio", v)} />
          <Selector etiqueta="Zona destino" valor={f.zona} opciones={opciones.zona} onCambio={(v) => set("zona", v)} />
          <Selector etiqueta="Cliente" valor={f.tipoCliente} opciones={opciones.tipoCliente} onCambio={(v) => set("tipoCliente", v)} />
          <Selector etiqueta="Canal" valor={f.canal} opciones={opciones.canal} onCambio={(v) => set("canal", v)} />
          {hayFiltros && (
            <button
              type="button"
              onClick={() => setF(FILTROS_INICIALES)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-ink-2 hover:bg-wash hover:text-ink focus-visible:outline-2 focus-visible:outline-serie"
            >
              <RotateCcw className="size-3.5" /> Limpiar
            </button>
          )}
          <span className="num ml-auto text-[12px] text-muted" aria-live="polite">
            {n(k.envios)} envíos{f.periodo !== "todo" && " · comparado con el periodo anterior"}
          </span>
        </div>
      </div>

      {/* Indicadores */}
      <section className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6" aria-label="Indicadores">
        <Indicador i={0} etiqueta="Envíos" valor={n(k.envios)} delta={<Delta actual={k.envios} anterior={ka?.envios ?? null} />} />
        <Indicador i={1} etiqueta="Ticket promedio" valor={clp(k.ticket)} delta={<Delta actual={k.ticket} anterior={ka?.ticket ?? null} />} />
        <Indicador
          i={2}
          etiqueta="Entregados a tiempo"
          valor={k.sla == null ? "—" : pct(k.sla)}
          delta={<Delta actual={k.sla} anterior={ka?.sla ?? null} puntos />}
        />
        <Indicador
          i={3}
          etiqueta="Con problema"
          ayuda="Incidencia, devuelto o siniestrado"
          valor={k.problemas == null ? "—" : pct(k.problemas)}
          delta={<Delta actual={k.problemas} anterior={ka?.problemas ?? null} subirEsBueno={false} puntos />}
        />
        <Indicador
          i={4}
          etiqueta="Tránsito promedio"
          ayuda="Días hábiles, solo entregados"
          valor={k.transito == null ? "—" : `${d1(k.transito)} días`}
          delta={<Delta actual={k.transito} anterior={ka?.transito ?? null} subirEsBueno={false} />}
        />
        <Indicador
          i={5}
          etiqueta="Calificación"
          ayuda={`${n(k.respuestas)} respuestas`}
          valor={k.calificacion == null ? "—" : `${d1(k.calificacion)} / 5`}
          delta={<Delta actual={k.calificacion} anterior={ka?.calificacion ?? null} />}
        />
      </section>

      {/* Bento */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Tarjeta
          indice={0}
          className="lg:col-span-8"
          titulo={metrica === "envios" ? "Envíos por semana" : "Ingresos por semana"}
          subtitulo={`${metrica === "envios" ? "Envíos emitidos" : "Total con IVA facturado"} cada semana, de lunes a domingo${semanasCompletas.length < semanas.length ? ". Solo semanas completas; la tabla incluye todas" : ""}`}
          acciones={
            <Segmentado
              etiqueta="Métrica semanal"
              valor={metrica}
              opciones={[
                { valor: "envios", texto: "Envíos" },
                { valor: "ingresos", texto: "Ingresos" },
              ]}
              onCambio={setMetrica}
              chico
            />
          }
          tabla={{
            columnas: ["Semana del", "Envíos", "Ingresos"],
            filas: semanas.map((s) => [`${fechaCorta(s.semana)}${s.parcial ? " (incompleta)" : ""}`, n(s.envios), clp(s.ingresos)]),
          }}
        >
          <SerieSemanal datos={semanasCompletas} metrica={metrica} />
        </Tarjeta>

        <Tarjeta
          indice={1}
          className="lg:col-span-4"
          titulo="Estado de los envíos"
          subtitulo="Dónde está hoy cada envío del periodo"
          tabla={{ columnas: ["Estado", "Envíos", "%"], filas: estados.map((e) => [e.nombre, n(e.valor), pct((e.valor / k.envios) * 100)]) }}
        >
          <BarraSegmentada partes={partesEstado(estados)} />
        </Tarjeta>

        <Tarjeta
          indice={2}
          className="lg:col-span-4"
          titulo="Entregados a tiempo por servicio"
          subtitulo="% de entregados dentro de la fecha comprometida"
          tabla={{ columnas: ["Servicio", "A tiempo", "Entregados"], filas: slaServicio.map((s) => [s.nombre, pct(s.valor), n(s.extra ?? 0)]) }}
        >
          <BarrasRanking datos={slaServicio} formato={pct} max={100} detalle={(b) => `${n(b.extra ?? 0)} entregados medidos`} />
          <div className="mt-6 border-t border-grid pt-5">
            <h3 className="mb-3 text-[13px] font-medium text-ink-2">Por zona de destino</h3>
            <BarrasRanking datos={slaZona} formato={pct} max={100} detalle={(b) => `${n(b.extra ?? 0)} entregados medidos`} />
          </div>
        </Tarjeta>

        <Tarjeta
          indice={3}
          className="lg:col-span-4"
          titulo="Ingresos por zona de destino"
          subtitulo="Total con IVA según hacia dónde viaja el envío"
          tabla={{ columnas: ["Zona", "Ingresos", "%"], filas: zonas.map((z) => [z.nombre, clp(z.valor), pct((z.valor / k.ingresos) * 100)]) }}
        >
          <BarrasRanking datos={zonas} formato={clpCorto} total={k.ingresos} />
          <div className="mt-6 border-t border-grid pt-5">
            <h3 className="mb-3 text-[13px] font-medium text-ink-2">Envíos por tipo de cliente</h3>
            <BarraSegmentada partes={partesCliente(clientes)} />
          </div>
        </Tarjeta>

        <Tarjeta
          indice={4}
          className="lg:col-span-4"
          titulo="Comunas con más envíos"
          subtitulo="Las 10 comunas de destino con más envíos"
          tabla={{ columnas: ["Comuna", "Envíos"], filas: comunas.map((c) => [c.nombre, n(c.valor)]) }}
        >
          <BarrasRanking datos={comunas} total={k.envios} />
        </Tarjeta>

        <Tarjeta
          indice={5}
          className="lg:col-span-7"
          titulo="Cuándo se emiten los envíos"
          subtitulo="Envíos por día de la semana y hora de emisión (hora de Chile)"
          tabla={{
            columnas: ["Día", ...mapa.horas.map((h) => `${h}h`)],
            filas: [0, 1, 2, 3, 4, 5, 6]
              .filter((d) => mapa.horas.some((h) => mapa.celdas.has(`${d}-${h}`)))
              .map((d) => [["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][d], ...mapa.horas.map((h) => n(mapa.celdas.get(`${d}-${h}`) ?? 0))]),
          }}
        >
          <MapaCalor {...mapa} />
        </Tarjeta>

        <Tarjeta
          indice={6}
          className="lg:col-span-5"
          titulo="Canal de venta"
          subtitulo="Por dónde entran los envíos"
          tabla={{ columnas: ["Canal", "Envíos", "%"], filas: canales.map((c) => [c.nombre, n(c.valor), pct((c.valor / k.envios) * 100)]) }}
        >
          <BarrasRanking datos={canales} total={k.envios} />
        </Tarjeta>

        <Tarjeta
          indice={7}
          className="lg:col-span-6"
          titulo="Motivos de incidencia"
          subtitulo="Envíos que tuvieron algún problema registrado, aunque después se hayan entregado"
          tabla={{ columnas: ["Motivo", "Envíos"], filas: motivos.map((m) => [m.nombre, n(m.valor)]) }}
        >
          <BarrasRanking datos={motivos} total={motivos.reduce((s, m) => s + m.valor, 0)} />
        </Tarjeta>

        <Tarjeta
          indice={8}
          className="lg:col-span-6"
          titulo="Ingresos por contenido declarado"
          subtitulo="Qué se envía, medido en total con IVA"
          tabla={{ columnas: ["Contenido", "Ingresos"], filas: contenido.map((c) => [c.nombre, clp(c.valor)]) }}
        >
          <BarrasRanking datos={contenido} formato={clpCorto} total={k.ingresos} />
        </Tarjeta>
      </div>

      <footer className="mt-12 flex flex-col gap-3 border-t border-grid pt-6 text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2">
          <ShieldCheck className="size-4" aria-hidden />
          Sin datos personales: este panel no muestra RUT, nombres, teléfonos, correos, direcciones ni códigos de seguimiento.
        </p>
        <p>Fuente: base de envíos del MVP · {n(envios.length)} registros · {hayFiltros ? textoRango : "todo el año"}</p>
      </footer>
    </main>
  );
}

/* ───────── Piezas ───────── */

function Indicador({ etiqueta, valor, delta, ayuda, i }: { etiqueta: string; valor: string; delta?: React.ReactNode; ayuda?: string; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-w-0 flex-col justify-between gap-3 rounded-2xl bg-surface p-4 ring-1 ring-ring sm:p-5"
    >
      <div className="text-[12px] leading-tight text-ink-2">
        {etiqueta}
        {ayuda && <div className="mt-0.5 text-muted">{ayuda}</div>}
      </div>
      <div>
        <div className="truncate text-[clamp(1.25rem,2vw,1.6rem)] leading-none font-semibold tracking-[-0.03em]">{valor}</div>
        <div className="mt-2 h-4">{delta}</div>
      </div>
    </motion.div>
  );
}

function Numero({ valor, formato }: { valor: number; formato: (v: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previo = useRef(0);
  const reducir = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducir) {
      el.textContent = formato(valor);
      previo.current = valor;
      return;
    }
    const control = animate(previo.current, valor, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => (el.textContent = formato(v)),
    });
    previo.current = valor;
    return () => control.stop();
  }, [valor, formato, reducir]);
  return <span ref={ref}>{formato(valor)}</span>;
}

const ORDEN_ESTADO = [
  "Entregado",
  "En curso",
  "Con Incidencia",
  "Devuelto a Origen",
  "Siniestrado",
] as const;

function partesEstado(estados: { nombre: string; valor: number }[]): Parte[] {
  const v = (nombres: string[]) => estados.filter((e) => nombres.includes(e.nombre)).reduce((s, e) => s + e.valor, 0);
  const partes: Record<(typeof ORDEN_ESTADO)[number], Parte> = {
    Entregado: { nombre: "Entregado", valor: v(["Entregado"]), color: "var(--good)", icono: Check },
    "En curso": {
      nombre: "En curso",
      valor: v(["Recibido en Sucursal", "En Tránsito", "En Reparto", "Disponible para Retiro"]),
      color: "var(--muted)",
      icono: Clock,
    },
    "Con Incidencia": { nombre: "Con incidencia", valor: v(["Con Incidencia"]), color: "var(--warning)", tinta: "negra", icono: AlertTriangle },
    "Devuelto a Origen": { nombre: "Devuelto a origen", valor: v(["Devuelto a Origen"]), color: "var(--serious)", icono: Undo2 },
    Siniestrado: { nombre: "Siniestrado", valor: v(["Siniestrado"]), color: "var(--critical)", icono: XOctagon },
  };
  return ORDEN_ESTADO.map((k) => partes[k]);
}

// El color sigue a la entidad, nunca a su posición: un filtro no repinta a nadie.
const COLOR_CLIENTE: Record<string, { color: string; tinta?: "negra" }> = {
  Persona: { color: "var(--series-1)" },
  PYME: { color: "var(--series-2)" },
  Empresa: { color: "var(--series-3)" },
  "E-commerce": { color: "var(--series-4)", tinta: "negra" },
};
function partesCliente(clientes: { nombre: string; valor: number }[]): Parte[] {
  return Object.keys(COLOR_CLIENTE).map((nombre) => ({
    nombre,
    valor: clientes.find((c) => c.nombre === nombre)?.valor ?? 0,
    ...COLOR_CLIENTE[nombre],
  }));
}

function Cargando() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando los envíos…</span>
      <div className="mb-10 grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-3">
          <div className="h-6 w-40 animate-pulse rounded-full bg-wash" />
          <div className="h-16 w-full max-w-xl animate-pulse rounded-2xl bg-wash" />
          <div className="h-16 w-2/3 animate-pulse rounded-2xl bg-wash" />
        </div>
        <div className="h-44 animate-pulse rounded-3xl bg-wash" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-wash" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <div className="h-80 animate-pulse rounded-3xl bg-wash lg:col-span-8" />
        <div className="h-80 animate-pulse rounded-3xl bg-wash lg:col-span-4" />
      </div>
    </div>
  );
}

function ErrorCarga({ onReintentar }: { onReintentar: () => void }) {
  return (
    <div role="alert" className="rounded-3xl bg-surface p-8 ring-1 ring-ring">
      <h2 className="text-[17px] font-semibold">No pudimos cargar los envíos</h2>
      <p className="mt-2 text-[14px] text-ink-2">Revisa tu conexión e inténtalo de nuevo. Si sigue fallando, la base de datos puede estar en pausa.</p>
      <button
        type="button"
        onClick={onReintentar}
        className={clsx("mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[14px] font-medium text-page")}
      >
        <RotateCcw className="size-4" /> Reintentar
      </button>
    </div>
  );
}
