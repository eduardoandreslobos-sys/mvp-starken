-- rls_auto_enable es la función del event trigger ensure_rls: activa RLS en cada tabla nueva de public.
-- Solo debe ejecutarla el sistema, no la API (/rest/v1/rpc/rls_auto_enable).
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
