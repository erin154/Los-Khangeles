'use client'

import { useState, useEffect } from 'react'
import { supabasePublic as supabase } from '@/lib/supabasePublic'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type Account = {
  id: string
  display_name: string
  email: string
  type: string
}

type LoanTransaction = {
  id: string
  type: string
  amount: number
  memo: string | null
  created_at: string
}

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [account, setAccount] = useState<Account | null>(null)
  const [interest, setInterest] = useState(0)
  const [loanHistory, setLoanHistory] = useState<LoanTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (id) loadLoanDetail() }, [id])

    async function loadLoanDetail() {
        const [{ data: acc }, { data: loanAccount }, { data: txns }] = await Promise.all([
          supabase
            .from('accounts')
            .select('id, display_name, email, type')
            .eq('id', id)
            .single(),
          supabase
            .from('loan_accounts')
            .select('interest_accrued')
            .eq('account_id', id)
            .maybeSingle(),
          supabase
            .from('transactions')
            .select('id, type, amount, memo, created_at')
            .in('type', ['loan_disbursement', 'loan_repayment'])
            .or(`recipient_id.eq.${id},sender_id.eq.${id}`)
            .order('created_at', { ascending: false }),
        ])
      
        if (!acc) { router.push('/court'); return }
        setAccount(acc)
        setInterest(loanAccount?.interest_accrued ?? 0)
        setLoanHistory(txns || [])
        setLoading(false)
      }

  const totalDisbursed = loanHistory
    .filter(t => t.type === 'loan_disbursement')
    .reduce((s, t) => s + Number(t.amount), 0)

  const totalRepaid = loanHistory
    .filter(t => t.type === 'loan_repayment')
    .reduce((s, t) => s + Number(t.amount), 0)

  const principal = totalDisbursed - totalRepaid
  const totalOwed = principal + interest

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/court" className="text-gray-500 hover:text-white text-sm transition-colors">
            ← Court View
          </Link>
          <span className="text-gray-700">|</span>
          <div>
            <h1 className="text-white font-bold">{account?.display_name} — Loan Record</h1>
            <p className="text-gray-500 text-xs capitalize">{account?.type} · {account?.email}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Total Disbursed</p>
            <p className="text-2xl font-bold text-blue-400">{totalDisbursed.toFixed(2)} ᗫ</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Total Repaid</p>
            <p className="text-2xl font-bold text-green-400">{totalRepaid.toFixed(2)} ᗫ</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Interest</p>
            <p className="text-2xl font-bold text-yellow-400">{interest.toFixed(2)} ᗫ</p>
          </div>
          <div className="bg-gradient-to-br from-red-900 to-red-800 border border-red-700 rounded-2xl p-5 text-center">
            <p className="text-red-300 text-xs uppercase tracking-widest mb-2">Total Owed</p>
            <p className="text-2xl font-bold text-white">{totalOwed.toFixed(2)} ᗫ</p>
          </div>
        </div>

        {/* Loan History */}
        <h2 className="text-lg font-semibold mb-4">Loan History</h2>

        {loanHistory.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">No loan transactions found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {loanHistory.map(tx => {
              const isDisbursement = tx.type === 'loan_disbursement'
              return (
                <div
                  key={tx.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isDisbursement
                          ? 'bg-red-900/50 text-red-300'
                          : 'bg-green-900/50 text-green-300'
                      }`}>
                        {isDisbursement ? 'Disbursement' : 'Repayment'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs mt-1">
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
                    {isDisbursement ? '+' : '−'}{Number(tx.amount).toFixed(2)} ᗫ
                  </p>
                </div>
              )
            })}
          </div>
        )}

      </main>
    </div>
  )
}