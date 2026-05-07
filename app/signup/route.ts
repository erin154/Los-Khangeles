import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  checkFingerprintForSignup,
  registerFingerprint,
} from '@/lib/fingerprintGuard'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { email, password, displayName, accountType, deviceToken } = body

  if (!email || !password || !displayName) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const fpResult = await checkFingerprintForSignup(deviceToken)

  if (!fpResult.allowed) {
    if (fpResult.reason === 'banned') {
      return NextResponse.json({ banned: true }, { status: 403 })
    }
    return NextResponse.json({ blocked: true }, { status: 403 })
  }

  const supabase = adminClient()
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Signup failed' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('accounts')
    .select('id')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'An account already exists for this user.' }, { status: 400 })
  }

  const type = ['individual', 'corporate'].includes(accountType) ? accountType : 'individual'

  const { error: accError } = await supabase.from('accounts').insert({
    type,
    display_name: displayName,
    email,
    auth_user_id: authData.user.id,
    balance: 0,
  })

  if (accError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: accError.message }, { status: 500 })
  }

  if (deviceToken) {
    await registerFingerprint(deviceToken, authData.user.id)
  }

  return NextResponse.json({ ok: true })
}