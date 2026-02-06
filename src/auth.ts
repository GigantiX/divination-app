import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { createClient } from '@/lib/supabase/server'
import { verifyPassword } from '@/lib/password'

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Credentials({
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            authorize: async (credentials) => {
                const email = credentials.email as string
                const password = credentials.password as string

                if (!email || !password) {
                    throw new Error('Email dan password wajib diisi')
                }

                // Get user from Supabase
                const supabase = await createClient()
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('username', email)
                    .single()

                if (error || !profile) {
                    throw new Error('Email atau password salah')
                }

                if (!profile.password_hash) {
                    throw new Error('Akun belum memiliki password')
                }

                // Verify password
                const isValid = await verifyPassword(password, profile.password_hash)
                if (!isValid) {
                    throw new Error('Email atau password salah')
                }

                // Return user object
                return {
                    id: profile.id,
                    email: email,
                    name: profile.full_name,
                    role: profile.role,
                }
            },
        }),
    ],
    session: {
        strategy: 'jwt',
        maxAge: 7 * 24 * 60 * 60, // 7 days
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id as string
                token.role = user.role as string
            }
            return token
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id as string
                session.user.role = token.role as string
            }
            return session
        },
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
})
