-- Auth.js owns authorization. Only server actions and the published-only public
-- endpoint may reach this table; there is no anonymous/browser database access.
CREATE TABLE public.seminar_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    draft_document JSONB NOT NULL CHECK (jsonb_typeof(draft_document) = 'object' AND draft_document->>'schemaVersion' = '1'),
    published_document JSONB,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    published_version INTEGER,
    city_count INTEGER NOT NULL DEFAULT 0 CHECK (city_count BETWEEN 0 AND 40),
    session_count INTEGER NOT NULL DEFAULT 0 CHECK (session_count BETWEEN 0 AND 1200),
    city_names TEXT[] NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    CONSTRAINT seminar_schedules_publication_state CHECK (
        (status = 'published' AND published_document IS NOT NULL
            AND jsonb_typeof(published_document) = 'object'
            AND published_document->>'schemaVersion' = '1'
            AND published_version IS NOT NULL AND published_version BETWEEN 1 AND version
            AND published_at IS NOT NULL)
        OR (status IN ('draft', 'archived') AND published_document IS NULL
            AND published_version IS NULL AND published_at IS NULL)
    )
);

CREATE INDEX seminar_schedules_event_updated_idx ON public.seminar_schedules(event_id, updated_at DESC, id);
CREATE INDEX seminar_schedules_created_by_idx ON public.seminar_schedules(created_by);
CREATE INDEX seminar_schedules_updated_by_idx ON public.seminar_schedules(updated_by);

ALTER TABLE public.seminar_schedules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.seminar_schedules FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.seminar_schedules TO service_role;

CREATE TRIGGER set_timestamp_seminar_schedules
    BEFORE UPDATE ON public.seminar_schedules
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

COMMENT ON TABLE public.seminar_schedules IS
    'Event-scoped seminar schedules. Drafts stay private; publish atomically replaces a separate public document. Optimistic version checks prevent lost updates.';
