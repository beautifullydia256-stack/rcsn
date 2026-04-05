# Issue: Record Payment dialog loops / reopens — accountant outstanding page

**Status:** **Done** (verified production 2026-04-06)  
**Last updated:** 2026-04-08  

## Summary

On the **accountant** **Outstanding** page, opening **Record payment** triggers a **severe UI glitch**: the **Record payment** modal (or equivalent prompt) **will not stay closed**. The user can **Cancel**, click close, or complete the flow (success or failure)—the dialog **reopens by itself**, repeatedly. The only escape reported is **closing the browser** (e.g. Chrome); otherwise the UI keeps cycling open.

## Where it happens

- **URL:** `https://www.pwezacore.com/dashboard/accountant/outstanding`  
- **Trigger:** User clicks **Record payment** from **this** page (problem is tied to this entry point per report).

## Actual behavior

1. User opens **Record payment**.
2. User tries to **dismiss** (Cancel, X, overlay, etc.) or **finish** recording.
3. Dialog **closes briefly** or appears to dismiss, then **opens again**—**automatically**, as if re-triggered in a loop.
4. Repeats many times; user cannot navigate away or use the page normally.

## Expected behavior

- Dialog opens **once** per explicit user action.
- On **Cancel** or successful **close**, dialog **stays closed** until the user opens it again.
- No **tight loop** of `open` state, duplicate event handlers, or `useEffect` re-firing without stable dependencies.

## Related data issue (same stakeholder thread)

- **New student** fee/invoice assigned to **Term 3** while school is in **Term 1** causes “outstanding in the future” nonsense. This is documented under **[03-dashboard-vs-outstanding-term-invoice-mismatch](./03-dashboard-vs-outstanding-term-invoice-mismatch.md)**; fixing term placement may reduce confusing states on this page but **does not replace** fixing the **modal loop** (separate bug).

## Notes for later investigation (not validated)

- Suspects: unstable **React state** or **key** remounting modal; **useEffect** that sets `open: true` on every render or when parent re-fetches; duplicate **click** propagation opening twice; **router/search param** driving open state in a loop; **focus trap** or library bug.

## Source

Stakeholder description, 2026-04-03.
