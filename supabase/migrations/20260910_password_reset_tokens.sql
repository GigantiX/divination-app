-- Secure, single-use password reset tokens for Auth.js credentials accounts.
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE CHECK (char_length(token_hash) = 64),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_created
    ON public.password_reset_tokens(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_active_expiry
    ON public.password_reset_tokens(expires_at)
    WHERE used_at IS NULL;

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- The table intentionally has no client policies. Only the service-role client
-- used by server actions can create or inspect reset tokens.

CREATE OR REPLACE FUNCTION public.reset_password_with_token(
    p_token_hash TEXT,
    p_password_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    reset_token public.password_reset_tokens%ROWTYPE;
BEGIN
    SELECT *
    INTO reset_token
    FROM public.password_reset_tokens
    WHERE token_hash = p_token_hash
      AND used_at IS NULL
      AND expires_at > NOW()
    FOR UPDATE;

    IF reset_token.id IS NULL THEN
        RETURN FALSE;
    END IF;

    UPDATE public.profiles
    SET password_hash = p_password_hash
    WHERE id = reset_token.user_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Consume this token and any other outstanding reset links for the account.
    UPDATE public.password_reset_tokens
    SET used_at = NOW()
    WHERE user_id = reset_token.user_id
      AND used_at IS NULL;

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_password_with_token(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_password_with_token(TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.reset_password_with_token(TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reset_password_with_token(TEXT, TEXT) TO service_role;
