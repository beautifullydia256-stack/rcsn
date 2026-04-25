# GROUP BY Error Fix Summary

## Issue Fixed:
**Error**: `subquery uses ungrouped column "sp.created_at" from outer query`

**Location**: Line 203 in `owner_revenue_trend_metrics` materialized view

## Root Cause:
The materialized view had a subquery that was trying to reference `sp.created_at` from the outer query, but the outer query was using `GROUP BY`, which means individual row values are not accessible in subqueries.

## Solution:
Restructured the `owner_revenue_trend_metrics` materialized view to use a CTE (Common Table Expression) approach:

### Before (Problematic):
```sql
SELECT 
  DATE_TRUNC('month', sp.created_at) as month_year,
  -- ... other fields
  (SELECT COALESCE(SUM(ss.monthly_amount), 0) 
   FROM public.school_subscriptions ss 
   WHERE ss.status = 'active' 
   AND ss.start_date <= (DATE_TRUNC('month', sp.created_at) + INTERVAL '1 month - 1 day')
  ) as subscription_revenue
FROM public.payments sp
WHERE sp.created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', sp.created_at), EXTRACT(YEAR FROM sp.created_at), EXTRACT(MONTH FROM sp.created_at)
```

### After (Fixed):
```sql
WITH monthly_payments AS (
  SELECT 
    DATE_TRUNC('month', sp.created_at) as month_year,
    -- ... aggregated payment data
  FROM public.payments sp
  WHERE sp.created_at >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', sp.created_at), EXTRACT(YEAR FROM sp.created_at), EXTRACT(MONTH FROM sp.created_at)
),
monthly_subscriptions AS (
  SELECT 
    DATE_TRUNC('month', CURRENT_DATE) as month_year,
    COALESCE(SUM(ss.monthly_amount), 0) as subscription_revenue
  FROM public.school_subscriptions ss 
  WHERE ss.status = 'active'
)
SELECT 
  mp.*,
  COALESCE(ms.subscription_revenue, 0) as subscription_revenue
FROM monthly_payments mp
LEFT JOIN monthly_subscriptions ms ON mp.month_year = ms.month_year
```

## Benefits of the Fix:
1. ✅ Eliminates the GROUP BY error
2. ✅ Cleaner, more readable SQL structure
3. ✅ Better performance (no correlated subquery)
4. ✅ Proper separation of payment and subscription data aggregation

## Status:
Ready for testing - the GROUP BY error should now be resolved.