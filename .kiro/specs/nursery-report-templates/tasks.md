# Implementation Plan: Nursery Report Templates System

## Overview

This implementation plan creates 6 new nursery report card templates (Templates 7-12) for Cindrelinah Junior School. The system includes template creation, a preview system in the Teachers section, and preparation for future integration with the Add Results system. All templates are designed as empty/blank templates that can be dynamically filled with data.

## Tasks

- [x] 1. Set up nursery templates infrastructure
  - Create nursery template registry and configuration system
  - Set up TypeScript interfaces for all 6 template data structures
  - Create base HTML generator functions for each template
  - _Requirements: Template registry, data interfaces, HTML generators_

- [x] 2. Implement Template 7: Junior Nursery Report Template
  - [x] 2.1 Create Template 7 HTML generator with Forest Green theme
    - Implement generateTemplate7HTML function with proper styling
    - Create table-based layout with learning areas assessment
    - Add Forest Green (#006b4d) color scheme and double border styling
    - _Requirements: Template 7 visual specifications, data mapping_
  
  - [x] 2.2 Create Template 7 CSS styling
    - Implement responsive table layout with proper spacing
    - Add Forest Green theme colors and typography
    - Create dotted underlines for student information fields
    - _Requirements: Template 7 visual design, PDF compatibility_

- [x] 3. Implement Template 8: Detail Colour Marks Report Template
  - [x] 3.1 Create Template 8 HTML generator with skills grid
    - Implement complex layout combining skills grid and academic table
    - Create 3x8 skills assessment grid with color-coded boxes
    - Add academic subjects table with rowspan logic
    - _Requirements: Template 8 specifications, skills grid layout_
  
  - [x] 3.2 Create Template 8 CSS styling
    - Implement dense skills grid layout with 8pt font
    - Create two-column requirements section
    - Add proper table styling for academic assessment
    - _Requirements: Template 8 visual design, grid layout_

- [x] 4. Implement Template 9: Academy Professional Report
  - [x] 4.1 Create Template 9 HTML generator with navy blue theme
    - Implement professional layout with student photo support
    - Create 3-column student identity grid
    - Add navy blue (#002366) color scheme throughout
    - _Requirements: Template 9 specifications, professional styling_
  
  - [x] 4.2 Create Template 9 CSS styling
    - Implement circular student photo styling
    - Add watermark support for security
    - Create professional table styling with light blue headers
    - _Requirements: Template 9 visual design, professional appearance_

- [x] 5. Implement Template 10: Excellent Nursery Clean Template
  - [x] 5.1 Create Template 10 HTML generator with split-view layout
    - Implement 60/40 split between academic areas and activities
    - Create 5 learning areas with score/comment structure
    - Add 2x5 activities grid on the right side
    - _Requirements: Template 10 specifications, split-view design_
  
  - [x] 5.2 Create Template 10 CSS styling
    - Implement flexbox split-view layout
    - Add dark red/maroon (#8B2323) summary bar styling
    - Create activities grid with proper spacing
    - _Requirements: Template 10 visual design, split layout_

- [x] 6. Implement Template 11: Simple Nursery Template
  - [x] 6.1 Create Template 11 HTML generator with watermark
    - Implement activities-based layout with central watermark
    - Create 2x5 activities grid with illustration placeholders
    - Add red-bordered comments section
    - _Requirements: Template 11 specifications, watermark support_
  
  - [x] 6.2 Create Template 11 CSS styling
    - Implement central watermark positioning (opacity: 0.1)
    - Add red (#FF0000) accent colors for divider and borders
    - Create activities grid with dotted lines for comments
    - _Requirements: Template 11 visual design, watermark effect_

- [x] 7. Implement Template 12: Modern Nursery Template
  - [x] 7.1 Create Template 12 HTML generator with linear progress layout
    - Implement achievement scores table with position tracking
    - Create 5-column table for learning areas assessment
    - Add purple/brown (#6B4C93) summary bar
    - _Requirements: Template 12 specifications, modern layout_
  
  - [x] 7.2 Create Template 12 CSS styling
    - Implement modern typography with Segoe UI/Verdana
    - Add orange (#FF8C00) horizontal divider
    - Create professional table styling with fixed column widths
    - _Requirements: Template 12 visual design, modern appearance_

- [x] 8. Checkpoint - Ensure all template generators work
  - Ensure all 6 template HTML generators produce valid output
  - Verify all CSS styling matches design specifications
  - Test template data interfaces with sample data
  - Ask the user if questions arise.

- [x] 9. Create Templates page in Teachers section
  - [x] 9.1 Create TemplatesPage component
    - Create new page component at src/pages/teacher/templates/TemplatesPage.tsx
    - Implement grid layout showing all 6 nursery templates
    - Add template cards with preview buttons and descriptions
    - _Requirements: Teacher navigation, template preview system_
  
  - [x] 9.2 Add Templates navigation to TeacherLayout
    - Add "Templates" navigation link in Teaching section
    - Update TeacherLayout.tsx with new route and prefetch chunk
    - Add appropriate icon and styling for Templates menu item
    - _Requirements: Teacher navigation structure_
  
  - [x] 9.3 Create template preview modal system
    - Implement modal component for template previews
    - Add preview functionality for each template with sample data
    - Create close/navigation controls for preview modal
    - _Requirements: Template preview functionality_

- [x] 10. Implement template preview system
  - [x] 10.1 Create sample data generators for each template
    - Create realistic sample data for Template 7 (learning areas)
    - Create sample data for Template 8 (skills grid + academic)
    - Create sample data for Templates 9-12 with appropriate content
    - _Requirements: Template data structures, realistic preview data_
  
  - [x] 10.2 Create template preview renderer
    - Implement preview rendering system using existing HTML generators
    - Add PDF generation capability for template previews
    - Create responsive preview display with zoom controls
    - _Requirements: Template HTML generators, PDF generation_

- [x] 11. Add router configuration for Templates page
  - [x] 11.1 Update router with Templates route
    - Add /dashboard/teacher/templates route to router configuration
    - Ensure proper route protection and teacher role access
    - Add route to TEACHER_ROUTE_CHUNKS for prefetching
    - _Requirements: React Router configuration, role-based access_

- [x] 12. Integration preparation for Add Results system
  - [ ] 12.1 Create nursery template integration interfaces
    - Define interfaces for connecting templates to exam results data
    - Create template selection logic for nursery classes
    - Add template metadata for nursery class compatibility
    - _Requirements: Exam results integration, template selection_
  
  - [ ] 12.2 Update existing template registry
    - Integrate nursery templates into existing template system
    - Update template selection logic to include nursery options
    - Ensure compatibility with existing PDF generation pipeline
    - _Requirements: Template registry system, PDF generation_

- [x] 13. Final checkpoint - Complete system testing
  - Ensure all 6 templates render correctly in preview system
  - Verify Templates page navigation works properly
  - Test template preview modal functionality
  - Confirm all templates are ready for future results integration
  - Ask the user if questions arise.

## Notes

- All templates are designed as empty/blank templates for dynamic data filling
- Templates 7-12 target Baby Class, Middle Class, and Top Class nursery sections
- Each template has unique visual characteristics and color schemes
- Preview system allows teachers to see template layouts before use
- Templates are prepared for future integration with Add Results system
- All implementations use TypeScript for type safety
- CSS styling ensures PDF compatibility and A4 page fitting