'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import { getTransactionHistory } from '@/app/actions'

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

const FILTERS = ['All', 'sale', 'service_payment', 'wage_payment',
  'vc_investment', 'loan_disbursement', 'loan_repayment', 'admin_correction']

export default function HistoryPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [accountId, setAccountId] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filtered, setFiltered] = useState<Transaction[]>([])
  const [activeFilter, setActiveFilter] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadHistory() }, [])

  useEffect(() => {
    if (activeFilter === 'All') {
      setFiltered(transactions)
    } else {
      setFiltered(transactions.filter(t => t.type === activeFilter))
    }
  }, [activeFilter, transactions])

  async function loadHistory() {
    try {
      const { account, transactions: data } = await getTransactionHistory()
      setDisplayName(`${account.display_name} · ${account.type}`)
      setAccountId(account.id)
      setTransactions(data || [])
      setFiltered(data || [])
      setLoading(false)
    } catch (err) {
      router.push('/')
    }
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
      <Nav displayName={displayName} />

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-6">Transaction History</h1>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeFilter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {f === 'All' ? 'All' : TYPE_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Transaction Count */}
        <p className="text-gray-500 text-sm mb-4">
          {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
        </p>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">No transactions found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(tx => {
              const isIncoming = tx.recipient_id === accountId
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