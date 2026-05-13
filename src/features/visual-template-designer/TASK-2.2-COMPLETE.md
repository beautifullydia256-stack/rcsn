# Task 2.2 Complete: Property Test for Domain Model Type Safety

## Task Summary

**Task:** 2.2 Write property test for domain model type safety  
**Property:** Template JSON round-trip preservation  
**Validates:** Requirements 8.11, 9.5  
**Status:** ✅ COMPLETE

## Property Definition

**Property 1: Template JSON Round-Trip Preservation**

For any valid Template object, serializing to Template JSON then deserializing back to a Template object SHALL produce an equivalent Template with the same structure, components, and properties.

## Implementation Details

### File Created
- `src/features/visual-template-designer/__tests__/property/template-roundtrip.property.test.ts`

### Test Coverage

The property test suite includes 4 comprehensive tests:

1. **Main Round-Trip Test**: Validates that any Template object can be serialized to JSON and deserialized back to an equivalent Template
2. **JSON Validity Test**: Ensures all generated JSON is valid and parseable
3. **Required Fields Test**: Verifies all required template fields are preserved through serialization
4. **Component Properties Test**: Validates that all component properties are preserved through the round-trip

### Arbitraries (Generators) Implemented

Created fast-check arbitraries for all domain types:

#### Enums
- `arbTemplateCategory` - All 7 template categories
- `arbPageSize` - A4, LETTER, LEGAL, CUSTOM
- `arbPageOrientation` - portrait, landscape
- `arbComponentType` - All 33 component types (School Info, Student Info, Academic, Financial, Static)
- `arbUnit` - px, mm, in
- `arbTextAlignment` - left, center, right, justify
- `arbImageFit` - contain, cover, fill, scale-down
- `arbFontWeight` - normal, bold
- `arbFontStyle` - normal, italic
- `arbBorderStyle` - solid, dashed, dotted

#### Colors
- `arbHexColor` - Valid hex colors (#000000 to #FFFFFF)
- `arbRgbColor` - Valid RGB colors (rgb(0-255, 0-255, 0-255))
- `arbColor` - Either hex or RGB format

#### Layout Properties
- `arbPosition` - x, y coordinates with unit
- `arbSize` - width, height with unit and optional aspect ratio lock
- `arbFontProperties` - Font family, size (6-72pt), weight, style
- `arbColorProperties` - Text and background colors
- `arbBorderProperties` - Width (0-20px), color, style
- `arbSpacingProperties` - Padding and margin (0-50px)
- `arbLayoutProperties` - Complete layout with all properties

#### Components
- `arbDataBinding` - Field, formatter, fallback
- `arbResultsTableStyle` - Table-specific styling properties
- `arbTemplateComponent` - Complete component with conditional dataBinding
- `arbTemplatePage` - Page with 0-20 components
- `arbTemplate` - Complete template with 1-10 pages

### Validation Strategy

The test implements deep equality checking with:

- **Floating-point tolerance**: Numbers compared with epsilon (1e-10) for precision
- **Date handling**: Dates converted to ISO strings for comparison
- **Recursive comparison**: Deep comparison of nested structures (pages, components, layout properties)
- **Optional field handling**: Proper handling of undefined vs null values

### Test Configuration

- **Iterations**: 100 runs per test (as specified in design document)
- **Test Framework**: Vitest with fast-check 4.7.0
- **Configuration**: Uses shared `propertyTestParams()` from fast-check.config.ts

## Test Results

```
✓ Property 1: Template JSON Round-Trip Preservation (4 tests)
  ✓ should preserve template structure through JSON serialization round-trip (412ms)
  ✓ should produce valid JSON that can be parsed (304ms)
  ✓ should preserve all required template fields
  ✓ should preserve all component properties through round-trip (563ms)

Test Files: 1 passed (1)
Tests: 4 passed (4)
Duration: 1.55s
```

All tests passed with 100 iterations each, validating the property across 400+ randomly generated Template objects.

## Requirements Validated

### Requirement 8.11
> THE Template_Designer SHALL parse Template_JSON and reconstruct the Canvas state

**Validation**: The round-trip test ensures that Template objects can be serialized to JSON and reconstructed without data loss, which is fundamental to parsing and reconstructing canvas state.

### Requirement 9.5
> FOR ALL valid Template objects, parsing then printing then parsing SHALL produce an equivalent Template object (round-trip property)

**Validation**: This is the exact property tested - serialization followed by deserialization produces an equivalent Template object.

## Key Design Decisions

1. **Smart Generators**: Arbitraries constrain values to valid ranges (font size 6-72pt, border width 0-20px, etc.) as per requirements
2. **Conditional DataBinding**: Static components don't have dataBinding, while dynamic components optionally do
3. **Date Handling**: Explicit conversion of date strings back to Date objects during deserialization
4. **Floating-Point Comparison**: Uses epsilon-based comparison for numeric values to handle JSON serialization precision
5. **Comprehensive Coverage**: Tests not just the main property but also JSON validity, field preservation, and component integrity

## Next Steps

This task validates the domain model type safety. The next tasks will:

- **Task 2.3**: Create Zod validation schemas for runtime validation
- **Task 2.4**: Write property test for layout property range validation
- **Task 2.5**: Implement actual Template JSON parser and pretty printer
- **Task 2.6**: Write property test for JSON round-trip consistency with the parser/printer

## Notes

- The test currently uses basic `JSON.stringify` and `JSON.parse` for serialization
- Task 2.5 will implement proper parser and pretty printer with Zod validation
- The arbitraries created here can be reused for other property tests
- All tests follow the design document's requirement for minimum 100 iterations
