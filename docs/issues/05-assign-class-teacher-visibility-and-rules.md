# Issue: Assign class teacher — missing or unclear on teacher profile; UX and data rules

**Status:** Partial — UI + client rules in SPA teacher profile (verify in staging/production)  
**Last updated:** 2026-04-05  

## Implementation notes (2026-04-05)

- [`src/assets/pwezacore-teacher-profile.html`](../../src/assets/pwezacore-teacher-profile.html): hero button **Assign class teacher**; Classes tab split into **Class teacher** card (picker with occupancy labels, hint text, assign / current list + remove) and **Subject teaching** card; removed unused **Role** dropdown on subject form.
- [`src/pages/admin/teachers/DesignTeacherProfile.tsx`](../../src/pages/admin/teachers/DesignTeacherProfile.tsx): loads all `class_teachers` for the school; explains/hints per class; inserts/deletes via Supabase (DB `UNIQUE (school_id, class_name)` enforces one class teacher per class).

## Summary

On the **teacher profile**, the stakeholder does **not** see a clear way to assign someone as **class teacher**. They want a dedicated, obvious flow—ideally evolving or renaming the existing **“Assign to class”** entry point so it reads and behaves as **assign as class teacher** for a chosen class, with the correct business rules enforced and explained in the UI.

## Stakeholder goals

### Discoverability

- From **teacher profile**, user must be able to **assign this teacher as class teacher** (or see why they cannot), without hunting unclear labels.

### UX copy / structure

- Prefer wording like **“Assign class teacher”** (or equivalent) rather than a generic **“Assign to class”** if the latter is ambiguous—but **reuse or align** with existing navigation that already leads to class assignment so the flow stays familiar.
- On action: show **which class(es)** the teacher can be assigned to as **class teacher** (class picker or equivalent).

### Business rules (must be enforced)

| Rule | Description |
|------|-------------|
| **One class, one class teacher** | A given **class** may have **at most one** class teacher. Never allow two class teachers for the same class. |
| **One teacher, many classes** | The **same person** may be class teacher for **multiple** classes. |
| **Transparency** | For each class in the picker (or when selecting), the system should indicate whether that class **already has** a class teacher or **does not** yet—e.g. “This class already has a class teacher” vs “This class does not have a class teacher” (stakeholder wording: “class secret” in voice input interpreted as **this class**). |

## Expected behavior (consolidated)

1. User opens **teacher profile** → finds a clear **assign class teacher** affordance.
2. User chooses a **class** → system validates **uniqueness per class**; if the class already has a class teacher, block duplicate assignment and **explain** (unless product later defines “replace” workflow—**not** requested here; default is **one class teacher per class**).
3. System allows the same teacher to be confirmed as class teacher for **more than one class**, one at a time or via multi-select **only if** each selected class still has zero or gets a defined replace rule.

## Open points for fix plan (engineering)

- Map current **“Assign to class”** implementation to **class teacher** role/flag in schema (table/column naming in codebase).
- Ensure UI list of classes reflects **current** class-teacher occupant for messaging.
- Confirm behavior with **head teacher / admin** permissions.

## Relationship to original list

Original item: **“Failed to assign class teacher.”** Documented as **missing UI / unclear entry point** plus **explicit product rules** for assignment—not only a bug fix.

## Source

Stakeholder explanation, 2026-04-03.
