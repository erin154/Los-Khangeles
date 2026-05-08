import requests
import os
from dotenv import load_dotenv

load_dotenv('.env.local')

SUPABASE_URL = os.getenv("SUPABASE_URL")
# Assuming the attacker somehow got the old exposed anon key or a new one
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

def test_direct_access():
    print("--- Testing Direct Database Access (Should Fail) ---")
    
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
    }
    
    # 1. Try to fetch accounts
    print("Attempting to fetch accounts directly...")
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/accounts", headers=headers)
        if res.status_code == 200:
            print(f"FAILURE: Successfully fetched {len(res.json())} accounts directly!")
        else:
            print(f"SUCCESS: Blocked with status {res.status_code}")
    except Exception as e:
        print(f"SUCCESS: Error occurred: {e}")

    # 2. Try to insert transaction
    print("\nAttempting to insert transaction directly...")
    payload = {
        "type": "sale",
        "amount": 1000,
        "sender_id": "any-id",
        "recipient_id": "any-id",
        "memo": "HACKED"
    }
    try:
        res = requests.post(f"{SUPABASE_URL}/rest/v1/transactions", headers=headers, json=payload)
        if res.status_code in [200, 201]:
            print("FAILURE: Successfully inserted transaction directly!")
        else:
            print(f"SUCCESS: Blocked with status {res.status_code}")
            print(f"Response: {res.text}")
    except Exception as e:
        print(f"SUCCESS: Error occurred: {e}")

if __name__ == "__main__":
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        print("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.local")
    else:
        test_direct_access()
