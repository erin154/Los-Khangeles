# Testing Checklist

- [X] Sign up Alice (alice@test.com) - FAILED (500 Error, supabaseUrl required)
- [ ] Verify Alice redirected to Dashboard
- [ ] Log out Alice
- [X] Sign up Bob (bob@test.com) - FAILED (500 Error, supabaseUrl required)
- [ ] Verify Bob's balance is 0.00
- [ ] Bob attempts to send 10.00 to Alice
- [ ] Verify Bob's transaction result (Success/Failure)
- [X] Verify Alice and Bob are listed in /court - Empty (0 users)
- [X] Report findings

## Observations
- Alice and Bob sign-ups failed with 500 Internal Server Error.
- Court page shows 0 users and "0.00 Total Debt".
- Direct access to `/dashboard` revealed the root cause: **"Runtime Error: supabaseUrl is required."** in `lib/supabase.js`.
- The environment variables (SUPABASE_URL, SUPABASE_ANON_KEY) are either missing or not correctly loaded into the Next.js process.
- All subsequent tests (transactions, balance checks) are blocked by this configuration issue.