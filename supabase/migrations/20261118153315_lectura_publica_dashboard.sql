-- Lectura pública para el dashboard, sin datos personales.
--
-- 1. tipo_cliente pasa a ser también un dato del envío, igual que el nombre del remitente.
--    En el Excel viene por fila, y 3 envíos tienen un tipo distinto al último del cliente.
-- 2. anon (la llave publicable) puede leer los catálogos y solo las columnas de envios que no
--    identifican a nadie. Quedan fuera: id_pedido, codigo_seguimiento, remitente_*, destinatario_*,
--    direccion_destino, recibido_por, ruta_id y conductor_id. La tabla clientes sigue cerrada.

-- 1. tipo_cliente en envios
alter table public.envios add column tipo_cliente public.tipo_cliente;

update public.envios e set tipo_cliente = c.tipo_cliente
from public.clientes c where c.id = e.remitente_id;

update public.envios set tipo_cliente = v.tipo::public.tipo_cliente
from (values ('PED-2026-001566', 'PYME'),
             ('PED-2026-001783', 'E-commerce'),
             ('PED-2026-008500', 'Empresa')) v(id_pedido, tipo)
where envios.id_pedido = v.id_pedido;

alter table public.envios alter column tipo_cliente set not null;

-- 2. Permisos: primero se cierra todo lo que Supabase concede por defecto y luego se abre lo justo.
revoke all on public.regiones, public.comunas, public.sucursales, public.rutas, public.conductores,
              public.parametros, public.clientes, public.envios
  from anon, authenticated;

grant select on public.regiones, public.comunas, public.sucursales, public.parametros to anon, authenticated;

grant select (
  id, emitido_en, canal_venta, tipo_cliente, sucursal_origen_id, comuna_destino_id, tipo_entrega,
  sucursal_destino_id, tipo_servicio, tipo_bulto, contenido_declarado, num_bultos, peso_real_kg,
  peso_volumetrico_kg, peso_facturable_kg, valor_declarado, seguro_contratado, condicion_pago,
  medio_pago, flete_neto, costo_seguro, total_neto, iva, total_con_iva, fecha_comprometida,
  fecha_entrega, estado, intentos_entrega, motivo_incidencia, dias_transito, cumple_sla, calificacion
) on public.envios to anon, authenticated;

create policy lectura_publica on public.regiones   for select to anon, authenticated using (true);
create policy lectura_publica on public.comunas    for select to anon, authenticated using (true);
create policy lectura_publica on public.sucursales for select to anon, authenticated using (true);
create policy lectura_publica on public.parametros for select to anon, authenticated using (true);
create policy lectura_publica on public.envios     for select to anon, authenticated using (true);
