'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'

type LoanEntry = {
  id: string
  type: string
  amount: number
  memo: string | null
  created_at: string
  sender: { display_name: string } | null
  recipient: { display_name: string } | null
}

export default function LoansPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [accountId, setAccountId] = useState('')
  const [principal, setPrincipal] = useState(0)
  const [interest, setInterest] = useState(0)
  const [loanHistory, setLoanHistory] = useState<LoanEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoan, setHasLoan] = useState(false)

  useEffect(() => { loadLoans() }, [])

  async function loadLoans() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }

    const { data: account } = await supabase
      .from('accounts')
      .select('id, display_name, type')
      .eq('auth_user_id', session.user.id)
      .single()

    if (!account) { router.push('/'); return }
    setDisplayName(`${account.display_name} · ${account.type}`)
    setAccountId(account.id)

    // Check for loan record
    const { data: loanAccount } = await supabase
      .from('loan_accounts')
      .select('interest_accrued')
      .eq('account_id', account.id)
      .single()

    if (loanAccount) {
      setHasLoan(true)
      setInterest(loanAccount.interest_accrued)
    }

    // Get all loan-related transactions
    const { data: txns } = await supabase
      .from('transactions')
      .select(`*, sender:sender_id(display_name), recipient:recipient_id(display_name)`)
      .or(`and(type.eq.loan_disbursement,recipient_id.eq.${account.id}),and(type.eq.loan_repayment,sender_id.eq.${account.id})`)
      .order('created_at', { ascending: false })

    const entries = txns || []
    setLoanHistory(entries)

    // Calculate principal: disbursements - repayments
    const totalDisbursed = entries
      .filter(t => t.type === 'loan_disbursement')
      .reduce((sum: number, t: LoanEntry) => sum + t.amount, 0)
    const totalRepaid = entries
      .filter(t => t.type === 'loan_repayment')
      .reduce((sum: number, t: LoanEntry) => sum + t.amount, 0)
    setPrincipal(totalDisbursed - totalRepaid)

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  const totalOwed = principal + interest

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Nav displayName={displayName} />

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-8">Loans</h1>

        {!hasLoan ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
            <p className="text-gray-400 text-lg">No active loans</p>
            <p className="text-gray-600 text-sm mt-2">
              Loan disbursements from the government will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-10">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
                <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">
                  Principal
                </p>
                <p className={`text-3xl font-bold ${principal > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {principal.toFixed(2)} ᗫ
                </p>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
                <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">
                  Interest
                </p>
                <p className={`text-3xl font-bold ${interest > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                  {interest.toFixed(2)} ᗫ
                </p>
              </div>

              <div className="bg-gradient-to-br from-red-900 to-red-800 border border-red-700 rounded-2xl p-6 text-center">
                <p className="text-red-300 text-xs uppercase tracking-widest mb-2">
                  Total Owed
                </p>
                <p className="text-3xl font-bold text-white">
                  {totalOwed.toFixed(2)} ᗫ
                </p>
              </div>
            </div>

            {/* Loan History */}
            <h2 className="text-lg font-semibold mb-4">Loan History</h2>
            <div className="space-y-3">
              {loanHistory.map(tx => {
                const isDisbursement = tx.type === 'loan_disbursement'
                return (
                  <div
                    key={tx.id}
                    className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-white font-medium text-sm">
                        {isDisbursement ? 'Loan Disbursement' : 'Loan Repayment'}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {isDisbursement ? 'from Los Khangeles Bank' : 'to Los Khangeles Bank'}
                      </p>
                      {tx.memo && (
                        <p className="text-gray-500 text-xs mt-0.5 italic">"{tx.memo}"</p>
                      )}
                      <p className="text-gray-600 text-xs mt-1">
                        {new Date(tx.created_at).toLocaleString()}
                      </p>
                    </div>
                    <p className={`text-lg font-bold ${isDisbursement ? 'text-red-400' : 'text-green-400'}`}>
                      {isDisbursement ? '+' : '−'}{tx.amount.toFixed(2)} ᗫ
                    </p>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}