'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import Link from 'next/link'
import { getUserLoans } from '@/app/actions'

type LoanEntry = {
  id: string
  type: string
  amount: number
  memo: string | null
  created_at: string
}

type LoanSummary = {
  account_id: string
  display_name: string
  account_type: string
  principal_outstanding: number
  interest_accrued: number
  total_owed: number
}

export default function LoansPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [accountType, setAccountType] = useState('')
  const [principal, setPrincipal] = useState(0)
  const [interest, setInterest] = useState(0)
  const [loanHistory, setLoanHistory] = useState<LoanEntry[]>([])
  const [allLoans, setAllLoans] = useState<LoanSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoan, setHasLoan] = useState(false)

  useEffect(() => { loadLoans() }, [])

  async function loadLoans() {
    try {
      const { account, loanAccount, history, allLoans } = await getUserLoans()
      
      setDisplayName(`${account.display_name} · ${account.type}`)
      setAccountType(account.type)

      if (account.type === 'government') {
        setAllLoans(allLoans || [])
      } else {
        if (loanAccount) {
          setHasLoan(true)
          setInterest(loanAccount.interest_accrued)
        }

        const entries = history || []
        setLoanHistory(entries)

        const totalDisbursed = entries
          .filter(t => t.type === 'loan_disbursement')
          .reduce((sum, t) => sum + Number(t.amount), 0)
        const totalRepaid = entries
          .filter(t => t.type === 'loan_repayment')
          .reduce((sum, t) => sum + Number(t.amount), 0)
        setPrincipal(totalDisbursed - totalRepaid)
      }
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

  const totalOwed = principal + interest

  // ── GOVERNMENT VIEW ──────────────────────────────────────────
  if (accountType === 'government') {
    const totalDebt = allLoans.reduce((s, l) => s + Number(l.total_owed), 0)

    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Nav displayName={displayName} />
        <main className="max-w-3xl mx-auto px-6 py-10">

          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold">All Loans</h1>
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 text-center">
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Total Outstanding</p>
              <p className="text-xl font-bold text-red-400">{totalDebt.toFixed(2)} ᗫ</p>
            </div>
          </div>

          {allLoans.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
              <p className="text-gray-400 text-lg">No active loans</p>
              <p className="text-gray-600 text-sm mt-2">
                Loan disbursements will appear here once issued.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {allLoans.map(loan => (
                <Link
                  key={loan.account_id}
                  href={`/court/loan/${loan.account_id}`}
                  className="block bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-2xl px-6 py-5 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold group-hover:text-blue-400 transition-colors">
                        {loan.display_name}
                      </p>
                      <p className="text-gray-500 text-xs capitalize mt-0.5">{loan.account_type}</p>
                    </div>
                    <span className="text-gray-600 text-lg">→</span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Principal</p>
                      <p className="text-red-400 font-bold">
                        {Number(loan.principal_outstanding).toFixed(2)} ᗫ
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Interest</p>
                      <p className="text-yellow-400 font-bold">
                        {Number(loan.interest_accrued).toFixed(2)} ᗫ
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Total Owed</p>
                      <p className="text-white font-bold">
                        {Number(loan.total_owed).toFixed(2)} ᗫ
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    )
  }

  // ── REGULAR USER VIEW ─────────────────────────────────────────
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
            <div className="grid grid-cols-3 gap-4 mb-10">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
                <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Principal</p>
                <p className={`text-3xl font-bold ${principal > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {principal.toFixed(2)} ᗫ
                </p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
                <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Interest</p>
                <p className={`text-3xl font-bold ${interest > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                  {interest.toFixed(2)} ᗫ
                </p>
              </div>
              <div className="bg-gradient-to-br from-red-900 to-red-800 border border-red-700 rounded-2xl p-6 text-center">
                <p className="text-red-300 text-xs uppercase tracking-widest mb-2">Total Owed</p>
                <p className="text-3xl font-bold text-white">{totalOwed.toFixed(2)} ᗫ</p>
              </div>
            </div>

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