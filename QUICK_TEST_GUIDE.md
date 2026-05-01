# Quick Test Guide - RBAC Fix

## 🎯 Primary Test: Admin Access

**Login as Admin**, then navigate to:

| URL | Expected Result | Status |
|-----|----------------|--------|
| `/dashboard/teacher` | ✅ Access granted | Test this |
| `/dashboard/accountant` | ✅ Access granted | Test this |
| `/dashboard/head-teacher` | ✅ Access granted | Test this |
| `/dashboard/owner` | ❌ Redirect to `/dashboard/admin` | Test this |

## 🔍 What to Look For

### ✅ Success Indicators:
- Admin can view Teacher dashboard content
- Admin can view Accountant dashboard content
- Admin can view Head Teacher dashboard content
- Admin is redirected from Owner dashboard
- No redirect loops
- Sidebar links work correctly

### ❌ Failure Indicators:
- "Access Denied" or blank pages
- Infinite redirect loops
- Console errors
- 404 errors

## 📊 Console Logs

Open browser console (F12) and look for:

```
[RBAC TeacherLayout] { ..., result: 'ALLOW' }
[RBAC AccountantLayout] { ..., result: 'ALLOW' }
[RBAC HeadTeacherLayout] { ..., result: 'ALLOW' }
[RBAC OwnerDashboardLayout] { ..., result: 'DENY' }
[RBAC] Redirecting non-owner (admin) from owner dashboard to /dashboard/admin
```

## 🧪 Quick Test Script

1. **Login as Admin**
2. **Open Console** (F12)
3. **Navigate to each URL** and check:
   - Page loads correctly
   - No errors in console
   - Correct RBAC log appears

## 🐛 Troubleshooting

### Problem: Admin can't access Teacher dashboard
**Check**:
- Console logs show `result: 'DENY'`?
- Role in database is exactly `'admin'` (lowercase)?
- No TypeScript errors in console?

### Problem: Redirect loop
**Check**:
- Multiple RBAC logs repeating?
- Check if role is null or undefined
- Verify `public.users.role` has correct value

### Problem: Owner dashboard not blocking admin
**Check**:
- OwnerDashboardLayout guard is active?
- Console shows DENY decision?
- Redirect is happening?

## ✅ Acceptance Criteria

All must pass:

- [ ] Admin → Teacher dashboard = ✅ Works
- [ ] Admin → Accountant dashboard = ✅ Works  
- [ ] Admin → Head Teacher dashboard = ✅ Works
- [ ] Admin → Owner dashboard = ❌ Blocked (redirected)
- [ ] Owner → Owner dashboard = ✅ Works
- [ ] No redirect loops
- [ ] Sidebar navigation works
- [ ] Page refresh maintains access

## 📞 Report Results

After testing, report:
1. ✅ All tests passed
2. ❌ Which test failed
3. 📋 Console logs (if failed)
4. 🖼️ Screenshot (if helpful)

## 🔧 Files to Check if Issues

1. `src/lib/rbac.ts` - RBAC module
2. `src/components/layout/OwnerDashboardLayout.tsx` - Owner guard
3. `src/components/layout/HeadTeacherLayout.tsx` - Head Teacher guard
4. `src/pages/teacher/TeacherLayout.tsx` - Teacher guard
5. `src/pages/accountant/AccountantLayout.tsx` - Accountant guard

## 🎉 Success!

If all tests pass:
1. Debug logging can be removed (optional)
2. Implementation is complete
3. Ready for production

---

**Estimated Test Time**: 5 minutes
**Risk Level**: Low
**Rollback**: Easy (revert commits)
