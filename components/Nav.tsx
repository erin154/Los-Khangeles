'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Nav({ displayName }: { displayName: string }) {
  const pathname = usePathname()

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/loans', label: 'Loans' },
    { href: '/history', label: 'History' },
  ]

  function handleSignOut() {
    window.location.href = '/logout'
  }

  return (
    <header className="border-b border-gray-800 bg-gray-950 sticky top-0 z-40">
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">

        <div className="flex items-center gap-8">
          <span className="text-white font-bold text-lg tracking-tight">
            Los Khangeles
          </span>
          <nav className="flex items-center gap-1">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">{displayName}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>

      </div>
    </header>
  )
}