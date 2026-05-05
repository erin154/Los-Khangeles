'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Account = {
  id: string
  type: string
  display_name: string
  email: string
  balance: number
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

export default function Dashboard() {
  const router = useRouter()
  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // Transaction form state
  const [txType, setTxType] = useState('sale')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [recipientSearch, setRecipientSearch] = useState('')
  const [recipientResults, setRecipientResults] = useState<Account[]>([])
  const [selectedRecipient, setSelectedRecipient] = useState<Account | null>(null)
  const [serviceDescription, setServiceDescription] = useState('')
  const [jobPosition, setJobPosition] = useState('')
  const [txLoading, setTxLoading] = useState(false)
  const [txError, setTxError] = useState('')

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }

    const { data: accountData } = await supabase
      .from('accounts')
      .select('*')
      .eq('auth_user_id', session.user.id)
      .single()

    if (!accountData) { router.push('/'); return }
    setAccount(accountData)
    await loadTransactions(accountData.id)
    setLoading(false)
  }

  async function loadTransactions(accountId: string) {
    const { data } = await supabase
      .from('transactions')
      .select(`*, sender:sender_id(display_name), recipient:recipient_id(display_name)`)
      .or(`sender_id.eq.${accountId},recipient_id.eq.${accountId}`)
      .order('created_at', { ascending: false })
      .limit(20)
    setTransactions(data || [])
  }

  async function searchRecipients(query: string) {
    if (!query) { setRecipientResults([]); return }
    const { data } = await supabase
      .from('accounts')
      .select('id, display_name, type, email')
      .ilike('display_name', `%${query}%`)
      .neq('id', account?.id)
      .limit(5)
    setRecipientResults(data || [])
  }

  async function submitTransaction() {
    if (!account) return
    setTxLoading(true)
    setTxError('')

    const amountNum = parseFloat(amount)
    if (!amountNum || amountNum <= 0) {
      setTxError('Please enter a valid amount.')
      setTxLoading(false)
      return
    }

    const txData: Record<string, unknown> = {
      type: txType,
      amount: amountNum,
      memo: memo || null,
    }

    if (txType === 'loan_repayment') {
      const { data: govAccount } = await supabase
        .from('accounts').select('id').eq('type', 'government').single()
      txData.sender_id = account.id
      txData.recipient_id = govAccount?.id
    } else {
      txData.sender_id = account.id
      txData.recipient_id = selectedRecipient?.id || null
    }

    if (txType === 'service_payment') txData.service_description = serviceDescription
    if (txType === 'wage_payment') txData.job_position = jobPosition

    const { error } = await supabase.from('transactions').insert(txData)

    if (error) {
      if (error.message.includes('BALANCE_FLOOR_EXCEEDED')) {
        setTxError('This transaction would exceed your debt limit of 50 doubloons.')
      } else if (error.message.includes('OVERPAYMENT_BLOCKED')) {
        setTxError('Repayment amount exceeds your outstanding loan balance.')
      } else {
        setTxError(error.message)
      }
    } else {
        setShowModal(false)
        resetForm()
        await new Promise(resolve => setTimeout(resolve, 400))
        await loadDashboard()
      }
    setTxLoading(false)
  }

  function resetForm() {
    setTxType('sale'); setAmount(''); setMemo('')
    setRecipientSearch(''); setRecipientResults([])
    setSelectedRecipient(null); setServiceDescription('')
    setJobPosition(''); setTxError('')
  }

  function getTransactionLabel(tx: Transaction) {
    const isIncoming = tx.recipient_id === account?.id
    const otherParty = isIncoming ? tx.sender?.display_name : tx.recipient?.display_name
    const labels: Record<string, string> = {
      sale: isIncoming ? 'Sale' : 'Purchase',
      service_payment: 'Service Payment',
      wage_payment: isIncoming ? 'Wage Received' : 'Wage Paid',
      vc_investment: 'VC Investment',
      loan_disbursement: isIncoming ? 'Loan Received' : 'Loan Disbursed',
      loan_repayment: isIncoming ? 'Loan Repayment Received' : 'Loan Repayment',
      admin_correction: 'Admin Correction',
    }
    return { label: labels[tx.type] || tx.type, otherParty, isIncoming }
  }

  function txTypeOptions() {
    const base = [
      { value: 'sale', label: 'Sale' },
      { value: 'service_payment', label: 'Service Payment' },
      { value: 'wage_payment', label: 'Wage Payment' },
      { value: 'vc_investment', label: 'VC Investment' },
      { value: 'loan_repayment', label: 'Loan Repayment' },
    ]
    if (account?.type === 'government') {
      base.push({ value: 'loan_disbursement', label: 'Loan Disbursement' })
    }
    return base
  }

  const needsRecipient = txType !== 'loan_repayment'

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
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Los Khangeles</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm capitalize">
            {account?.display_name} · {account?.type}
          </span>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            className="text-sm text-gray-500 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 mb-6 text-center shadow-xl">
          <p className="text-blue-200 text-sm font-medium uppercase tracking-widest mb-3">
            {account?.type === 'corporate' ? 'Company Balance' : 'Balance'}
          </p>
          <p className={`text-6xl font-bold mb-1 ${(account?.balance ?? 0) < 0 ? 'text-red-300' : 'text-white'}`}>
            {account?.balance?.toFixed(2)} ᗫ
          </p>
          <p className="text-blue-300 text-sm mt-1">doubloons</p>
          {(account?.balance ?? 0) < 0 && (
            <p className="text-red-300 text-xs mt-3 bg-red-900/40 rounded-lg px-4 py-2 inline-block">
              Debt limit: −50 ᗫ &nbsp;·&nbsp; {(50 + (account?.balance ?? 0)).toFixed(2)} ᗫ remaining
            </p>
          )}
        </div>

        {/* New Transaction Button */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full py-3 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors mb-10"
        >
          + New Transaction
        </button>

        {/* Recent Transactions */}
        <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No transactions yet.</p>
        ) : (
          <div className="space-y-3">
            {transactions.map(tx => {
              const { label, otherParty, isIncoming } = getTransactionLabel(tx)
              return (
                <div key={tx.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">{label}</p>
                    {otherParty && (
                      <p className="text-gray-400 text-xs mt-0.5">
                        {isIncoming ? 'from' : 'to'} {otherParty}
                      </p>
                    )}
                    {tx.memo && <p className="text-gray-500 text-xs mt-0.5 italic">"{tx.memo}"</p>}
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

      {/* New Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">New Transaction</h2>
              <button
                onClick={() => { setShowModal(false); resetForm() }}
                className="text-gray-500 hover:text-white text-2xl leading-none"
              >×</button>
            </div>

            <div className="space-y-4">

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                <select
                  value={txType}
                  onChange={e => { setTxType(e.target.value); setSelectedRecipient(null); setRecipientSearch('') }}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {txTypeOptions().map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Recipient Search */}
              {needsRecipient && (
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Recipient</label>
                  {selectedRecipient ? (
                    <div className="flex items-center justify-between bg-gray-800 border border-blue-500 rounded-lg px-4 py-2">
                      <span className="text-white text-sm">{selectedRecipient.display_name}</span>
                      <button
                        onClick={() => { setSelectedRecipient(null); setRecipientSearch('') }}
                        className="text-gray-400 hover:text-white text-sm"
                      >✕</button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={recipientSearch}
                        onChange={e => { setRecipientSearch(e.target.value); searchRecipients(e.target.value) }}
                        placeholder="Search by name..."
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                      {recipientResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg mt-1 z-10 overflow-hidden">
                          {recipientResults.map(r => (
                            <button
                              key={r.id}
                              onClick={() => { setSelectedRecipient(r); setRecipientSearch(''); setRecipientResults([]) }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white text-sm flex items-center justify-between"
                            >
                              <span>{r.display_name}</span>
                              <span className="text-gray-500 text-xs capitalize">{r.type}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Service Description */}
              {txType === 'service_payment' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Service Description</label>
                  <input
                    type="text"
                    value={serviceDescription}
                    onChange={e => setServiceDescription(e.target.value)}
                    placeholder="What service is this for?"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Job Position */}
              {txType === 'wage_payment' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Job Position</label>
                  <input
                    type="text"
                    value={jobPosition}
                    onChange={e => setJobPosition(e.target.value)}
                    placeholder="e.g. Cashier, Marketing Lead"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Amount (ᗫ)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Memo */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Memo <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={memo}
                  onChange={e => setMemo(e.target.value)}
                  placeholder="Add a note..."
                  maxLength={120}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {txError && (
                <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-2">
                  {txError}
                </p>
              )}

              <button
                onClick={submitTransaction}
                disabled={txLoading || (needsRecipient && !selectedRecipient) || !amount}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors"
              >
                {txLoading ? 'Submitting...' : 'Submit Transaction'}
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}