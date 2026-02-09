import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Admin Supabase client that bypasses RLS
 * Used for: registration, admin operations, background jobs
 * NEVER expose this on the client side!
 */
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

    if (!supabaseUrl || !supabaseSecretKey) {
        throw new Error('Missing Supabase admin credentials')
    }

    return createSupabaseClient(supabaseUrl, supabaseSecretKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
}
