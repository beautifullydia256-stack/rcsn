"""Check _private schema ACL via pg_namespace."""
import urllib.request, json, ssl

pat = 'sbp_9066003bbff9ca579ed6e421b9c949ea26951980'
ref = 'ibnyclqobbrnjyxbbfsg'
url = f'https://api.supabase.com/v1/projects/{ref}/database/query'
ctx = ssl.create_default_context()

def run_sql(sql, label=''):
    body = json.dumps({'query': sql}).encode()
    req = urllib.request.Request(url, data=body, method='POST', headers={
        'Authorization': f'Bearer {pat}',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
    })
    with urllib.request.urlopen(req, timeout=30, context=ctx) as r:
        data = json.loads(r.read())
        return data

# Check pg_namespace ACL directly
print('=== pg_namespace ACL for _private ===')
rows = run_sql("""
SELECT nspname, nspacl::text
FROM pg_namespace
WHERE nspname = '_private';
""")
for r in rows or []:
    print(f"  schema: {r.get('nspname')}  acl: {r.get('nspacl')}")

# Also verify we can do a simple anon-callable test by checking
# if anon has EXECUTE on the _private functions
print('\n=== Can anon call _private functions? ===')
rows2 = run_sql("""
SELECT routine_name, grantee
FROM information_schema.role_routine_grants
WHERE specific_schema = '_private' AND grantee = 'anon'
ORDER BY routine_name;
""")
if not rows2:
    print('  anon has NO grants on _private functions (good)')
else:
    for r in rows2:
        print(f"  anon can call: _private.{r.get('routine_name')}")

# Verify the complete picture for authenticated role for _private schema
print('\n=== Has_schema_privilege for authenticated on _private ===')
rows3 = run_sql("""
SELECT has_schema_privilege('authenticated', '_private', 'USAGE') as has_usage;
""")
for r in rows3 or []:
    print(f"  authenticated has USAGE on _private: {r.get('has_usage')}")

# Check if the public wrappers work — simulate what RLS does
print('\n=== Test: can we call the public wrapper? ===')
rows4 = run_sql("""
SELECT has_function_privilege('authenticated', 'public.current_user_school_id()', 'EXECUTE') as can_call;
""")
for r in rows4 or []:
    print(f"  authenticated can EXECUTE public.current_user_school_id(): {r.get('can_call')}")

rows5 = run_sql("""
SELECT has_function_privilege('authenticated', '_private.current_user_school_id()', 'EXECUTE') as can_call;
""")
for r in rows5 or []:
    print(f"  authenticated can EXECUTE _private.current_user_school_id(): {r.get('can_call')}")

print('\nDone.')
