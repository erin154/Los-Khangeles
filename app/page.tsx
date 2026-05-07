'use client'

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { getDeviceToken, type DeviceToken } from '@/lib/fingerprint'
import BanScreen from '@/components/BanScreen'

export default function LoginPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [accountType, setAccountType] = useState('individual')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [banned, setBanned] = useState(false)
  const router = useRouter()

  const tokenRef = useRef<DeviceToken | null>(null)

  useEffect(() => {
    try {
      if (localStorage.getItem('__fp_banned') === '1') { setBanned(true); return }
    } catch {}
    getDeviceToken().then(t => { tokenRef.current = t })
  }, [])

  if (banned) return <BanScreen />

  function triggerBan() {
    try { localStorage.setItem('__fp_banned', '1') } catch {}
    setBanned(true)
  }

  async function ensureToken(): Promise<DeviceToken> {
    if (tokenRef.current) return tokenRef.current
    const t = await getDeviceToken()
    tokenRef.current = t
    return t
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const token = await ensureToken()

    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, deviceToken: token.token }),
    })

    const json = await res.json()

    if (json.banned) { triggerBan(); return }
    if (json.blocked) { setError('🚨'); setLoading(false); return }

    if (!res.ok) {
      setError(json.error ?? 'Invalid email or password')
      setLoading(false)
      return
    }

    // Restore Supabase session the API route established
    if (json.session) {
      await supabase.auth.setSession(json.session)
    }

    router.push('/dashboard')
    setLoading(false)
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const token = await ensureToken()

    const res = await fetch('/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        displayName,
        accountType,
        deviceToken: token.token,
      }),
    })

    const json = await res.json()

    if (json.banned) { triggerBan(); return }
    if (json.blocked) { setError('🚨'); setLoading(false); return }

    if (!res.ok) {
      if (json.error?.includes('accounts_auth_user_id_key')) {
        setError('An account already exists for this user.')
      } else {
        setError(json.error ?? 'Signup failed')
      }
      setLoading(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError('Account created, please log in.')
      setMode('login')
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md shadow-xl border border-gray-800">

        <h1 className="text-3xl font-bold text-white mb-1">Los Khangeles</h1>
        <p className="text-gray-400 mb-8">City Financial Platform</p>

        {/* Login / Sign Up toggle */}
        <div className="flex bg-gray-800 rounded-lg p-1 mb-6">
          <button
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'login' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => { setMode('login'); setError('') }}
          >
            Log In
          </button>
          <button
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'signup' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => { setMode('signup'); setError('') }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">

          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  required
                  placeholder="Your name or business name"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Account Type
                </label>
                <select
                  value={accountType}
                  onChange={e => setAccountType(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="individual">Individual</option>
                  <option value="corporate">Corporate</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@school.edu"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <p className={`text-sm rounded-lg px-4 py-2 ${
              error === '🚨'
                ? 'text-5xl text-center bg-transparent border-0 py-4'
                : 'text-red-400 bg-red-950 border border-red-800'
            }`}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>

        </form>
      </div>
    </div>
  )
}