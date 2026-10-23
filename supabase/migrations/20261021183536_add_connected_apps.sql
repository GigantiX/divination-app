-- Shared API connections. Auth.js authorization runs in server actions; browser
-- database roles receive no privileges, including access to encrypted columns.
CREATE TABLE public.connected_apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL CHECK (provider = 'orderonline'),
    name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
    external_user_id TEXT NOT NULL,
    external_owner_id TEXT NOT NULL,
    profile_snapshot JSONB NOT NULL CHECK (jsonb_typeof(profile_snapshot) = 'object'),
    credential_ciphertext TEXT,
    credential_nonce TEXT,
    credential_tag TEXT,
    credential_key_version TEXT,
    credential_fingerprint TEXT,
    key_hint TEXT,
    status TEXT NOT NULL DEFAULT 'connected'
        CHECK (status IN ('connected', 'needs_attention', 'disconnected')),
    last_check_outcome TEXT CHECK (last_check_outcome IN (
        'success', 'invalid_credentials', 'identity_mismatch', 'unavailable', 'invalid_response'
    )),
    last_check_error_code TEXT,
    last_checked_at TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ,
    disconnected_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    CONSTRAINT connected_apps_credential_state CHECK (
        (status = 'disconnected'
            AND credential_ciphertext IS NULL AND credential_nonce IS NULL
            AND credential_tag IS NULL AND credential_key_version IS NULL
            AND credential_fingerprint IS NULL AND key_hint IS NULL
            AND disconnected_at IS NOT NULL)
        OR
        (status IN ('connected', 'needs_attention')
            AND credential_ciphertext IS NOT NULL AND credential_nonce IS NOT NULL
            AND credential_tag IS NOT NULL AND credential_key_version IS NOT NULL
            AND credential_fingerprint IS NOT NULL AND key_hint IS NOT NULL
            AND disconnected_at IS NULL)
    )
);

CREATE UNIQUE INDEX connected_apps_provider_fingerprint_unique
    ON public.connected_apps(provider, credential_fingerprint)
    WHERE credential_fingerprint IS NOT NULL;
CREATE INDEX connected_apps_owner ON public.connected_apps(provider, external_owner_id);
CREATE INDEX connected_apps_created ON public.connected_apps(created_at DESC);
CREATE INDEX connected_apps_creator ON public.connected_apps(created_by);
CREATE INDEX connected_apps_updater ON public.connected_apps(updated_by);

ALTER TABLE public.connected_apps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.connected_apps FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.connected_apps TO service_role;
-- No browser policies: all access is through fresh-role-checked server actions.

CREATE TRIGGER set_timestamp_connected_apps
    BEFORE UPDATE ON public.connected_apps
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

COMMENT ON TABLE public.connected_apps IS
    'Shared admin/developer API connections. Server-only access; credentials use application-level authenticated encryption.';
