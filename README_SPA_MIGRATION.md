# PwezaCore SPA Migration Guide

## Overview

This document describes the migration from Next.js to a desktop-class Single Page Application (SPA) with Liquid Glass UI and Arbor MIS-style report generation.

## Architecture Changes

### From Next.js to Vite + React Router

- **Framework**: Next.js 16 → Vite 5 + React Router 6
- **Routing**: Server-side routing → Client-side routing
- **Build**: Next.js build → Vite build
- **State**: Server components → Client components only

## Key Features

### 1. Liquid Glass UI System
- iOS 26 design parity
- Backdrop blur effects
- Translucent panels
- Layered depth system
- Desktop-optimized interactions

### 2. Snapshot-Based Report Generation
- Arbor MIS-style architecture
- Frozen data snapshots
- Bulk generation
- Cached outputs
- PDF-only (DOCX removed)

### 3. Desktop-Class SPA
- No page reloads
- Instant navigation
- Persistent state
- Desktop-optimized layouts

## Project Structure

```
pwezacore/
├── src/                          # SPA source
│   ├── pages/                    # Page components
│   ├── components/                # UI components
│   │   ├── Glass/                # Liquid Glass components
│   │   └── layout/               # Layout components
│   ├── services/                  # Business logic
│   │   ├── snapshotService.ts
│   │   ├── reportGenerator.ts
│   │   └── reportCache.ts
│   ├── templates/                # PRESERVED templates
│   │   ├── primary/
│   │   └── secondary/
│   ├── lib/                      # Utilities
│   │   └── reportUtils.ts        # PRESERVED
│   └── styles/                   # Liquid Glass CSS
├── api-server/                   # Separate PDF server
│   ├── src/
│   │   ├── routes/pdf.ts
│   │   └── services/puppeteerService.ts
│   └── package.json
├── supabase/
│   ├── functions/                 # Edge Functions
│   └── migrations/               # Database migrations
├── vite.config.ts
├── index.html
└── package.json
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Run Database Migration

```bash
# Run the snapshot tables migration
psql -h your_db_host -U postgres -d your_db -f supabase/migrations/create_report_snapshots.sql
```

### 4. Start Development Server

```bash
npm run dev
```

### 5. Start PDF API Server (separate terminal)

```bash
cd api-server
npm install
npm run dev
```

## Report Generation Flow

1. **Create Snapshot**: Lock exam results at a point in time
2. **Freeze Data**: Copy all relevant data to `report_snapshot_data`
3. **Bulk Generate**: Process all students in batches
4. **Cache Results**: Store in `generated_reports` table
5. **Generate PDF**: Use cached data for instant PDF generation

## Preserved Templates

All existing templates are preserved exactly:
- `src/templates/primary/index.ts` - NO CHANGES
- `src/templates/secondary/index.ts` - NO CHANGES
- `src/templates/primary/nurseryPerformance.ts` - NO CHANGES
- `src/lib/reportUtils.ts` - NO CHANGES

Template functions are used identically in the new system.

## Migration Checklist

- [x] Vite configuration
- [x] React Router setup
- [x] Liquid Glass UI system
- [x] Snapshot database tables
- [x] Snapshot services
- [x] Report generation services
- [x] PDF API server structure
- [ ] Migrate all dashboard pages
- [ ] Migrate all API routes to Edge Functions
- [ ] Update authentication flow
- [ ] Test report generation
- [ ] Performance optimization

## Performance Targets

- Single report: < 1 second (from cache)
- 300 reports: < 15 seconds
- 1000 reports: < 60 seconds

## Notes

- DOCX generation has been removed (PDF only)
- All templates remain unchanged
- Report output is identical to previous version
- Desktop-class UI with Liquid Glass design




