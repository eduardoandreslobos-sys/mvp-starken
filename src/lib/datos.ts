import { createClient } from "@supabase/supabase-js";

// La llave publicable es pública por diseño: solo da acceso a lo que permiten los permisos de
// la base (catálogos y columnas de envíos sin datos personales; ver la migración
// supabase/migrations/20261118160000_lectura_publica_dashboard.sql).
const SUPABASE_URL = "https://aicvtatcmqthdaqygwpy.supabase.co";
const SUPABASE_LLAVE_PUBLICABLE = "sb_publishable_Dkv05EwGgu94bS6_H2MEZg_SUcPb71h";

const supabase = createClient(SUPABASE_URL, SUPABASE_LLAVE_PUBLICABLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type Estado =
  | "Recibido en Sucursal"
  | "En Tránsito"
  | "En Reparto"
  | "Disponible para Retiro"
  | "Entregado"
  | "Con Incidencia"
  | "Devuelto a Origen"
  | "Siniestrado";

export type Envio = {
  fecha: string; // YYYY-MM-DD, hora de Chile
  dia: number; // 0 = lunes … 6 = domingo
  hora: number;
  canal: string;
  tipoCliente: string;
  comuna: string;
  region: string;
  zona: string;
  tipoEntrega: string;
  servicio: string;
  contenido: string;
  bultos: number;
  pesoKg: number;
  total: number;
  estado: Estado;
  motivo: string | null;
  diasTransito: number | null;
  sla: "Sí" | "No" | "Pendiente";
  calificacion: number | null;
  // para la historia
  mes: string; // YYYY-MM
  comprometida: string;
  entrega: string | null;
  intentos: number;
  bulto: string;
  pesoRealKg: number;
  pesoVolKg: number;
  flete: number;
};

type FilaEnvio = {
  emitido_en: string;
  canal_venta: string;
  tipo_cliente: string;
  comuna_destino_id: number;
  tipo_entrega: string;
  tipo_servicio: string;
  contenido_declarado: string;
  num_bultos: number;
  peso_facturable_kg: number;
  total_con_iva: number;
  estado: Estado;
  motivo_incidencia: string | null;
  dias_transito: number | null;
  cumple_sla: "Sí" | "No" | "Pendiente";
  calificacion: number | null;
  fecha_comprometida: string;
  fecha_entrega: string | null;
  intentos_entrega: number;
  tipo_bulto: string;
  peso_real_kg: number;
  peso_volumetrico_kg: number;
  flete_neto: number;
};

const COLUMNAS =
  "emitido_en,canal_venta,tipo_cliente,comuna_destino_id,tipo_entrega,tipo_servicio,contenido_declarado," +
  "num_bultos,peso_facturable_kg,total_con_iva,estado,motivo_incidencia,dias_transito,cumple_sla,calificacion," +
  "fecha_comprometida,fecha_entrega,intentos_entrega,tipo_bulto,peso_real_kg,peso_volumetrico_kg,flete_neto";
const PAGINA = 1000; // máximo de filas por respuesta de la API de Supabase

const enChile = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Santiago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});
const DIAS: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

function fechaChile(iso: string) {
  const p = Object.fromEntries(enChile.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, dia: DIAS[p.weekday], hora: Number(p.hour) };
}

export async function cargarEnvios(): Promise<Envio[]> {
  const [comunas, regiones, conteo] = await Promise.all([
    supabase.from("comunas").select("id,nombre,region_id"),
    supabase.from("regiones").select("id,nombre,zona"),
    supabase.from("envios").select("id", { count: "exact", head: true }),
  ]);
  for (const r of [comunas, regiones, conteo]) if (r.error) throw r.error;

  const total = conteo.count ?? 0;
  const paginas = await Promise.all(
    Array.from({ length: Math.ceil(total / PAGINA) }, (_, i) =>
      supabase
        .from("envios")
        .select(COLUMNAS)
        .order("id")
        .range(i * PAGINA, (i + 1) * PAGINA - 1)
        .returns<FilaEnvio[]>(),
    ),
  );

  const region = new Map(regiones.data!.map((r) => [r.id, r]));
  const comuna = new Map(
    comunas.data!.map((c) => {
      const r = region.get(c.region_id)!;
      return [c.id, { nombre: c.nombre as string, region: r.nombre as string, zona: r.zona as string }];
    }),
  );

  const filas: Envio[] = [];
  for (const p of paginas) {
    if (p.error) throw p.error;
    for (const f of p.data ?? []) {
      const c = comuna.get(f.comuna_destino_id)!;
      const fc = fechaChile(f.emitido_en);
      filas.push({
        ...fc,
        mes: fc.fecha.slice(0, 7),
        comprometida: f.fecha_comprometida,
        entrega: f.fecha_entrega,
        intentos: f.intentos_entrega,
        bulto: f.tipo_bulto,
        pesoRealKg: Number(f.peso_real_kg),
        pesoVolKg: Number(f.peso_volumetrico_kg),
        flete: f.flete_neto,
        canal: f.canal_venta,
        tipoCliente: f.tipo_cliente,
        comuna: c.nombre,
        region: c.region,
        zona: c.zona,
        tipoEntrega: f.tipo_entrega,
        servicio: f.tipo_servicio,
        contenido: f.contenido_declarado,
        bultos: f.num_bultos,
        pesoKg: Number(f.peso_facturable_kg),
        total: f.total_con_iva,
        estado: f.estado,
        motivo: f.motivo_incidencia,
        diasTransito: f.dias_transito,
        sla: f.cumple_sla,
        calificacion: f.calificacion,
      });
    }
  }
  return filas;
}
