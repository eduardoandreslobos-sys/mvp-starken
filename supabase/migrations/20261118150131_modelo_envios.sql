-- Modelo de datos de envíos (ver docs/modelo-datos.md).
-- Todas las tablas quedan con RLS activado y sin políticas: la API pública no las lee todavía.

-- ───────────── Tipos ─────────────
create type public.zona as enum ('Norte', 'Centro', 'Sur', 'Austral');
create type public.canal_venta as enum ('Sucursal', 'Web', 'App', 'Cuenta Corporativa', 'Integración API');
create type public.tipo_cliente as enum ('Persona', 'PYME', 'Empresa', 'E-commerce');
create type public.tipo_entrega as enum ('Domicilio', 'Retiro en Sucursal');
create type public.tipo_servicio as enum ('Normal', 'Express', 'Mismo Día');
create type public.tipo_bulto as enum ('Sobre', 'Bolsa', 'Caja', 'Pallet');
create type public.contenido_declarado as enum (
  'Documentos', 'Electrónica', 'Juguetes', 'Alimentos no perecibles', 'Insumos médicos',
  'Repuestos automotrices', 'Libros', 'Vestuario y calzado', 'Cosmética',
  'Artículos deportivos', 'Artículos de hogar', 'Herramientas'
);
create type public.condicion_pago as enum ('Pagado en Origen', 'Por Pagar', 'Cuenta Corriente');
create type public.medio_pago as enum (
  'Efectivo', 'Tarjeta Débito', 'Tarjeta Crédito', 'Webpay', 'Transferencia', 'Facturación mensual'
);
create type public.estado_envio as enum (
  'Recibido en Sucursal', 'En Tránsito', 'En Reparto', 'Disponible para Retiro',
  'Entregado', 'Con Incidencia', 'Devuelto a Origen', 'Siniestrado'
);
create type public.motivo_incidencia as enum (
  'Destinatario ausente', 'Dirección incompleta', 'Dirección inexistente', 'Domicilio cerrado',
  'Rechazado por destinatario', 'Plazo de retiro vencido', 'Error de clasificación',
  'Retraso por clima', 'Bulto dañado', 'Daño total', 'Extravío'
);
create type public.cumple_sla as enum ('Sí', 'No', 'Pendiente');

-- ───────────── Catálogos ─────────────
create table public.regiones (
  id     smallint generated always as identity primary key,
  nombre text not null unique,
  zona   public.zona not null
);

create table public.comunas (
  id        smallint generated always as identity primary key,
  nombre    text not null,
  region_id smallint not null references public.regiones (id),
  unique (region_id, nombre)
);
create index comunas_region_id_idx on public.comunas (region_id);

create table public.sucursales (
  id        smallint generated always as identity primary key,
  nombre    text not null unique,
  comuna_id smallint not null references public.comunas (id)
);
create index sucursales_comuna_id_idx on public.sucursales (comuna_id);

create table public.rutas (
  id     integer generated always as identity primary key,
  codigo text not null unique check (codigo ~ '^[A-Z]{3}-[0-9]{3}$')
);

create table public.conductores (
  id     integer generated always as identity primary key,
  codigo text not null unique check (codigo ~ '^CND-[0-9]{4}$')
);

create table public.parametros (
  clave       text primary key,
  valor       numeric not null,
  descripcion text not null
);

-- ───────────── Clientes ─────────────
create table public.clientes (
  id           bigint generated always as identity primary key,
  rut          text not null unique check (rut ~ '^[0-9]{7,8}-[0-9K]$'),
  nombre       text not null,
  tipo_cliente public.tipo_cliente,           -- solo se conoce cuando el cliente ha enviado
  created_at   timestamptz not null default now()
);

-- ───────────── Envíos ─────────────
create table public.envios (
  id                    bigint generated always as identity primary key,
  id_pedido             text not null unique,
  codigo_seguimiento    bigint not null unique,
  emitido_en            timestamptz not null,
  canal_venta           public.canal_venta not null,

  -- remitente (datos tal como quedaron en la guía)
  remitente_id          bigint not null references public.clientes (id),
  remitente_nombre      text not null,
  remitente_telefono    text not null,
  sucursal_origen_id    smallint not null references public.sucursales (id),

  -- destinatario
  destinatario_id       bigint not null references public.clientes (id),
  destinatario_nombre   text not null,
  destinatario_telefono text not null,
  destinatario_email    text,
  direccion_destino     text not null,
  comuna_destino_id     smallint not null references public.comunas (id),
  tipo_entrega          public.tipo_entrega not null,
  sucursal_destino_id   smallint references public.sucursales (id),

  -- carga
  tipo_servicio         public.tipo_servicio not null,
  tipo_bulto            public.tipo_bulto not null,
  contenido_declarado   public.contenido_declarado not null,
  num_bultos            smallint not null check (num_bultos >= 1),
  peso_real_kg          numeric(8,2) not null check (peso_real_kg > 0),
  largo_cm              smallint not null check (largo_cm > 0),
  ancho_cm              smallint not null check (ancho_cm > 0),
  alto_cm               smallint not null check (alto_cm > 0),
  peso_volumetrico_kg   numeric(8,2) not null check (peso_volumetrico_kg >= 0),
  peso_facturable_kg    numeric(8,2) not null,

  -- cobro (pesos chilenos enteros)
  valor_declarado       integer not null check (valor_declarado >= 0),
  seguro_contratado     boolean not null,
  condicion_pago        public.condicion_pago not null,
  medio_pago            public.medio_pago not null,
  flete_neto            integer not null check (flete_neto >= 0),
  costo_seguro          integer not null check (costo_seguro >= 0),
  total_neto            integer not null,
  iva                   integer not null check (iva >= 0),
  total_con_iva         integer not null,

  -- operación
  fecha_comprometida    date not null,
  fecha_entrega         date,
  estado                public.estado_envio not null,
  intentos_entrega      smallint not null default 0 check (intentos_entrega >= 0),
  motivo_incidencia     public.motivo_incidencia,
  recibido_por          text,
  ruta_id               integer references public.rutas (id),
  conductor_id          integer references public.conductores (id),
  dias_transito         smallint,             -- días hábiles; -1 = emitido y entregado un sábado
  cumple_sla            public.cumple_sla not null default 'Pendiente',
  calificacion          smallint check (calificacion between 1 and 5),

  created_at            timestamptz not null default now(),

  constraint envios_peso_facturable_ck check (peso_facturable_kg = greatest(peso_real_kg, peso_volumetrico_kg)),
  constraint envios_total_neto_ck      check (total_neto = flete_neto + costo_seguro),
  constraint envios_total_con_iva_ck   check (total_con_iva = total_neto + iva),
  constraint envios_seguro_ck          check (seguro_contratado or costo_seguro = 0),
  constraint envios_retiro_ck          check (tipo_entrega = 'Domicilio' or (ruta_id is null and conductor_id is null)),
  constraint envios_domicilio_ck       check (tipo_entrega = 'Retiro en Sucursal' or sucursal_destino_id is null),
  constraint envios_reparto_ck         check ((ruta_id is null) = (conductor_id is null)),
  constraint envios_entregado_ck       check ((estado = 'Entregado') = (fecha_entrega is not null)),
  constraint envios_sla_ck             check ((estado = 'Entregado') = (cumple_sla <> 'Pendiente'))
);

create index envios_emitido_en_idx          on public.envios (emitido_en);
create index envios_estado_idx              on public.envios (estado);
create index envios_remitente_id_idx        on public.envios (remitente_id);
create index envios_destinatario_id_idx     on public.envios (destinatario_id);
create index envios_sucursal_origen_id_idx  on public.envios (sucursal_origen_id);
create index envios_sucursal_destino_id_idx on public.envios (sucursal_destino_id);
create index envios_comuna_destino_id_idx   on public.envios (comuna_destino_id);
create index envios_ruta_id_idx             on public.envios (ruta_id);
create index envios_conductor_id_idx        on public.envios (conductor_id);

-- ───────────── Seguridad ─────────────
alter table public.regiones    enable row level security;
alter table public.comunas     enable row level security;
alter table public.sucursales  enable row level security;
alter table public.rutas       enable row level security;
alter table public.conductores enable row level security;
alter table public.parametros  enable row level security;
alter table public.clientes    enable row level security;
alter table public.envios      enable row level security;
