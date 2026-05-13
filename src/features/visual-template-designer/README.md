# Visual Template Designer

A sophisticated drag-and-drop WYSIWYG template editor for school report templates (report cards, certificates, ID cards, receipts, etc.).

## Architecture

This feature follows a **layered architecture** pattern with clear separation of concerns:

### 📁 Directory Structure

```
src/features/visual-template-designer/
├── presentation/          # React components for UI rendering
│   ├── components/       # Reusable UI components
│   ├── pages/           # Page-level components
│   └── hooks/           # Custom React hooks
├── application/          # Business logic and state management
│   ├── services/        # Application services
│   ├── state/           # State management (Zustand/Context)
│   └── validation/      # Validation logic
├── domain/              # Core domain models and types
│   ├── models/          # Domain entities
│   ├── types/           # TypeScript types and interfaces
│   └── schemas/         # Zod validation schemas
├── infrastructure/      # External integrations
│   ├── pdf/            # PDF generation (jsPDF)
│   ├── storage/        # Template storage
│   └── api/            # API clients
└── __tests__/          # Test suites
    ├── unit/           # Unit tests (Jest + React Testing Library)
    ├── integration/    # Integration tests
    ├── property/       # Property-based tests (fast-check)
    └── e2e/           # End-to-end tests (Playwright)
```

## Technology Stack

### Core Dependencies
- **React 19** - UI framework
- **TypeScript 5.9** - Type safety
- **Zod** - Runtime schema validation
- **@atlaskit/pragmatic-drag-and-drop** - Drag-and-drop functionality
- **jsPDF** - PDF generation

### Testing Dependencies
- **Vitest** - Unit test runner
- **React Testing Library** - Component testing
- **fast-check** - Property-based testing
- **Playwright** - End-to-end testing
- **@testing-library/jest-dom** - DOM matchers

## Key Design Principles

1. **Security by Design**: All dynamic components are predefined with fixed data bindings
2. **Separation of Concerns**: Clear boundaries between layers
3. **Immutable State Management**: Event-sourcing pattern for undo/redo
4. **Type Safety**: Comprehensive TypeScript types and runtime validation
5. **Performance**: Optimized rendering for large canvases

## Testing Strategy

### Unit Tests
- Template validation logic
- Undo/redo manager state transitions
- Component positioning and sizing calculations
- Data binding resolution
- Template JSON parsing and serialization

### Property-Based Tests (fast-check)
- Template JSON round-trip preservation
- Component position update consistency
- Rotation angle normalization
- Snap-to-grid positioning
- Zoom level clamping
- Undo-redo inverse operations
- Z-index ordering preservation
- Layout property range validation
- Aspect ratio lock preservation

### Integration Tests
- Canvas drag-and-drop interactions
- Component library to canvas workflow
- Properties panel updates
- Template save and load workflow

### E2E Tests (Playwright)
- Complete template creation workflow
- PDF generation with real data
- Bulk PDF generation
- Template import/export

## Running Tests

```bash
# Run all unit and property-based tests
npm test

# Run tests in watch mode
npm run test

# Run tests once (CI mode)
npm run test:run

# Run E2E tests
npx playwright test

# Run E2E tests with UI
npx playwright test --ui
```

## Development

### Path Aliases
The project uses TypeScript path aliases for clean imports:
- `@/*` maps to `src/*`

Example:
```typescript
import { Template } from '@/features/visual-template-designer/domain/models/Template';
```

### TypeScript Configuration
- **Strict mode enabled**: Full type safety
- **Target**: ES2020
- **Module**: ESNext with bundler resolution
- **JSX**: react-jsx

## Documentation

- [Requirements Document](.kiro/specs/visual-template-designer/requirements.md)
- [Design Document](.kiro/specs/visual-template-designer/design.md)
- [Tasks](.kiro/specs/visual-template-designer/tasks.md)

## License

Private - PwezaCore School Management System
