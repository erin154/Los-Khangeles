'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type Account = {
  id: string
  display_name: string
  email: string
  balance: number
  type: string
}

type Transaction = {
  id: string
  type: string
  sender_id: string | null
  recipient_id: string | null
  amount: number
  memo: string | null
  service_description: string | null
  job_position: string | null
  created_at: string
  sender: { display_name: string } | null
  recipient: { display_name: string } | null
}

const TYPE_LABELS: Record<string, string> = {
  sale: 'Sale',
  service_payment: 'Service Payment',
  wage_payment: 'Wage Payment',
  vc_investment: 'VC Investment',
  loan_disbursement: 'Loan Disbursement',
  loan_repayment: 'Loan Repayment',
  admin_correction: 'Admin Correction',
}

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (id) loadAccount() }, [id])

  async function loadAccount() {
    const [{ data: acc }, { data: txns }] = await Promise.all([
      supabase.from('accounts').select('*').eq('id', id).single(),
      supabase
        .from('transactions')
        .select(`*, sender:sender_id(display_name), recipient:recipient_id(display_name)`)
        .or(`sender_id.eq.${id},recipient_id.eq.${id}`)
        .order('created_at', { ascending: false }),
    ])

    if (!acc) { router.push('/court'); return }
    setAccount(acc)
    setTransactions(txns || [])
    setLoading(false)
  }

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
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/court"
              className="text-gray-500 hover:text-white text-sm transition-colors"
            >
              ← Court View
            </Link>
            <span className="text-gray-700">|</span>
            <div>
              <h1 className="text-white font-bold">{account?.display_name}</h1>
              <p className="text-gray-500 text-xs capitalize">{account?.type} · {account?.email}</p>
            </div>
          </div>
          <div className={`text-2xl font-bold ${(account?.balance ?? 0) < 0 ? 'text-red-400' : 'text-green-400'}`}>
            {Number(account?.balance).toFixed(2)} ᗫ
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">
            All Transactions
          </h2>
          <p className="text-gray-500 text-sm">
            {transactions.length} total
          </p>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">No transactions for this account.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map(tx => {
              const isIncoming = tx.recipient_id === id
              const otherParty = isIncoming
                ? tx.sender?.display_name
                : tx.recipient?.display_name
              const label = tx.type === 'sale'
                ? (isIncoming ? 'Sale' : 'Purchase')
                : tx.type === 'wage_payment'
                ? (isIncoming ? 'Wage Received' : 'Wage Paid')
                : TYPE_LABELS[tx.type] || tx.type

              return (
                <div
                  key={tx.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-white font-medium text-sm">{label}</p>
                    {otherParty && (
                      <p className="text-gray-400 text-xs mt-0.5">
                        {isIncoming ? 'from' : 'to'} {otherParty}
                      </p>
                    )}
                    {tx.service_description && (
                      <p className="text-gray-500 text-xs mt-0.5">{tx.service_description}</p>
                    )}
                    {tx.job_position && (
                      <p className="text-gray-500 text-xs mt-0.5">{tx.job_position}</p>
                    )}
                    {tx.memo && (
                      <p className="text-gray-500 text-xs mt-0.5 italic">"{tx.memo}"</p>
                    )}
                    <p className="text-gray-600 text-xs mt-1">
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                  <p className={`text-lg font-bold ${isIncoming ? 'text-green-400' : 'text-red-400'}`}>
                    {isIncoming ? '+' : '−'}{tx.amount.toFixed(2)} ᗫ
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