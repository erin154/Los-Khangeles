import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkFingerprintForLogin } from '@/lib/fingerprintGuard'

function adminClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { email, password, deviceToken } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const anonClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError || !signInData.user) {
    return NextResponse.json({ error: signInError?.message ?? 'Invalid credentials' }, { status: 401 })
  }

  const fpResult = await checkFingerprintForLogin(deviceToken, signInData.user.id)

  if (!fpResult.allowed) {
    await anonClient.auth.signOut()
    if (fpResult.reason === 'banned' || fpResult.reason === 'limit_exceeded') {
      return NextResponse.json({ banned: true }, { status: 403 })
    }
    return NextResponse.json({ blocked: true }, { status: 403 })
  }

  const { access_token, refresh_token } = signInData.session

  const response = NextResponse.json({ ok: true })

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  }

  response.cookies.set('sb-access-token', access_token, cookieOpts)
  response.cookies.set('sb-refresh-token', refresh_token, cookieOpts)

  return response
}