-- Supabase may grant all privileges on newly created public tables by default.
-- Remove inherited service-role table privileges, then grant only what the
-- connection lifecycle uses. Disconnect is an UPDATE, never a DELETE.
REVOKE ALL ON public.connected_apps FROM service_role;
GRANT SELECT, INSERT, UPDATE ON public.connected_apps TO service_role;
