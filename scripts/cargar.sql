-- Pasa public.stg_envios (subida con scripts/subir_staging.py) a las tablas finales.
-- Se ejecuta completo en una sola llamada; todo va en una transacción: si algo falla, no queda nada a medias.
-- Solo sirve sobre tablas vacías (los catálogos se crean a partir de los envíos).
begin;

create temp table stg on commit drop as
select
  id_pedido, codigo_seguimiento::bigint, fecha_emision::date, hora_emision::time,
  canal_venta, tipo_cliente,
  upper(trim(rut_remitente)) rut_remitente, nombre_remitente, telefono_remitente,
  region_origen, comuna_origen, sucursal_origen,
  upper(trim(rut_destinatario)) rut_destinatario, nombre_destinatario, telefono_destinatario, email_destinatario,
  direccion_destino, comuna_destino, region_destino, zona_destino,
  tipo_entrega, sucursal_destino, tipo_servicio, tipo_bulto, contenido_declarado,
  num_bultos::smallint, peso_real_kg::numeric, largo_cm::smallint, ancho_cm::smallint, alto_cm::smallint,
  peso_volumetrico_kg::numeric, peso_facturable_kg::numeric, valor_declarado::integer, seguro_contratado::boolean,
  condicion_pago, medio_pago, flete_neto::integer, costo_seguro::integer, total_neto::integer,
  iva::integer, total_con_iva::integer, fecha_comprometida::date, fecha_entrega::date, estado,
  intentos_entrega::smallint, motivo_incidencia, recibido_por, ruta_conductor,
  dias_transito::smallint, cumple_sla, calificacion::smallint
from public.stg_envios;

-- Catálogos
insert into public.regiones (nombre, zona)
select distinct region_destino, zona_destino::public.zona from stg order by 1;

insert into public.comunas (nombre, region_id)
select distinct c.comuna, r.id
from (select comuna_origen as comuna, region_origen as region from stg
      union select comuna_destino, region_destino from stg) c
join public.regiones r on r.nombre = c.region
order by 1;

insert into public.sucursales (nombre, comuna_id)
select distinct s.sucursal, co.id
from (select sucursal_origen as sucursal, comuna_origen as comuna, region_origen as region from stg
      union select sucursal_destino, comuna_destino, region_destino from stg where sucursal_destino is not null) s
join public.regiones r on r.nombre = s.region
join public.comunas co on co.nombre = s.comuna and co.region_id = r.id
order by 1;

insert into public.rutas (codigo)
select distinct split_part(ruta_conductor, ' / ', 1) from stg where ruta_conductor is not null order by 1;

insert into public.conductores (codigo)
select distinct split_part(ruta_conductor, ' / ', 2) from stg where ruta_conductor is not null order by 1;

-- Hoja Supuestos del Excel
insert into public.parametros (clave, valor, descripcion) values
  ('iva', 0.19, 'Tasa de IVA sobre el total neto'),
  ('factor_peso_volumetrico', 4000, 'cm³ por kg: largo × ancho × alto × bultos / factor'),
  ('tasa_seguro', 0.01, 'Fracción del valor declarado que se cobra como seguro'),
  ('seguro_minimo_clp', 1000, 'Cobro mínimo de seguro cuando se contrata (CLP)');

-- Clientes: un registro por RUT, con el nombre de su aparición más reciente.
-- tipo_cliente solo se conoce si el RUT fue remitente (también el más reciente).
insert into public.clientes (rut, nombre, tipo_cliente)
select a.rut, a.nombre, t.tipo_cliente::public.tipo_cliente
from (
  select distinct on (rut) rut, nombre
  from (select rut_remitente as rut, nombre_remitente as nombre, fecha_emision, hora_emision, id_pedido from stg
        union all
        select rut_destinatario, nombre_destinatario, fecha_emision, hora_emision, id_pedido from stg) x
  order by rut, fecha_emision desc, hora_emision desc, id_pedido desc
) a
left join (
  select distinct on (rut_remitente) rut_remitente as rut, tipo_cliente
  from stg order by rut_remitente, fecha_emision desc, hora_emision desc, id_pedido desc
) t on t.rut = a.rut
order by a.rut;

-- Envíos
insert into public.envios (
  id_pedido, codigo_seguimiento, emitido_en, canal_venta,
  remitente_id, remitente_nombre, remitente_telefono, sucursal_origen_id,
  destinatario_id, destinatario_nombre, destinatario_telefono, destinatario_email,
  direccion_destino, comuna_destino_id, tipo_entrega, sucursal_destino_id,
  tipo_servicio, tipo_bulto, contenido_declarado, num_bultos, peso_real_kg,
  largo_cm, ancho_cm, alto_cm, peso_volumetrico_kg, peso_facturable_kg,
  valor_declarado, seguro_contratado, condicion_pago, medio_pago,
  flete_neto, costo_seguro, total_neto, iva, total_con_iva,
  fecha_comprometida, fecha_entrega, estado, intentos_entrega, motivo_incidencia,
  recibido_por, ruta_id, conductor_id, dias_transito, cumple_sla, calificacion
)
select
  s.id_pedido, s.codigo_seguimiento,
  (s.fecha_emision + s.hora_emision) at time zone 'America/Santiago',
  s.canal_venta::public.canal_venta,
  rem.id, s.nombre_remitente, s.telefono_remitente, so.id,
  des.id, s.nombre_destinatario, s.telefono_destinatario, s.email_destinatario,
  s.direccion_destino, cd.id, s.tipo_entrega::public.tipo_entrega, sd.id,
  s.tipo_servicio::public.tipo_servicio, s.tipo_bulto::public.tipo_bulto,
  s.contenido_declarado::public.contenido_declarado, s.num_bultos, s.peso_real_kg,
  s.largo_cm, s.ancho_cm, s.alto_cm, s.peso_volumetrico_kg, s.peso_facturable_kg,
  s.valor_declarado, s.seguro_contratado, s.condicion_pago::public.condicion_pago, s.medio_pago::public.medio_pago,
  s.flete_neto, s.costo_seguro, s.total_neto, s.iva, s.total_con_iva,
  s.fecha_comprometida, s.fecha_entrega, s.estado::public.estado_envio, s.intentos_entrega,
  s.motivo_incidencia::public.motivo_incidencia,
  s.recibido_por, ru.id, cn.id, s.dias_transito, s.cumple_sla::public.cumple_sla, s.calificacion
from stg s
join public.clientes rem   on rem.rut = s.rut_remitente
join public.clientes des   on des.rut = s.rut_destinatario
join public.sucursales so  on so.nombre = s.sucursal_origen
join public.regiones rd    on rd.nombre = s.region_destino
join public.comunas cd     on cd.nombre = s.comuna_destino and cd.region_id = rd.id
left join public.sucursales sd  on sd.nombre = s.sucursal_destino
left join public.rutas ru       on ru.codigo = split_part(s.ruta_conductor, ' / ', 1)
left join public.conductores cn on cn.codigo = split_part(s.ruta_conductor, ' / ', 2)
order by s.id_pedido;

-- Si un join perdió filas, aborta toda la carga.
do $$
declare n_stg int; n_env int;
begin
  select count(*) into n_stg from stg;
  select count(*) into n_env from public.envios;
  if n_stg <> n_env then
    raise exception 'Se esperaban % envíos y se insertaron %', n_stg, n_env;
  end if;
end $$;

commit;

select 'regiones' tabla, count(*) from public.regiones
union all select 'comunas', count(*) from public.comunas
union all select 'sucursales', count(*) from public.sucursales
union all select 'rutas', count(*) from public.rutas
union all select 'conductores', count(*) from public.conductores
union all select 'parametros', count(*) from public.parametros
union all select 'clientes', count(*) from public.clientes
union all select 'envios', count(*) from public.envios;
