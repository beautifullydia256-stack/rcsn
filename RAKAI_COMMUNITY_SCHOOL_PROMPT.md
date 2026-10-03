# Rakai Community School of Nursing — Project Clone State & Handoff Prompt

## 1. Project Background & Current Status
This project is an exact, cleaned clone of the school management platform, dedicated solely to **Rakai Community School of Nursing**.

- **Project Location on Desktop:** `C:\Users\KIMULI TECH\Desktop\Rakai Community School of Nursing`
- **Application:** Clean Web Application only (Android app, Desktop/Electron app, primary/nursery samples, and 158+ scratch/debug files have all been completely removed).
- **Database Status:**
  - **100% of old, obsolete migrations, queries, and dead SQL files have been purged.**
  - **Live Production Schema extracted directly from the running PostgreSQL engine (0 stale disk artifacts, 0 old data).**
  - Includes:
    - **175 Tables & Columns**
    - **10 Views**
    - **338 Functions & Stored Procedures**
    - **137 Triggers**
    - **297 RLS (Row Level Security) Policies**
  - Schema files ready at:
    - `supabase/rakai_clean_live_schema.sql`
    - `supabase/migrations/20261002000000_live_production_schema.sql`

---

## 2. Immediate Roadmap
1. **Local Database & Web App Run**:
   - Apply the clean schema (`rakai_clean_live_schema.sql`) to your dedicated local or test Supabase/PostgreSQL instance.
   - Run the web app (`npm run dev`) and verify clean login and core screens.
2. **Official School Homepage (`/`)**:
   - Build the official public-facing website for **Rakai Community School of Nursing** at `/`.
   - Include school branding, nursing & midwifery courses/programs, admissions portal, clinical training highlights, announcements, and direct portal access for tutors, students, and administrators.
3. **Pruning & Customization**:
   - Remove unused SaaS platform switchers and lock context exclusively to Rakai Community School of Nursing.
4. **VPS Deployment**:
   - Deploy to the dedicated VPS when local validation is complete.
