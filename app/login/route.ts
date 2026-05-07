import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkFingerprintForLogin } from '@/lib/fingerprintGuard'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
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
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  return NextResponse.json({
    ok: true,
    session: signInData.session,
  })
}