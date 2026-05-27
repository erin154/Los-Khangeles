# Los Khangeles — City Financial Platform
 
A full-stack web application that powers the economy of a student-run city simulation. Built to handle real-time financial transactions, multi-tier account management, and lending for an entire two-week immersive learning experience involving an entire high school.

**Link**: [los-khangeles.vercel.app](https://los-khangeles.vercel.app/)
 
## Overview
 
Los Khangeles is a school-wide simulation in which students launch businesses, earn and spend a shared currency (doubloons), and operate a functioning micro-economy. This platform serves as the city's central bank and ledger — every sale, wage payment, venture-capital investment, and government loan flows through it.
 
The system supports three account types (individual, corporate, and government), each with tailored permissions, and gives the student-run City Council a real-time, read-only oversight dashboard to monitor balances, audit transaction histories, and track outstanding loans across the city.
 
## Key Features
 
- **Multi-tier account system** — Individual, corporate, and government (can only be created in backend) accounts with distinct capabilities and permission boundaries.
- **Seven transaction types** — Sales, service payments, wage payments, VC investments, loan disbursements, loan repayments, and administrative corrections, each with type-specific metadata.
- **Real-time balance tracking** — Database triggers update sender and recipient balances automatically on every transaction, with a hard-enforced debt floor of −50 doubloons.
- **Government lending system** — Loan disbursement and repayment flows with live principal calculation, manual interest tracking, and per-borrower loan histories.
- **Court & Council oversight view** — A public, read-only dashboard with tabbed views of all individuals, corporations, and loans, full-text search, and drill-down pages showing any account's complete transaction or loan history.
  - City Council Dashboard: [los-khangeles.vercel.app/court](https://los-khangeles.vercel.app/court)
- **Security-hardened data layer** — Row Level Security policies, column-level permission revocation to prevent client-side balance tampering, and `SECURITY DEFINER` triggers that enforce business logic server-side rather than trusting the client.
- **Automatic transaction reversal** — Deleting a transaction automatically reverses its balance effects, giving administrators a clean audit-and-correct workflow.
## Tech Stack
 
**Frontend**
- Next.js 16 (App Router)
- React
- TypeScript
- Tailwind CSS
**Backend & Database**
- Supabase (PostgreSQL)
- Supabase Auth (email/password authentication)
- PostgreSQL triggers & functions (PL/pgSQL) for balance logic, validation, and reversal
- Row Level Security (RLS) for access control
**Infrastructure & Tooling**
- Vercel (hosting & continuous deployment)
- Git & GitHub (version control)
