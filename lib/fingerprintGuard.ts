import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { persistSession: false } })
}

export type FingerprintStatus =
  | { allowed: true }
  | { allowed: false; reason: 'banned' | 'limit_exceeded' | 'missing_token' }

export async function checkFingerprintForSignup(
  token: string | null | undefined,
): Promise<FingerprintStatus> {
  if (!token || !token.includes(':')) {
    return { allowed: false, reason: 'missing_token' }
  }

  const [signalHash, persistentId] = token.split(':')
  if (!signalHash || !persistentId) {
    return { allowed: false, reason: 'missing_token' }
  }

  const supabase = getAdminClient()

  const { data: ban } = await supabase
    .from('fingerprint_bans')
    .select('fingerprint_token')
    .or(`signal_hash.eq.${signalHash},persistent_id.eq.${persistentId}`)
    .maybeSingle()

  if (ban) return { allowed: false, reason: 'banned' }

  const { data: rows } = await supabase
    .from('device_fingerprints')
    .select('auth_user_id')
    .or(`signal_hash.eq.${signalHash},persistent_id.eq.${persistentId}`)

  const distinctUsers = new Set((rows ?? []).map(r => r.auth_user_id)).size

  if (distinctUsers >= 2) {
    await supabase.from('fingerprint_bans').upsert({
      signal_hash: signalHash,
      persistent_id: persistentId,
      banned_at: new Date().toISOString(),
    })
    return { allowed: false, reason: 'limit_exceeded' }
  }

  return { allowed: true }
}

export async function registerFingerprint(
  token: string,
  authUserId: string,
): Promise<void> {
  if (!token.includes(':')) return
  const [signalHash, persistentId] = token.split(':')
  const supabase = getAdminClient()
  await supabase.from('device_fingerprints').upsert(
    { signal_hash: signalHash, persistent_id: persistentId, auth_user_id: authUserId },
    { onConflict: 'signal_hash,persistent_id,auth_user_id' },
  )
}

export async function checkFingerprintForLogin(
  token: string | null | undefined,
  authUserId: string,
): Promise<FingerprintStatus> {
  if (!token || !token.includes(':')) {
    return { allowed: false, reason: 'missing_token' }
  }

  const [signalHash, persistentId] = token.split(':')
  if (!signalHash || !persistentId) {
    return { allowed: false, reason: 'missing_token' }
  }

  const supabase = getAdminClient()

  const { data: ban } = await supabase
    .from('fingerprint_bans')
    .select('signal_hash')
    .or(`signal_hash.eq.${signalHash},persistent_id.eq.${persistentId}`)
    .maybeSingle()

  if (ban) return { allowed: false, reason: 'banned' }

  await supabase.from('device_fingerprints').upsert(
    { signal_hash: signalHash, persistent_id: persistentId, auth_user_id: authUserId },
    { onConflict: 'signal_hash,persistent_id,auth_user_id' },
  )

  const { data: rows } = await supabase
    .from('device_fingerprints')
    .select('auth_user_id')
    .or(`signal_hash.eq.${signalHash},persistent_id.eq.${persistentId}`)

  const distinctUsers = new Set((rows ?? []).map(r => r.auth_user_id)).size

  if (distinctUsers > 2) {
    await supabase.from('fingerprint_bans').upsert({
      signal_hash: signalHash,
      persistent_id: persistentId,
      banned_at: new Date().toISOString(),
    })
    return { allowed: false, reason: 'limit_exceeded' }
  }

  return { allowed: true }
}