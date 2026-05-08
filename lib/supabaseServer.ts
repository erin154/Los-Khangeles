import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Standard client for authenticated user actions (reads JWT from cookie)
export async function createServerClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('sb-access-token')?.value

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {},
    },
  })

  // Set the session so auth.getUser() works
  if (accessToken) {
    const refreshToken = cookieStore.get('sb-refresh-token')?.value ?? ''
    await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
  }

  return client
}

// Privileged client for atomic balance updates (bypasses RLS)
export function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
