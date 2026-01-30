# Template Extraction Plan

## Status: IN PROGRESS

Extracting template HTML generation functions from `app/api/reports/generate-pdf/route.ts` (5000+ lines) to `src/services/templateHTMLGenerator.ts`.

## Functions to Extract

1. ✅ `generateTemplate1OLevelHTML` - O-Level template (lines 714-1223)
2. ✅ `generateTemplate2KasoziHTML` - Primary Nursery/Middle/Top (lines 1225-1910)
3. ✅ `generateTemplate3KyoteraHTML` - Primary Lower Section (lines 2966-3493)
4. ⚠️ `generateTemplate4UpperSectionHTML` - NOT FOUND (likely alias for generatePrimaryReportHTML or generateTemplate3KyoteraHTML)
5. ✅ `generateTemplateNurseryCindrelinahHTML` - Nursery template (lines 1912-2964)
6. ✅ `generateSecondaryReportHTML` - Secondary template (lines 3938-4306)
7. ✅ `generatePrimaryReportHTML` - Primary template (lines 4308-4675) - Likely Template 4
8. ✅ `generateOLevelReportHTML` - O-Level alternative (lines 3495-3936)

## Helper Functions to Extract

1. ✅ `lightenColor` - Color utility (line 4678)
2. ✅ `generateProfessionalHeaderHTML` - Header generator (line 4692)
3. ✅ `loadNurseryAutoComments` - Nursery comments loader (line 21)
4. ✅ `loadCustomTemplate` - Custom template loader (line 55)
5. ✅ `replaceTemplatePlaceholders` - Placeholder replacer (line 88)
6. ✅ `convertImageToBase64` - Image converter (line 163)
7. ✅ `isOLevelClass` - Class checker (line 12)
8. ✅ `resolveNurseryPerformanceValue` - Nursery performance resolver (line 5032)
9. ✅ `getReadableTextColor` - Text color utility (line 5045)
10. ✅ `applyAlphaToHex` - Alpha utility (line 5059)

## Constants to Extract

1. ✅ `NURSERY_PERFORMANCE_OPTIONS` - Performance options (line 4761)
2. ✅ `NURSERY_PERFORMANCE_COLOR_MAP` - Color map (line 4774)
3. ✅ `NURSERY_PERFORMANCE_NORMALIZED_MAP` - Normalized map (line 4779)
4. ✅ `NURSERY_SKILL_GRID` - Skill grid (line 4803)

## Next Steps

1. Create comprehensive `templateHTMLGenerator.ts` with all functions
2. Remove calculation logic, keep presentation only
3. Ensure all data comes from pre-calculated reportData
4. Update `templateRenderer.ts` to use extracted functions
5. Test template rendering

## Notes

- Template 4 (`generateTemplate4UpperSectionHTML`) is referenced but not found. It's likely an alias for `generatePrimaryReportHTML` or uses `generateTemplate3KyoteraHTML` with different parameters.
- All template functions use `reportData` which will be pre-calculated in our new system
- Minimal changes needed - mostly just ensuring data comes from reportData.summary (pre-calculated)




