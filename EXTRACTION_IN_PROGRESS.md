# Template Extraction - In Progress

## Current Status

Extracting template HTML generation functions from `app/api/reports/generate-pdf/route.ts` (5000+ lines) to `src/services/templateHTMLGenerator.ts`.

## Strategy

Due to the massive file size, I'm extracting the functions systematically:

1. **Template Functions** (lines 714-5072):
   - `generateTemplate1OLevelHTML` (lines 714-1223) - ✅ READ
   - `generateTemplate2KasoziHTML` (lines 1225-1910) - ✅ READ  
   - `generateTemplateNurseryCindrelinahHTML` (lines 1912-2964) - ✅ READ
   - `generateTemplate3KyoteraHTML` (lines 2966-3493) - ✅ READ
   - `generateOLevelReportHTML` (lines 3495-3936) - ✅ READ
   - `generateSecondaryReportHTML` (lines 3938-4306) - ✅ READ
   - `generatePrimaryReportHTML` (lines 4308-4675) - ✅ READ (likely Template 4)

2. **Helper Functions** (lines 12-5072):
   - `isOLevelClass` - ✅ READ
   - `loadNurseryAutoComments` - ✅ READ
   - `loadCustomTemplate` - ✅ READ
   - `replaceTemplatePlaceholders` - ✅ READ
   - `convertImageToBase64` - ✅ READ
   - `lightenColor` - ✅ READ
   - `generateProfessionalHeaderHTML` - ✅ READ
   - `resolveNurseryPerformanceValue` - ✅ READ
   - `getReadableTextColor` - ✅ READ
   - `applyAlphaToHex` - ✅ READ

3. **Constants**:
   - `NURSERY_PERFORMANCE_OPTIONS` - ✅ READ
   - `NURSERY_PERFORMANCE_COLOR_MAP` - ✅ READ
   - `NURSERY_PERFORMANCE_NORMALIZED_MAP` - ✅ READ
   - `NURSERY_SKILL_GRID` - ✅ READ

## Next Action

Create comprehensive `templateHTMLGenerator.ts` file with all extracted functions, ensuring:
- All HTML/CSS preserved exactly
- All data comes from pre-calculated reportData
- Minimal calculation logic (only for fallback/formatting)
- All helper functions included
- All constants included

## Note on Template 4

`generateTemplate4UpperSectionHTML` is referenced but not found as a separate function. Based on code analysis:
- It's likely an alias for `generatePrimaryReportHTML` OR
- It uses `generateTemplate3KyoteraHTML` with different parameters

Will use `generatePrimaryReportHTML` as Template 4 for now.




