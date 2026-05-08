# Test Plan - Dave's Banking App Flow

- [x] Navigate to `http://localhost:3000` (Note: 3001 connection refused, using 3000)
- [ ] Sign up 'Dave' (`dave@test.com` / `Password123!` / `Individual`)
    - [X] Attempted signup
    - [X] Error: `permission denied for table accounts` (Initial observation)
- [ ] Verify Dashboard loads
- [x] Navigate to `http://localhost:3000/court` and verify Dave is listed
    - [X] Page loaded, but all counts are 0.
- [x] Navigate to `http://localhost:3000/history`
- [x] Navigate to `http://localhost:3000/loans`
    - [X] Encountered Runtime Error: `supabaseUrl is required` in `lib/supabase.js`.
- [ ] Perform a self-transaction (sale) for 1.00 with password
- [ ] Report results

## Findings
- Port 3001 is not active; port 3000 is being used.
- **Critical Error**: `supabaseUrl is required` at `lib/supabase.js:6`. This indicates that environment variables (`SUPABASE_URL`) are not correctly configured or loaded in the current environment.
- Signup for 'Dave' failed with `permission denied for table accounts`, which is likely a side effect of the misconfiguration or missing RLS/Service Role setup.
- The `/court` page is accessible but contains no data.
- Login attempt for 'Dave' confirmed account does not exist.

