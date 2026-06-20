"""Fix: grant USAGE on _private schema to authenticated so RLS functions work."""
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
    try:
        with urllib.request.urlopen(req, timeout=30, context=ctx) as r:
            data = json.loads(r.read())
            print(f'  OK  {label}')
            return data
    except urllib.error.HTTPError as e:
        err = e.read()
        print(f'  ERR {label}: {err[:400]}')
        raise

# The root cause: _private schema has no USAGE granted to authenticated.
# PostgreSQL requires USAGE on the schema in addition to EXECUTE on the function.
run_sql('GRANT USAGE ON SCHEMA _private TO authenticated;', 'grant USAGE on _private to authenticated')
run_sql('GRANT USAGE ON SCHEMA _private TO service_role;', 'grant USAGE on _private to service_role')

# Verify the EXECUTE grants are still in place
PRIVATE_FUNCS = [
    '_private.current_user_school_id()',
    '_private.current_user_role()',
    '_private.current_user_can_manage_students()',
    '_private.current_user_can_manage_discipline()',
    '_private.current_user_can_access_accounting()',
    '_private.current_user_can_edit_student_uace_subjects()',
]
for fn in PRIVATE_FUNCS:
    run_sql(f'GRANT EXECUTE ON FUNCTION {fn} TO authenticated;', f're-confirm EXECUTE: {fn}')

print('\nDone. RLS functions should work again.')
