import { cache } from 'react'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Admin Supabase client that bypasses RLS.
 * Wrapped with React.cache() to deduplicate across multiple
 * server actions/components within the same request.
 */
export const createAdminClient = cache(() => {
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
})
