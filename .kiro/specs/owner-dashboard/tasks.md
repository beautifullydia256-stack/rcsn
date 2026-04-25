# Implementation Plan: Owner Dashboard

## Overview

This implementation plan creates a comprehensive owner dashboard for the PwezaCore platform, providing platform-wide oversight and management capabilities. The dashboard will be built using TypeScript/React with modern performance optimizations, security measures, and seamless integration with the existing system.

## Tasks

### Phase 1: Foundation & Setup

- [x] 1. Set up database schema extensions and optimizations
  - Create materialized views for owner dashboard metrics aggregation
  - Add composite indexes for multi-tenant queries (schools, users, subscriptions)
  - Create owner-specific database functions for real-time notifications
  - Set up automated refresh schedules for materialized views using pg_cron
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 9.4, 9.9_

- [x] 1.1 Write property test for database schema extensions
  - **Property 1: Metrics Aggregation Accuracy**
  - **Validates: Requirements 1.2, 1.3, 1.4, 1.5**

- [x] 2. Create owner authentication and authorization middleware
  - Implement owner role validation middleware for API routes
  - Create session management with 8-hour timeout and renewal
  - Add rate limiting specifically for owner endpoints (1000 requests per 15 minutes)
  - Implement audit logging for all owner actions
  - _Requirements: 11.1, 11.2, 11.3, 11.6, 11.8_

- [x] 2.1 Write property test for owner access control
  - **Property 7: Owner-only Access Control**
  - **Validates: Requirements 11.1**

- [x] 3. Set up API endpoint structure and routing
  - Create `/api/owner/dashboard-metrics` endpoint for main dashboard data
  - Create `/api/owner/schools` endpoints for school management operations
  - Create `/api/owner/users` endpoints for user management operations
  - Create `/api/owner/finance` endpoints for financial data
  - Create `/api/owner/system-health` endpoints for monitoring data
  - Follow existing API patterns and error handling conventions
  - _Requirements: 13.7, 13.9_

- [x] 3.1 Write unit tests for API endpoint structure
  - Test endpoint authentication and authorization
  - Test error handling and response formats
  - _Requirements: 11.8, 11.10_

- [x] 4. Create owner dashboard layout and routing structure
  - Set up React Router routes for owner dashboard sections
  - Create `OwnerDashboardLayout` component with sidebar and main content areas
  - Implement route guards to ensure only owner role can access
  - Add loading states and error boundaries for the layout
  - _Requirements: 2.8, 13.4, 11.1_

### Phase 2: Core Dashboard Components

- [x] 5. Implement modern sidebar navigation system
  - Create `OwnerSidebar` component with 7 main sections (MAIN, SCHOOLS, USERS, FINANCE, SYSTEM, CONTENT, SETTINGS)
  - Implement collapsible design with responsive behavior for mobile
  - Add active section highlighting and smooth animations using Framer Motion
  - Integrate with existing PwezaCore design system and Tailwind CSS classes
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 10.8_

- [x] 5.1 Write property test for sidebar navigation
  - **Property 5: Navigation State Consistency**
  - **Validates: Requirements 2.8**

- [x] 5.2 Write property test for responsive layout
  - **Property 6: Responsive Layout Behavior**
  - **Validates: Requirements 2.9**

- [x] 6. Create dashboard landing page with metrics grid
  - Implement `DashboardMetricsGrid` component displaying 8 key metrics (total schools, active schools, total users, monthly revenue, database size, storage usage, API calls, active sessions)
  - Add real-time metric updates using Supabase subscriptions
  - Implement loading states and error handling for each metric card
  - Add percentage change indicators and trend arrows for metrics
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 9.3, 9.7_

- [x] 6.1 Write property test for metrics accuracy
  - **Property 1: Metrics Aggregation Accuracy**
  - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.7**

- [x] 7. Implement charts and data visualizations
  - Create `SchoolGrowthChart` component (12-month bar chart for new schools)
  - Create `UserGrowthChart` component (line chart for user growth trend)
  - Create `RevenueChart` component (area chart for monthly recurring revenue)
  - Create `StorageUsageChart` component (donut chart for storage distribution)
  - Use Recharts library consistent with existing codebase
  - Implement lazy loading for chart components
  - _Requirements: 1.10, 1.11, 1.12, 9.6_

- [x] 7.1 Write property test for chart data integrity
  - **Property 3: Chart Data Integrity**
  - **Validates: Requirements 1.10, 1.11, 1.12**

- [x] 8. Create alerts and notifications panel
  - Implement alerts for subscription expiration (30-day warning)
  - Implement churn risk alerts for inactive schools (30+ days)
  - Implement database error alerts (24-hour window)
  - Implement storage warning alerts for schools approaching limits
  - Add failed payment and system error notifications
  - _Requirements: 1.13, 1.14, 1.15, 1.16, 1.17_

- [x] 8.1 Write property test for alert threshold accuracy
  - **Property 4: Alert Threshold Accuracy**
  - **Validates: Requirements 1.13, 1.14, 1.16**

- [x] 9. Implement schools snapshot table with virtual scrolling
  - Create `SchoolsSnapshotTable` component with virtual scrolling for performance
  - Display school name, plan, student count, last active date, storage usage, subscription status
  - Add quick action buttons (View, Suspend, Message) for each school
  - Implement real-time status updates using Supabase subscriptions
  - Add sorting and filtering capabilities
  - _Requirements: 1.22, 1.23, 9.8_

### Phase 3: Management Interfaces

- [x] 10. Implement Schools Management interface
  - Create `AllSchoolsPage` with status indicators (active, inactive, trial, suspended)
  - Add filtering by status, subscription plan, and activity level
  - Add search functionality by school name and location
  - Create `AddSchoolPage` with onboarding form for new schools
  - Create `SchoolRequestsPage` for pending applications with approval/rejection actions
  - Create `SuspendedSchoolsPage` with reactivation and removal actions
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [x] 10.1 Write unit tests for school management operations
  - Test school suspension and reactivation workflows
  - Test school approval and rejection processes
  - _Requirements: 3.9, 3.10_

- [x] 11. Implement Users Management system
  - Create `AllUsersPage` displaying users across all schools with role, school, and status
  - Add filtering by user role (admin, teacher, parent, student, accountant, librarian, head_teacher)
  - Add filtering by school and user status
  - Create `AdminsPage` showing only admin role users as primary school contacts
  - Create `UserRolesPage` for managing system permissions
  - Create `LoginActivityPage` with login history, IP addresses, and security monitoring
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

- [x] 11.1 Write unit tests for user management security
  - Test suspicious login detection and flagging
  - Test user impersonation with audit logging
  - _Requirements: 4.7, 4.8, 4.10_

- [ ] 12. Implement Finance Management dashboard
  - Create `RevenueOverviewPage` with total platform earnings and MRR metrics
  - Add annual revenue totals, projections, and breakdown by subscription plan
  - Create `SubscriptionsPage` with all school plans, expiration dates, and overdue accounts
  - Add subscription modification capabilities
  - Create `InvoicesPage` with billing history and invoice generation/resend functionality
  - Create `PayoutsPage` for platform percentage earnings display
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12, 5.13_

- [x] 12.1 Write unit tests for financial operations
  - Test subscription expiration and downgrade workflows
  - Test payment failure retry mechanisms
  - Test automated dunning email generation
  - _Requirements: 5.11, 5.12, 5.13_

### Phase 4: System Health & Monitoring

- [x] 13. Implement Database Health monitoring
  - Create `DatabaseHealthPage` with table sizes and row counts per school
  - Add slow query analysis and performance metrics display
  - Add database errors and connection issues monitoring
  - Implement real-time alerts for database performance degradation
  - _Requirements: 6.1, 6.2, 6.3, 6.11_

- [x] 13.1 Write unit tests for database health monitoring
  - Test performance degradation alert triggers
  - Test database error categorization and logging
  - _Requirements: 6.11_

- [x] 14. Implement Storage Usage tracking
  - Create `StorageUsagePage` with per-school usage versus allocated limits
  - Add alerts when schools approach storage quotas
  - Implement automatic upload prevention when limits are exceeded
  - Add storage usage trends and projections
  - _Requirements: 6.4, 6.5, 6.12_

- [x] 14.1 Write unit tests for storage limit enforcement
  - Test storage quota enforcement and upload prevention
  - Test storage warning alert generation
  - _Requirements: 6.12_

- [x] 15. Implement API Usage monitoring
  - Create `APIUsagePage` with Supabase API calls per school per day
  - Add API rate limit monitoring and usage pattern analysis
  - Implement request throttling and owner notifications when limits approached
  - Add API usage trends and anomaly detection
  - _Requirements: 6.6, 6.7, 6.13_

- [x] 15.1 Write unit tests for API usage monitoring
  - Test API rate limiting and throttling mechanisms
  - Test usage pattern anomaly detection
  - _Requirements: 6.13_

- [x] 16. Implement Error Logs and Audit Trail
  - Create `ErrorLogsPage` with system errors, failed transactions, and trigger failures
  - Add error categorization by severity levels and affected systems
  - Create `AuditLogPage` recording all important system actions (deletions, reversals, configuration changes)
  - Implement comprehensive audit trail with metadata (timestamp, user ID, action type, affected resources)
  - _Requirements: 6.8, 6.9, 6.10, 11.3_

- [x] 16.1 Write property test for audit trail completeness
  - **Property 8: Audit Trail Completeness**
  - **Validates: Requirements 11.3**

### Phase 5: Content & Settings

- [x] 17. Implement Announcements and Support Tickets
  - Create `AnnouncementsPage` with broadcast message creation to all schools
  - Add targeted announcements to specific school groups
  - Add scheduling for future announcement delivery
  - Create `SupportTicketsPage` with all platform issues display
  - Add ticket assignment, status tracking, and resolution tools
  - Add ticket categorization by priority and issue type
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.9, 7.10_

- [x] 17.1 Write unit tests for content management
  - Test announcement delivery to targeted schools
  - Test support ticket notification and assignment
  - _Requirements: 7.9, 7.10_

- [x] 18. Implement Feature Flags management
  - Create `FeatureFlagsPage` with interface to enable/disable features per school
  - Add beta testing support by enabling features for selected schools
  - Implement immediate feature flag application without system restart
  - Add feature flag history and rollback capabilities
  - _Requirements: 7.7, 7.8, 7.11_

- [x] 18.1 Write unit tests for feature flag management
  - Test immediate feature flag application
  - Test beta testing school selection and feature enablement
  - _Requirements: 7.11_

- [x] 19. Implement Platform Settings and Configuration
  - Create `PlatformSettingsPage` with payment gateway configuration
  - Add SMS and email service provider configuration
  - Add global storage limits per subscription tier configuration
  - Create `BillingPlansPage` for managing subscription tiers (Basic, Standard, Premium)
  - Add plan features, pricing, and limits modification
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.11_

- [x] 19.1 Write unit tests for platform configuration
  - Test platform settings application to all affected schools
  - Test billing plan modifications and feature updates
  - _Requirements: 8.11_

- [x] 20. Implement Security and Backup Management
  - Create `SecurityPage` with password policy configuration across all schools
  - Add session timeout and 2FA requirements configuration
  - Add IP whitelisting and access control settings
  - Create `BackupRecoveryPage` with database backup scheduling
  - Add restore point management and recovery tools
  - _Requirements: 8.6, 8.7, 8.8, 8.9, 8.10, 8.12, 8.13_

- [x] 20.1 Write unit tests for security management
  - Test security policy enforcement on user login
  - Test backup schedule modifications and automated job updates
  - _Requirements: 8.12, 8.13_

### Phase 6: Performance & Testing

- [x] 21. Implement performance optimizations
  - Set up multi-level caching strategy (browser, React Query, Zustand, server-side Redis)
  - Implement lazy loading for all dashboard sections using React.lazy()
  - Add virtual scrolling for large data tables (schools, users)
  - Optimize database queries with proper indexing and materialized views
  - Implement efficient pagination for large datasets
  - _Requirements: 9.1, 9.2, 9.4, 9.5, 9.6, 9.8, 9.9_

- [x] 21.1 Write performance tests
  - Test page load times under 200ms requirement
  - Test virtual scrolling performance with 10,000+ records
  - Test caching effectiveness and cache invalidation
  - _Requirements: 9.1, 9.8_

- [x] 22. Implement input validation and security measures
  - Add comprehensive input sanitization using DOMPurify for all user inputs
  - Implement CSRF protection for all state-changing operations
  - Add sensitive data masking for passwords, API keys, and tokens
  - Implement proper error handling that doesn't expose system information
  - _Requirements: 11.4, 11.5, 11.7, 11.10_

- [x] 22.1 Write property test for input sanitization
  - **Property 9: Input Sanitization Universality**
  - **Validates: Requirements 11.5**

- [x] 22.2 Write property test for sensitive data masking
  - **Property 11: Sensitive Data Masking**
  - **Validates: Requirements 11.7**

- [x] 22.3 Write property test for error handling security
  - **Property 12: Error Handling Security**
  - **Validates: Requirements 11.10**

- [x] 23. Implement data export and reporting capabilities
  - Add CSV export functionality for all major data tables
  - Add PDF report generation for financial summaries using existing PDF generation system
  - Add Excel export for detailed analytics data
  - Implement automated monthly platform performance reports
  - Add custom date range selection for all reports
  - Include data visualization charts in exported reports
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10_

- [x] 23.1 Write unit tests for data export functionality
  - Test export format accuracy and metadata inclusion
  - Test asynchronous processing for large exports
  - Test export history and re-download capabilities
  - _Requirements: 12.7, 12.8, 12.9_

- [x] 24. Implement responsive design and accessibility
  - Ensure responsive design works on desktop, tablet, and mobile devices
  - Implement proper loading states with skeleton screens for all data fetching
  - Add clear error messages with actionable recovery options
  - Implement keyboard navigation support for accessibility
  - Add tooltips and help text for complex features
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.9, 10.10_

- [x] 24.1 Write unit tests for responsive design
  - Test mobile hamburger menu functionality
  - Test loading states and error message display
  - Test keyboard navigation accessibility
  - _Requirements: 10.8, 10.9, 10.10_

- [x] 25. Final integration and system testing
  - Integrate with existing Supabase database schema without modifications
  - Integrate with existing authentication system and user roles
  - Integrate with existing Zustand state management and React Router
  - Integrate with existing notification systems (SMS, email, WhatsApp)
  - Ensure backward compatibility with existing systems
  - Follow existing TypeScript patterns and naming conventions
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 13.9, 13.10_

- [x] 25.1 Write integration tests
  - Test integration with existing authentication system
  - Test integration with existing notification systems
  - Test backward compatibility with existing API endpoints
  - _Requirements: 13.2, 13.6, 13.8_

- [x] 26. Checkpoint - Comprehensive testing and validation
  - Ensure all tests pass (unit tests, property tests, integration tests)
  - Verify performance requirements are met (sub-200ms page loads)
  - Validate security measures are properly implemented
  - Test real-time updates and data synchronization
  - Verify responsive design across all device types
  - Ask the user if questions arise or additional testing is needed

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for complete traceability
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples, edge cases, and integration points
- Checkpoints ensure incremental validation and quality assurance
- The implementation uses TypeScript/React following existing PwezaCore patterns
- All security measures and performance optimizations are built-in from the start
- Real-time updates and caching strategies ensure optimal user experience