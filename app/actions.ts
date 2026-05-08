'use server'

import { createServerClient, createAdminClient } from '@/lib/supabaseServer'
import { revalidatePath } from 'next/cache'

export async function getDashboardData() {
  const supabase = await createServerClient()
  const adminSb = createAdminClient()
  
  // 1. Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  // 2. Get Account — use admin client for always-fresh balance (bypasses any RLS cache)
  const { data: account, error: accError } = await adminSb
    .from('accounts')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (accError || !account) throw new Error('Account not found')

  // 3. Get Transactions — fresh read via admin client
  const { data: transactions } = await adminSb
    .from('transactions')
    .select(`*, sender:sender_id(display_name), recipient:recipient_id(display_name)`)
    .or(`sender_id.eq.${account.id},recipient_id.eq.${account.id}`)
    .order('created_at', { ascending: false })
    .limit(20)

  return { account, transactions: transactions || [] }
}

export async function performTransaction(formData: any) {
  const supabase = await createServerClient()
  const adminClient = createAdminClient()

  // 1. Authenticate User
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Unauthorized' }

  const { amount, recipientId, type, memo, password, service_description, job_position } = formData
  
  const amountNum = parseFloat(amount)
  if (isNaN(amountNum) || amountNum <= 0) return { error: 'Invalid amount' }

  // 2. Re-verify Password
  const { error: passError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: password
  })
  if (passError) return { error: 'Invalid password. Verification failed.' }

  // 3. Get Sender Account
  const { data: senderAcc } = await adminClient
    .from('accounts')
    .select('id, balance')
    .eq('auth_user_id', user.id)
    .single()

  if (!senderAcc) return { error: 'Sender account not found' }

  // 4. Check Balance (Example: Debt limit of 50)
  if (senderAcc.balance - amountNum < -50) {
    return { error: 'This transaction would exceed your debt limit of 50 doubloons.' }
  }

  // 5. Perform Transaction Atomically
  // In a real app, we'd use a postgres function (rpc) for true atomicity.
  // Here we use the admin client to ensure we can update both.
  
  const txData: any = {
    type,
    amount: amountNum,
    memo: memo || null,
    sender_id: senderAcc.id,
    recipient_id: recipientId,
    service_description,
    job_position
  }

  // Handle loan repayment logic
  if (type === 'loan_repayment') {
      const { data: govAccount } = await adminClient
        .from('accounts').select('id').eq('type', 'government').single()
      txData.recipient_id = govAccount?.id
  }

  const { error: txError } = await adminClient.from('transactions').insert(txData)
  if (txError) return { error: txError.message }

  // Trigger balance updates (usually handled by DB triggers, but we revalidate)
  revalidatePath('/dashboard')
  revalidatePath('/history')
  
  return { success: true }
}

export async function searchAccounts(query: string) {
  const supabase = createAdminClient()
  if (!query) return []
  
  const { data } = await supabase
    .from('accounts')
    .select('id, display_name, type, email')
    .ilike('display_name', `%${query}%`)
    .limit(5)
    
  return data || []
}

export async function getCourtData(tab: string) {
    const supabase = createAdminClient() // Using admin client because court is public but we hid the anon key
    
    let query = supabase.from('accounts').select('*').eq('is_active', true)
    
    if (tab === 'individuals') query = query.eq('type', 'individual')
    if (tab === 'corporations') query = query.eq('type', 'corporate')
    
    const { data } = await query.order('balance', { ascending: false })
    
    // Also fetch loans if needed
    let loans = []
    if (tab === 'loans') {
        const { data: loanData } = await supabase
            .from('loan_balances')
            .select('*')
            .order('total_owed', { ascending: false })
        loans = loanData || []
    }

    return { data: data || [], loans }
}

export async function getAccountDetail(id: string) {
    // Auth gate: only government (court) accounts may view another account's history
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const adminSb = createAdminClient()
    const { data: caller } = await adminSb
        .from('accounts')
        .select('type')
        .eq('auth_user_id', user.id)
        .single()

    if (caller?.type !== 'government') throw new Error('Forbidden')

    const [{ data: acc }, { data: txns }] = await Promise.all([
      adminSb.from('accounts').select('*').eq('id', id).single(),
      adminSb
        .from('transactions')
        .select(`*, sender:sender_id(display_name), recipient:recipient_id(display_name)`)
        .or(`sender_id.eq.${id},recipient_id.eq.${id}`)
        .order('created_at', { ascending: false }),
    ])

    return { account: acc, transactions: txns || [] }
}

export async function getLoanDetail(id: string) {
    // Auth gate: only government (court) accounts may view loan details
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const adminSb = createAdminClient()
    const { data: caller } = await adminSb
        .from('accounts')
        .select('type')
        .eq('auth_user_id', user.id)
        .single()

    if (caller?.type !== 'government') throw new Error('Forbidden')

    const [{ data: account }, { data: loan }, { data: history }] = await Promise.all([
        adminSb.from('accounts').select('*').eq('id', id).single(),
        adminSb.from('loan_balances').select('*').eq('account_id', id).single(),
        adminSb
          .from('transactions')
          .select('*')
          .eq('sender_id', id)
          .eq('type', 'loan_repayment')
          .order('created_at', { ascending: false }),
      ])
      
    return { account, loan, history: history || [] }
}

export async function getUserLoans() {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  const adminSb = createAdminClient()
  const { data: account } = await adminSb
    .from('accounts')
    .select('id, display_name, type')
    .eq('auth_user_id', user.id)
    .single()

  if (!account) throw new Error('Account not found')

  if (account.type === 'government') {
    const { data: loans } = await adminSb
      .from('loan_balances')
      .select('*')
      .order('total_owed', { ascending: false })
    return { account, allLoans: loans || [] }
  } else {
    const { data: loanAccount } = await adminSb
      .from('loan_accounts')
      .select('interest_accrued')
      .eq('account_id', account.id)
      .maybeSingle()

    const { data: txns } = await adminSb
      .from('transactions')
      .select('id, type, amount, memo, created_at')
      .in('type', ['loan_disbursement', 'loan_repayment'])
      .or(`recipient_id.eq.${account.id},sender_id.eq.${account.id}`)
      .order('created_at', { ascending: false })

    return { account, loanAccount, history: txns || [] }
  }
}

export async function getTransactionHistory() {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  const adminSb = createAdminClient()
  const { data: account } = await adminSb
    .from('accounts')
    .select('id, display_name, type')
    .eq('auth_user_id', user.id)
    .single()

  if (!account) throw new Error('Account not found')

  const { data: txns } = await adminSb
    .from('transactions')
    .select(`
      *,
      sender:sender_id(display_name),
      recipient:recipient_id(display_name)
    `)
    .or(`sender_id.eq.${account.id},recipient_id.eq.${account.id}`)
    .order('created_at', { ascending: false })

  return { account, transactions: txns || [] }
}

export async function signOutAction() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
}
