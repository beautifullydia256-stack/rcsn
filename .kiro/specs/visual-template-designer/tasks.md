# Implementation Plan: Visual Template Designer

## Overview

This implementation plan breaks down the Visual Template Designer into discrete coding tasks. The feature is a comprehensive drag-and-drop WYSIWYG template editor for school report templates, built with React, TypeScript, and modern web technologies. The implementation follows a layered architecture (Presentation, Application, Domain, Infrastructure) and includes extensive property-based testing for correctness validation.

## Tasks

- [x] 1. Set up project structure and core dependencies
  - Create directory structure for layered architecture (presentation, application, domain, infrastructure)
  - Install core dependencies: React, TypeScript, Zod, react-dnd or pragmatic-drag-and-drop, react-pdf or jsPDF
  - Install testing dependencies: Jest, React Testing Library, fast-check, Playwright or Cypress
  - Configure TypeScript with strict mode and path aliases
  - Set up Jest configuration for unit and property-based tests
  - _Requirements: All requirements depend on proper project setup_

- [ ] 2. Implement domain models and validation schemas
  - [x] 2.1 Create TypeScript interfaces for core domain models
    - Define Template, TemplatePage, TemplateComponent interfaces
    - Define LayoutProperties, Position, Size, FontProperties, ColorProperties, BorderProperties, SpacingProperties interfaces
    - Define ComponentType, TemplateCategory, PageSize enums
    - Define DataBinding, ResultsTableStyle, ComponentGroup interfaces
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_

  - [x] 2.2 Write property test for domain model type safety
    - **Property 1: Template JSON round-trip preservation**
    - **Validates: Requirements 8.11, 9.5**

  - [x] 2.3 Create Zod validation schemas for all domain models
    - Implement PositionSchema, SizeSchema, FontPropertiesSchema, ColorPropertiesSchema
    - Implement BorderPropertiesSchema, SpacingPropertiesSchema, LayoutPropertiesSchema
    - Implement ComponentTypeSchema, DataBindingSchema, ComponentJSONSchema
    - Implement PageJSONSchema, TemplateJSONSchema
    - Add validation for ranges: font size (6-72pt), border width (0-20px), padding/margin (0-50px)
    - _Requirements: 5.5, 5.6, 5.10, 5.13, 5.14, 8.2-8.12, 14.6_

  - [x] 2.4 Write property test for layout property range validation
    - **Property 13: Layout property range validation**
    - **Validates: Requirements 5.5, 5.6, 5.10, 5.13, 5.14**

  - [x] 2.5 Implement Template JSON parser and pretty printer
    - Create parseTemplateJSON function using Zod schema validation
    - Create prettyPrintTemplateJSON function with 2-space indentation
    - Add descriptive error messages for validation failures
    - _Requirements: 8.11, 8.12, 9.1, 9.2, 9.3, 9.4_

  - [x] 2.6 Write property test for JSON round-trip consistency
    - **Property 1: Template JSON round-trip preservation**
    - **Property 17: Template JSON pretty printing consistency**
    - **Validates: Requirements 8.11, 9.3, 9.4, 9.5**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement component library and category restrictions
  - [x] 4.1 Create component type definitions and metadata
    - Define metadata for all component types (School Info, Student Info, Academic, Financial, Static)
    - Create mapping of component types to allowed template categories
    - Define default properties for each component type
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 4.2 Implement category-based component filtering logic
    - Create getComponentsForCategory function
    - Implement filtering logic for each template category (Report Card, Certificate, ID Card, Receipt, Fee Statement, Admission Form, Result Slip)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [x] 4.3 Write property test for category-based component filtering
    - **Property 12: Category-based component filtering**
    - **Validates: Requirements 4.1-4.8**

  - [x] 4.4 Implement data binding validation
    - Create predefined data binding lists for each dynamic component type
    - Implement validateDataBinding function
    - Add validation to prevent custom SQL queries or field names
    - _Requirements: 14.3, 14.4, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

  - [x] 4.5 Write property test for data binding validation
    - **Property 20: Component data binding validation**
    - **Validates: Requirements 14.3, 14.4, 16.1, 16.6**

  - [x] 4.6 Write property test for category-component compatibility
    - **Property 21: Category-component compatibility validation**
    - **Validates: Requirements 14.5**

- [ ] 5. Implement state management and undo/redo system
  - [x] 5.1 Create template state interfaces and types
    - Define TemplateState, TemplateActions, TemplateSnapshot interfaces
    - Define TemplateAction interface with execute and undo methods
    - Define ActionType enum for all action types
    - _Requirements: 1.9, 1.10, 1.11, 1.12, 1.13_

  - [x] 5.2 Implement UndoRedoManager class
    - Implement execute, undo, redo, canUndo, canRedo, clear methods
    - Maintain history stack with maximum 50 actions
    - Maintain redo stack with maximum 50 actions
    - _Requirements: 1.9, 1.10, 1.11, 1.12, 1.13_

  - [x] 5.3 Write property test for undo-redo inverse operations
    - **Property 6: Undo-redo inverse operations**
    - **Validates: Requirements 1.11, 1.12, 1.13**

  - [x] 5.4 Implement action classes for all template operations
    - Create AddComponentAction, UpdateComponentAction, DeleteComponentAction
    - Create MoveComponentAction, ResizeComponentAction, RotateComponentAction
    - Create GroupComponentsAction, UngroupComponentsAction
    - Each action implements execute and undo methods
    - _Requirements: 1.2, 1.4, 1.5, 5.16, 21.2, 21.5_

  - [x] 5.5 Create global state management with Zustand or Redux
    - Set up store with template state, selected component, clipboard, isDirty flag
    - Implement actions: loadTemplate, saveTemplate, addComponent, updateComponent, deleteComponent
    - Implement actions: selectComponent, copyComponent, pasteComponent
    - Integrate UndoRedoManager with state management
    - _Requirements: 1.11, 1.12, 1.13, 13.2, 13.3, 18.3, 18.4_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement visual canvas component
  - [ ] 7.1 Create VisualCanvas React component with drag-and-drop
    - Set up canvas container with coordinate-based positioning
    - Implement drag-and-drop using react-dnd or pragmatic-drag-and-drop
    - Handle component drop events to position at drop coordinates
    - Render all components with z-index ordering
    - _Requirements: 1.1, 1.2, 2.1, 2.7_

  - [ ] 7.2 Write property test for component position updates
    - **Property 2: Component position update consistency**
    - **Validates: Requirements 1.2, 1.4**

  - [ ] 7.3 Implement component selection and manipulation
    - Add click handlers for component selection
    - Display resize handles for selected components
    - Implement drag handlers for moving selected components
    - Implement resize handlers with live preview
    - _Requirements: 1.3, 1.4_

  - [ ] 7.4 Implement rotation functionality
    - Add rotation handle to selected components
    - Implement rotation calculation from mouse position
    - Normalize rotation angle to 0-360 degrees
    - _Requirements: 1.5_

  - [ ] 7.5 Write property test for rotation angle normalization
    - **Property 3: Rotation angle normalization**
    - **Validates: Requirements 1.5**

  - [ ] 7.6 Implement snap-to-grid functionality
    - Add configurable grid spacing (5px, 10px, 20px, 25px, 50px)
    - Implement snap-to-grid calculation for position updates
    - Add toggle for enabling/disabling snap-to-grid
    - Display grid lines when enabled
    - _Requirements: 1.6, 22.3, 22.4, 22.5_

  - [ ] 7.7 Write property test for snap-to-grid positioning
    - **Property 4: Snap-to-grid positioning**
    - **Validates: Requirements 1.6**

  - [ ] 7.8 Implement alignment guides
    - Detect when components align with other components during drag
    - Display visual alignment guides (vertical and horizontal lines)
    - _Requirements: 1.7_

  - [ ] 7.9 Implement zoom functionality
    - Add zoom controls (zoom in, zoom out, fit to width, fit to page, actual size)
    - Implement zoom level state (25% to 400%)
    - Scale canvas rendering based on zoom level
    - Display current zoom percentage
    - _Requirements: 1.8, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9_

  - [ ] 7.10 Write property test for zoom level clamping
    - **Property 5: Zoom level clamping**
    - **Validates: Requirements 1.8**

  - [ ] 7.11 Implement responsive canvas viewport
    - Scale canvas to fit available viewport width
    - Maintain aspect ratio of page size
    - Add scroll bars when canvas exceeds viewport at current zoom
    - _Requirements: 17.1, 17.2, 17.3_

- [ ] 8. Implement z-index and layer management
  - [ ] 8.1 Create layer management functions
    - Implement bringToFront: set z-index higher than all components
    - Implement sendToBack: set z-index lower than all components
    - Implement bringForward: increase z-index by one level
    - Implement sendBackward: decrease z-index by one level
    - Assign new components highest z-index
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 8.2 Write property test for z-index ordering preservation
    - **Property 7: Z-index ordering preservation**
    - **Validates: Requirements 2.1, 2.7**

  - [ ] 8.3 Write property test for bring-to-front operation
    - **Property 8: Z-index bring-to-front maximum**
    - **Validates: Requirements 2.3**

  - [ ] 8.4 Write property test for send-to-back operation
    - **Property 9: Z-index send-to-back minimum**
    - **Validates: Requirements 2.4**

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement component library panel
  - [ ] 10.1 Create ComponentLibrary React component
    - Display components organized by type (School Info, Student Info, Academic, Financial, Static)
    - Filter components based on current template category
    - Implement drag start handlers for component types
    - Display component icons and labels
    - _Requirements: 3.1, 3.7, 4.8_

  - [ ] 10.2 Write property test for component creation from library
    - **Property 10: Component creation from library**
    - **Validates: Requirements 3.7**

  - [ ] 10.3 Write property test for custom component prevention
    - **Property 11: Custom component prevention**
    - **Validates: Requirements 3.8**

- [ ] 11. Implement properties panel
  - [ ] 11.1 Create PropertiesPanel React component
    - Display properties for selected component
    - Show different property editors based on component type
    - Implement property change handlers
    - _Requirements: 5.1_

  - [ ] 11.2 Implement layout property editors
    - Create position editor (x, y coordinates with unit selector)
    - Create size editor (width, height with unit selector)
    - Create rotation editor (0-360 degrees)
    - Create font property editors (family, size 6-72pt, weight, style)
    - Create color property editors (text, background with color picker)
    - Create border property editors (width 0-20px, color, style)
    - Create spacing property editors (padding 0-50px, margin 0-50px)
    - Create alignment editor (left, center, right, justify)
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12, 5.13, 5.14, 5.15_

  - [ ] 11.3 Write property test for layout property application
    - **Property 14: Layout property application**
    - **Validates: Requirements 5.16**

  - [ ] 11.4 Implement image component property editors
    - Create aspect ratio lock toggle
    - Create image fit selector (contain, cover, fill, scale-down)
    - Implement aspect ratio preservation logic when lock is enabled
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ] 11.5 Write property test for aspect ratio lock preservation
    - **Property 15: Aspect ratio lock preservation**
    - **Validates: Requirements 7.3**

  - [ ] 11.6 Implement results table styling editors
    - Create table border width and color editors
    - Create header background and text color editors
    - Create row background and alternating row color editors
    - Create cell padding editor
    - Create table font size editor
    - Prevent modification of table column structure and data bindings
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

- [ ] 12. Implement multi-page support
  - [ ] 12.1 Add page management functionality
    - Implement addPage function
    - Implement removePage function
    - Implement reorderPages function
    - Update Template JSON schema to include pages array
    - _Requirements: 12.1, 12.2, 12.3, 12.8_

  - [ ] 12.2 Write property test for page addition preservation
    - **Property 18: Page addition preservation**
    - **Validates: Requirements 12.1**

  - [ ] 12.3 Write property test for page removal preservation
    - **Property 19: Page removal preservation**
    - **Validates: Requirements 12.2**

  - [ ] 12.4 Implement page navigation UI
    - Display page boundaries on canvas
    - Add page navigation controls (previous, next, page selector)
    - Display warning when component extends beyond page boundary
    - _Requirements: 12.4, 12.5, 12.6_

- [ ] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Implement template validation engine
  - [ ] 14.1 Create ValidationEngine class
    - Implement validateTemplate function
    - Validate all components are from Component Library
    - Validate all dynamic components have valid data bindings
    - Validate data bindings reference existing database fields
    - Validate components are appropriate for template category
    - Validate Template JSON structure using Zod schema
    - Validate layout properties are within allowed ranges
    - Return specific error messages for each validation failure
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9_

  - [ ] 14.2 Write property test for template JSON structure validation
    - **Property 16: Template JSON structure validation**
    - **Validates: Requirements 8.12, 14.6**

  - [ ] 14.3 Write unit tests for validation engine
    - Test validation of invalid component types
    - Test validation of invalid data bindings
    - Test validation of out-of-range layout properties
    - Test validation of category-component mismatches
    - _Requirements: 14.1-14.9_

- [ ] 15. Implement template management features
  - [ ] 15.1 Create template CRUD operations
    - Implement createTemplate function
    - Implement saveTemplate function with validation
    - Implement loadTemplate function
    - Implement duplicateTemplate function
    - Implement deleteTemplate function with confirmation
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

  - [ ] 15.2 Implement template list and search UI
    - Display list of templates organized by category
    - Implement template search by name
    - Add default template indicator for each category
    - Add set default template functionality
    - _Requirements: 13.8, 13.9, 13.10_

  - [ ] 15.3 Implement template export and import
    - Create exportTemplate function to download Template JSON file
    - Create importTemplate function to parse uploaded Template JSON
    - Validate imported templates before loading
    - Display validation errors for invalid imports
    - Allow saving imported templates with new name
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7_

  - [ ] 15.4 Write property test for template export-import round-trip
    - **Property 22: Template export-import round-trip**
    - **Validates: Requirements 20.4, 20.5, 20.6**

  - [ ] 15.5 Implement template versioning
    - Create version entry on each template save
    - Store version number, timestamp, and administrator ID
    - Implement view version history UI
    - Implement preview previous version functionality
    - Implement restore previous version functionality
    - Create new version entry when restoring
    - Retain at least 20 versions per template
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7_

- [ ] 16. Implement keyboard shortcuts
  - [ ] 16.1 Create keyboard shortcut handler
    - Implement Ctrl+Z / Cmd+Z for undo
    - Implement Ctrl+Y / Cmd+Y for redo
    - Implement Ctrl+C / Cmd+C for copy component
    - Implement Ctrl+V / Cmd+V for paste component
    - Implement Delete / Backspace for delete component
    - Implement Ctrl+S / Cmd+S for save template
    - Implement Ctrl+D / Cmd+D for duplicate component
    - Implement arrow keys for move component by 1 pixel
    - Implement Shift+arrow keys for move component by 10 pixels
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9_

  - [ ] 16.2 Create keyboard shortcuts reference panel
    - Display all keyboard shortcuts in help menu
    - _Requirements: 18.10_

- [ ] 17. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Implement component grouping functionality
  - [ ] 18.1 Create component grouping logic
    - Implement groupComponents function for multiple selected components
    - Implement ungroupComponents function
    - Create ComponentGroup model with group ID and component IDs
    - Update Template JSON schema to include group_id field
    - _Requirements: 21.1, 21.2, 21.5, 21.7_

  - [ ] 18.2 Implement group manipulation
    - Allow moving entire group while maintaining relative positions
    - Allow selecting individual components within group using double-click
    - _Requirements: 21.3, 21.4, 21.6_

  - [ ] 18.3 Write property test for component grouping position preservation
    - **Property 23: Component grouping position preservation**
    - **Validates: Requirements 21.4**

  - [ ] 18.4 Write property test for group movement consistency
    - **Property 24: Group movement consistency**
    - **Validates: Requirements 21.4**

- [ ] 19. Implement alignment and distribution tools
  - [ ] 19.1 Create alignment functions
    - Implement alignLeft, alignCenter, alignRight for horizontal alignment
    - Implement alignTop, alignMiddle, alignBottom for vertical alignment
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7_

  - [ ] 19.2 Write property test for alignment operation correctness
    - **Property 25: Alignment operation correctness**
    - **Validates: Requirements 23.2-23.7**

  - [ ] 19.3 Create distribution functions
    - Implement distributeHorizontally for even horizontal spacing
    - Implement distributeVertically for even vertical spacing
    - _Requirements: 23.8, 23.9_

  - [ ] 19.4 Write property test for distribution operation spacing
    - **Property 26: Distribution operation spacing**
    - **Validates: Requirements 23.8, 23.9**

- [ ] 20. Implement grid and ruler display
  - [ ] 20.1 Create ruler components
    - Display horizontal ruler along top edge with measurements
    - Display vertical ruler along left edge with measurements
    - Support multiple units (pixels, millimeters, inches)
    - Add toggle for ruler visibility
    - _Requirements: 22.1, 22.2, 22.6, 22.7_

  - [ ] 20.2 Enhance grid display
    - Grid lines already implemented in task 7.6
    - Ensure grid visibility toggle works correctly
    - _Requirements: 22.3, 22.4, 22.5_

- [ ] 21. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 22. Implement live preview functionality
  - [ ] 22.1 Create preview mode UI
    - Add preview mode toggle
    - Implement mode switching between edit and preview
    - _Requirements: 10.6_

  - [ ] 22.2 Implement data fetching for preview
    - Create DataFetcher service to fetch sample data from School System
    - Fetch sample student, academic, and financial data
    - Handle missing data with placeholder text
    - _Requirements: 10.2, 10.7_

  - [ ] 22.3 Implement preview rendering
    - Render all dynamic components with sample data
    - Render all static components as designed
    - Use exact positioning matching canvas layout
    - Update preview within 500ms of template changes
    - _Requirements: 10.1, 10.3, 10.4, 10.5_

- [ ] 23. Implement PDF rendering engine
  - [ ] 23.1 Create PDFRendererService using react-pdf or jsPDF
    - Implement renderTemplate function to convert Template JSON to PDF
    - Position all components at exact canvas coordinates
    - Apply all layout properties to components in PDF
    - Render dynamic components with actual student data
    - Render static components exactly as designed
    - Support multi-page templates
    - Generate PDFs at 300 DPI resolution
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.9_

  - [ ] 23.2 Implement error handling for PDF rendering
    - Return descriptive error messages on failure
    - Implement PDFRenderError class
    - _Requirements: 11.8_

  - [ ] 23.3 Write integration tests for PDF rendering
    - Test PDF generation with various template types
    - Test multi-page PDF rendering
    - Test component positioning accuracy
    - Test layout property application in PDF
    - _Requirements: 11.1-11.9_

  - [ ] 23.4 Implement bulk PDF generation
    - Create renderBulk function accepting template and student ID list
    - Generate separate PDF for each student
    - Fetch individual student data for each PDF
    - Display progress information during generation
    - Log errors for failed generations and continue processing
    - Display summary of successful and failed generations
    - Provide download option for all generated PDFs
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8_

- [ ] 24. Implement security and authorization
  - [ ] 24.1 Create authorization middleware
    - Verify user has Administrator role before accessing Template Designer
    - Display authorization error for unauthorized users
    - _Requirements: 15.1, 15.2_

  - [ ] 24.2 Implement input sanitization
    - Validate all user input to prevent code injection
    - Sanitize all text input before storing in Template JSON
    - Prevent execution of JavaScript code in template content
    - Prevent inclusion of external scripts or resources
    - Use parameterized queries for all database operations
    - _Requirements: 15.3, 15.4, 15.5, 15.6, 15.7_

  - [ ] 24.3 Write property test for input sanitization safety
    - **Property 27: Input sanitization safety**
    - **Validates: Requirements 15.4, 15.5, 15.6**

  - [ ] 24.4 Implement audit logging
    - Log all template creation, modification, and deletion actions
    - Include administrator identification and timestamp in logs
    - _Requirements: 15.8_

- [ ] 25. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 26. Implement accessibility features
  - [ ] 26.1 Add keyboard navigation support
    - Ensure all interactive elements are keyboard accessible
    - Implement tab order for logical navigation
    - _Requirements: 25.1_

  - [ ] 26.2 Add ARIA labels and screen reader support
    - Add ARIA labels to all buttons and controls
    - Add text alternatives for icon-only buttons
    - Implement screen reader announcements for state changes
    - _Requirements: 25.2, 25.4, 25.5_

  - [ ] 26.3 Ensure visual accessibility
    - Maintain visible focus indicators during keyboard navigation
    - Ensure color contrast ratios of at least 4.5:1 for text
    - Allow font size customization in UI (separate from template content)
    - _Requirements: 25.3, 25.6, 25.7_

  - [ ] 26.4 Write integration tests for accessibility
    - Test keyboard navigation through all UI elements
    - Test screen reader compatibility with axe-core
    - Test color contrast ratios
    - _Requirements: 25.1-25.7_

- [ ] 27. Implement error boundaries and error handling
  - [ ] 27.1 Create error classes
    - Implement TemplateValidationError class
    - Implement PDFRenderError class
    - Implement DataFetchError class
    - Implement AuthorizationError class
    - _Requirements: All error handling requirements_

  - [ ] 27.2 Create error boundary component
    - Implement TemplateDesignerErrorBoundary React component
    - Display error fallback UI
    - Log errors to error tracking service
    - _Requirements: All error handling requirements_

  - [ ] 27.3 Implement error handling strategies
    - Display inline error messages in properties panel for validation errors
    - Show error toast with download option for PDF render errors
    - Display placeholder text for data fetch errors
    - Redirect to login for authorization errors
    - Implement retry logic with exponential backoff for network errors
    - _Requirements: All error handling requirements_

- [ ] 28. Wire all components together in TemplateDesigner root component
  - [ ] 28.1 Create TemplateDesigner root component
    - Integrate VisualCanvas, ComponentLibrary, PropertiesPanel
    - Connect all components to global state management
    - Implement component lifecycle (mount, update, unmount)
    - Add loading states and error boundaries
    - _Requirements: All requirements_

  - [ ] 28.2 Create main application routes and navigation
    - Set up routing for template designer page
    - Set up routing for template list page
    - Implement navigation between pages
    - _Requirements: 13.9_

- [ ] 29. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 30. Integration testing and end-to-end testing
  - [ ] 30.1 Write integration tests for complete workflows
    - Test template creation workflow (new template → add components → customize → save)
    - Test template editing workflow (load template → modify → save)
    - Test template duplication workflow
    - Test template export/import workflow
    - Test bulk PDF generation workflow
    - Test keyboard shortcuts workflow
    - Test component grouping workflow
    - Test alignment and distribution workflow
    - _Requirements: All requirements_

  - [ ] 30.2 Write end-to-end tests with Playwright or Cypress
    - Test drag-and-drop interactions
    - Test component selection and manipulation
    - Test properties panel updates
    - Test preview mode
    - Test PDF generation
    - Test multi-page templates
    - Test version history
    - _Requirements: All requirements_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Integration tests validate complete user workflows
- The implementation uses TypeScript, React, Zod for validation, react-dnd or pragmatic-drag-and-drop for drag-and-drop, and react-pdf or jsPDF for PDF generation
- All property-based tests use fast-check library with minimum 100 iterations
- Security is enforced through input sanitization, authorization checks, and audit logging
