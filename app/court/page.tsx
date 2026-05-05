'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Account = {
  id: string
  display_name: string
  email: string
  balance: number
  type: string
}

type LoanBalance = {
  account_id: string
  display_name: string
  account_type: string
  principal_outstanding: number
  interest_accrued: number
  total_owed: number
}

type Tab = 'individuals' | 'corporations' | 'loans'

export default function CourtView() {
  const [tab, setTab] = useState<Tab>('individuals')
  const [individuals, setIndividuals] = useState<Account[]>([])
  const [corporations, setCorporations] = useState<Account[]>([])
  const [loans, setLoans] = useState<LoanBalance[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadData() {
    const [{ data: indiv }, { data: corps }, { data: loanData }] = await Promise.all([
      supabase
        .from('accounts')
        .select('*')
        .eq('type', 'individual')
        .eq('is_active', true)
        .order('balance', { ascending: false }),
      supabase
        .from('accounts')
        .select('*')
        .eq('type', 'corporate')
        .eq('is_active', true)
        .order('balance', { ascending: false }),
      supabase
        .from('loan_balances')
        .select('*')
        .order('total_owed', { ascending: false }),
    ])

    setIndividuals(indiv || [])
    setCorporations(corps || [])
    setLoans(loanData || [])
    setLastRefresh(new Date())
    setLoading(false)
  }

  const filteredIndividuals = individuals.filter(a =>
    a.display_name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  )
  const filteredCorporations = corporations.filter(a =>
    a.display_name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  )
  const filteredLoans = loans.filter(a =>
    a.display_name.toLowerCase().includes(search.toLowerCase())
  )

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'individuals', label: 'Individuals', count: filteredIndividuals.length },
    { key: 'corporations', label: 'Corporations', count: filteredCorporations.length },
    { key: 'loans', label: 'Loans', count: filteredLoans.length },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Loading court view...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Los Khangeles</h1>
            <p className="text-gray-500 text-xs mt-0.5">Court & Council — Read Only</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-600 text-xs">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
            <button
              onClick={loadData}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Individuals</p>
            <p className="text-3xl font-bold">{individuals.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Corporations</p>
            <p className="text-3xl font-bold">{corporations.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Total Debt</p>
            <p className="text-3xl font-bold text-red-400">
              {loans.reduce((s, l) => s + Number(l.total_owed), 0).toFixed(0)} ᗫ
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full max-w-sm px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-8 w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                tab === t.key
                  ? 'bg-white text-gray-900'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === t.key ? 'bg-gray-200 text-gray-700' : 'bg-gray-800 text-gray-500'
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Individuals Tab */}
        {tab === 'individuals' && (
          <div className="overflow-hidden rounded-2xl border border-gray-800">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-900 border-b border-gray-800">
                  <th className="text-left px-5 py-3 text-gray-400 text-xs uppercase tracking-widest font-medium">#</th>
                  <th className="text-left px-5 py-3 text-gray-400 text-xs uppercase tracking-widest font-medium">Name</th>
                  <th className="text-left px-5 py-3 text-gray-400 text-xs uppercase tracking-widest font-medium">Email</th>
                  <th className="text-right px-5 py-3 text-gray-400 text-xs uppercase tracking-widest font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredIndividuals.map((acc, i) => (
                  <tr key={acc.id} className="border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors">
                    <td className="px-5 py-3 text-gray-600 text-sm">{i + 1}</td>
                    <td className="px-5 py-3 text-sm">
                      <Link
                        href={`/court/account/${acc.id}`}
                        className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                      >
                        {acc.display_name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-sm">{acc.email}</td>
                    <td className={`px-5 py-3 text-right font-bold text-sm ${acc.balance < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {Number(acc.balance).toFixed(2)} ᗫ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Corporations Tab */}
        {tab === 'corporations' && (
          <div className="overflow-hidden rounded-2xl border border-gray-800">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-900 border-b border-gray-800">
                  <th className="text-left px-5 py-3 text-gray-400 text-xs uppercase tracking-widest font-medium">#</th>
                  <th className="text-left px-5 py-3 text-gray-400 text-xs uppercase tracking-widest font-medium">Business</th>
                  <th className="text-left px-5 py-3 text-gray-400 text-xs uppercase tracking-widest font-medium">Email</th>
                  <th className="text-right px-5 py-3 text-gray-400 text-xs uppercase tracking-widest font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredCorporations.map((acc, i) => (
                  <tr key={acc.id} className="border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors">
                    <td className="px-5 py-3 text-gray-600 text-sm">{i + 1}</td>
                    <td className="px-5 py-3 text-sm">
                      <Link
                        href={`/court/account/${acc.id}`}
                        className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                      >
                        {acc.display_name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-sm">{acc.email}</td>
                    <td className={`px-5 py-3 text-right font-bold text-sm ${acc.balance < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {Number(acc.balance).toFixed(2)} ᗫ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Loans Tab */}
        {tab === 'loans' && (
          filteredLoans.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500">No active loans.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-800">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-900 border-b border-gray-800">
                    <th className="text-left px-5 py-3 text-gray-400 text-xs uppercase tracking-widest font-medium">Account</th>
                    <th className="text-left px-5 py-3 text-gray-400 text-xs uppercase tracking-widest font-medium">Type</th>
                    <th className="text-right px-5 py-3 text-gray-400 text-xs uppercase tracking-widest font-medium">Principal</th>
                    <th className="text-right px-5 py-3 text-gray-400 text-xs uppercase tracking-widest font-medium">Interest</th>
                    <th className="text-right px-5 py-3 text-gray-400 text-xs uppercase tracking-widest font-medium">Total Owed</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLoans.map(loan => (
                    <tr key={loan.account_id} className="border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors">
                      <td className="px-5 py-3 text-sm">
                        <Link
                          href={`/court/account/${loan.account_id}`}
                          className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                          {loan.display_name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-sm capitalize">{loan.account_type}</td>
                      <td className="px-5 py-3 text-right text-red-400 font-medium text-sm">
                        {Number(loan.principal_outstanding).toFixed(2)} ᗫ
                      </td>
                      <td className="px-5 py-3 text-right text-yellow-400 font-medium text-sm">
                        {Number(loan.interest_accrued).toFixed(2)} ᗫ
                      </td>
                      <td className="px-5 py-3 text-right text-white font-bold text-sm">
                        {Number(loan.total_owed).toFixed(2)} ᗫ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

      </main>
    </div>
  )
}