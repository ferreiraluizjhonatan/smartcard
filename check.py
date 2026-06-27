import os
import requests
from dotenv import load_dotenv

load_dotenv('.env')

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Range': '0-0'
}

# Get elevator 208839 id
r = requests.get(f'{SUPABASE_URL}/rest/v1/elevators?equipment_id=eq.208839&select=id,status', headers=headers)
e208 = r.json()[0]
e_id = e208['id']

# Get counts
headers['Prefer'] = 'count=exact'

r_pre = requests.get(f'{SUPABASE_URL}/rest/v1/pre_installation_checklists?elevator_id=eq.{e_id}', headers=headers)
c_pre = r_pre.headers.get('content-range').split('/')[1]

r_asm = requests.get(f'{SUPABASE_URL}/rest/v1/assembly_checklists?elevator_id=eq.{e_id}', headers=headers)
c_asm = r_asm.headers.get('content-range').split('/')[1]

r_adj = requests.get(f'{SUPABASE_URL}/rest/v1/adjustment_checklists?elevator_id=eq.{e_id}', headers=headers)
c_adj = r_adj.headers.get('content-range').split('/')[1]

print(f"208839: pre: {c_pre}, assembly: {c_asm}, adjust: {c_adj}, status: {e208['status']}")
