"""Verify the RLS function chain works and check function definitions."""
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
            return data
    except urllib.error.HTTPError as e:
        err = e.read()
        print(f'  ERR {label}: {err[:400]}')
        return None

# Check schema privileges
print('=== SCHEMA PRIVILEGES ===')
rows = run_sql("""
SELECT grantee, privilege_type
FROM information_schema.role_usage_grants
WHERE object_name = '_private' AND object_type = 'SCHEMA'
ORDER BY grantee;
""", 'schema privileges')
for r in rows or []:
    print(f"  {r.get('grantee', '?')} -> {r.get('privilege_type', '?')}")

# Check function privileges for _private functions
print('\n=== _PRIVATE FUNCTION PRIVILEGES ===')
rows2 = run_sql("""
SELECT routine_name, grantee, privilege_type
FROM information_schema.role_routine_grants
WHERE specific_schema = '_private'
ORDER BY routine_name, grantee;
""", 'function privileges')
for r in rows2 or []:
    print(f"  {r.get('routine_name', '?')} | {r.get('grantee', '?')} | {r.get('privilege_type', '?')}")

# Check public wrapper function security type
print('\n=== PUBLIC WRAPPER FUNCTIONS (security) ===')
rows3 = run_sql("""
SELECT p.proname, p.prosecdef,
       CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'current_user_school_id','current_user_role',
    'current_user_can_manage_students','current_user_can_manage_discipline',
    'current_user_can_access_accounting','current_user_can_edit_student_uace_subjects'
  )
ORDER BY p.proname;
""", 'public function security')
for r in rows3 or []:
    print(f"  public.{r.get('proname', '?')} -> {r.get('security_type', '?')}")

# Check _private function security type
print('\n=== _PRIVATE FUNCTIONS (security) ===')
rows4 = run_sql("""
SELECT p.proname,
       CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = '_private'
ORDER BY p.proname;
""", '_private function security')
for r in rows4 or []:
    print(f"  _private.{r.get('proname', '?')} -> {r.get('security_type', '?')}")

# Check public function ACLs
print('\n=== PUBLIC FUNCTION ACLs (who can call) ===')
rows5 = run_sql("""
SELECT p.proname, p.proacl::text
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'current_user_school_id','current_user_role',
    'current_user_can_manage_students','current_user_can_manage_discipline',
    'current_user_can_access_accounting','current_user_can_edit_student_uace_subjects'
  )
ORDER BY p.proname;
""", 'public function ACLs')
for r in rows5 or []:
    print(f"  public.{r.get('proname', '?')} ACL: {r.get('proacl', '?')}")

print('\nDone.')
