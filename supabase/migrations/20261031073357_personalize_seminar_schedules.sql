-- created_by is the owner. Auth.js server actions scope every management read
-- and mutation to that account, regardless of global/event role.
CREATE INDEX seminar_schedules_owner_updated_idx
    ON public.seminar_schedules(created_by, updated_at DESC, id);

-- Browsers still have no direct access; published embeds use a read-only endpoint.
GRANT DELETE ON public.seminar_schedules TO service_role;

COMMENT ON TABLE public.seminar_schedules IS
    'Account-owned seminar schedules linked to any existing event. Management is restricted to created_by; public embeds read published snapshots only.';
