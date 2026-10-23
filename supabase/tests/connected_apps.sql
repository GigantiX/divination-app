-- Run after both Connected Apps migrations. All writes roll back.
BEGIN;
DO $test$
DECLARE
    test_id UUID := gen_random_uuid();
    fingerprint TEXT := gen_random_uuid()::TEXT;
    touched INTEGER;
    browser_role TEXT;
    operation TEXT;
BEGIN
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.connected_apps'::regclass) THEN
        RAISE EXCEPTION 'Connected Apps must have RLS enabled';
    END IF;
    FOREACH browser_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        FOREACH operation IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'] LOOP
            IF has_table_privilege(browser_role, 'public.connected_apps', operation) THEN
                RAISE EXCEPTION 'Unexpected % privilege for %', operation, browser_role;
            END IF;
        END LOOP;
    END LOOP;
    FOREACH operation IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE'] LOOP
        IF NOT has_table_privilege('service_role', 'public.connected_apps', operation) THEN
            RAISE EXCEPTION 'Missing backend % privilege', operation;
        END IF;
    END LOOP;
    FOREACH operation IN ARRAY ARRAY['DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES'] LOOP
        IF has_table_privilege('service_role', 'public.connected_apps', operation) THEN
            RAISE EXCEPTION 'Unnecessary backend % privilege', operation;
        END IF;
    END LOOP;

    INSERT INTO public.connected_apps (
        id, provider, name, external_user_id, external_owner_id, profile_snapshot,
        credential_ciphertext, credential_nonce, credential_tag,
        credential_key_version, credential_fingerprint, key_hint
    ) VALUES (
        test_id, 'orderonline', 'Rollback-only test', 'test-user', 'test-owner', '{}',
        'synthetic-ciphertext', 'synthetic-nonce', 'synthetic-tag', 'v1', fingerprint, 'masked'
    );
    BEGIN
        INSERT INTO public.connected_apps (
            provider, name, external_user_id, external_owner_id, profile_snapshot,
            credential_ciphertext, credential_nonce, credential_tag,
            credential_key_version, credential_fingerprint, key_hint
        ) VALUES (
            'orderonline', 'Duplicate test', 'test-user', 'test-owner', '{}',
            'synthetic-ciphertext', 'synthetic-nonce', 'synthetic-tag', 'v1', fingerprint, 'masked'
        );
        RAISE EXCEPTION 'Duplicate credential accepted';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        UPDATE public.connected_apps SET status = 'disconnected', disconnected_at = now() WHERE id = test_id;
        RAISE EXCEPTION 'Disconnect retained credential material';
    EXCEPTION WHEN check_violation THEN NULL;
    END;

    UPDATE public.connected_apps SET name = 'Version 2', version = 2 WHERE id = test_id AND version = 1;
    UPDATE public.connected_apps SET name = 'Stale update', version = 2 WHERE id = test_id AND version = 1;
    GET DIAGNOSTICS touched = ROW_COUNT;
    IF touched <> 0 THEN RAISE EXCEPTION 'Stale update succeeded'; END IF;

    UPDATE public.connected_apps SET
        status = 'disconnected', disconnected_at = now(),
        credential_ciphertext = NULL, credential_nonce = NULL, credential_tag = NULL,
        credential_key_version = NULL, credential_fingerprint = NULL, key_hint = NULL
    WHERE id = test_id;
END $test$;
ROLLBACK;
