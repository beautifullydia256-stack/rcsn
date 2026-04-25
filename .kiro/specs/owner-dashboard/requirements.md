# Requirements Document

## Introduction

The Owner Dashboard is a comprehensive administrative interface for the PwezaCore school management SaaS platform. This dashboard provides the platform owner (super admin) with complete visibility and control across all schools, users, finances, and system health metrics. The owner manages the entire multi-tenant platform, not just individual schools, requiring specialized tools for platform-wide oversight, monitoring, and administration.

## Glossary

- **Owner**: The super admin user with role 'owner' who manages the entire PwezaCore platform across all schools
- **School_Admin**: A user with role 'admin' who manages a single school within the platform
- **Multi_Tenant_Platform**: The SaaS architecture where multiple schools operate independently within the same system
- **Dashboard**: The main landing page interface displaying key metrics and system overview
- **Sidebar_Navigation**: The primary navigation menu providing access to all dashboard sections
- **Real_Time_Updates**: Live data updates without page refresh for critical metrics
- **System_Health**: Overall platform performance including database, storage, and API metrics
- **Revenue_Metrics**: Financial data including subscriptions, MRR (Monthly Recurring Revenue), and platform earnings
- **School_Instance**: An individual school's data and configuration within the multi-tenant system
- **Subscription_Plan**: The billing tier (Basic, Standard, Premium) assigned to each school
- **Storage_Quota**: The file storage limit allocated to each school based on their subscription plan
- **API_Usage**: Supabase API calls and database operations performed by schools
- **Audit_Trail**: Comprehensive logging of important system actions and changes
- **Feature_Flag**: Configuration setting to enable/disable features per school for testing or rollout
- **Churn_Risk**: Schools showing signs of potential cancellation (inactive usage, overdue payments)

## Requirements

### Requirement 1: Dashboard Landing Page

**User Story:** As a platform owner, I want a comprehensive dashboard overview, so that I can quickly assess platform health and performance.

#### Acceptance Criteria

1. WHEN the owner logs in, THE Dashboard SHALL display the main landing page as the default view
2. THE Dashboard SHALL display total schools count across the entire platform
3. THE Dashboard SHALL display active schools count (schools with activity in the last 30 days)
4. THE Dashboard SHALL display total users count across all schools and roles
5. THE Dashboard SHALL display monthly revenue from subscription earnings
6. THE Dashboard SHALL display database size metrics from Supabase
7. THE Dashboard SHALL display total storage usage across all schools
8. THE Dashboard SHALL display API calls count for the current day
9. THE Dashboard SHALL display active sessions count (currently logged-in users)
10. THE Dashboard SHALL display a 12-month bar chart showing new schools joined each month
11. THE Dashboard SHALL display user growth trend chart over time
12. THE Dashboard SHALL display monthly recurring revenue trend chart
13. THE Dashboard SHALL display schools with subscriptions expiring within 30 days
14. THE Dashboard SHALL display schools inactive for 30+ days as churn risk alerts
15. THE Dashboard SHALL display database errors from the last 24 hours
16. THE Dashboard SHALL display storage warnings for schools approaching their limits
17. THE Dashboard SHALL display failed payment triggers and system errors
18. THE Dashboard SHALL display latest schools that joined the platform
19. THE Dashboard SHALL display latest system errors with timestamps
20. THE Dashboard SHALL display latest support tickets submitted
21. THE Dashboard SHALL display latest admin logins with location information
22. THE Dashboard SHALL display a per-school snapshot table with school name, plan, student count, last active date, storage usage, and subscription status
23. THE Dashboard SHALL provide quick actions (View, Suspend, Message) for each school in the snapshot table

### Requirement 2: Modern Sidebar Navigation

**User Story:** As a platform owner, I want a modern sidebar navigation system, so that I can efficiently access all dashboard sections.

#### Acceptance Criteria

1. THE Sidebar_Navigation SHALL display a MAIN section containing Dashboard and Notifications links
2. THE Sidebar_Navigation SHALL display a SCHOOLS section containing All Schools, Add School, School Requests, and Suspended Schools links
3. THE Sidebar_Navigation SHALL display a USERS section containing All Users, Admins, User Roles, and Login Activity links
4. THE Sidebar_Navigation SHALL display a FINANCE section containing Revenue Overview, Subscriptions, Invoices, and Payouts links
5. THE Sidebar_Navigation SHALL display a SYSTEM section containing Database Health, Storage Usage, API Usage, Error Logs, and Audit Log links
6. THE Sidebar_Navigation SHALL display a CONTENT section containing Announcements, Support Tickets, and Feature Flags links
7. THE Sidebar_Navigation SHALL display a SETTINGS section containing Platform Settings, Billing Plans, Security, and Backup & Recovery links
8. THE Sidebar_Navigation SHALL highlight the currently active section
9. THE Sidebar_Navigation SHALL be responsive and collapse on smaller screens
10. THE Sidebar_Navigation SHALL maintain consistent styling with the existing PwezaCore design system

### Requirement 3: School Management Interface

**User Story:** As a platform owner, I want comprehensive school management capabilities, so that I can oversee all schools on the platform.

#### Acceptance Criteria

1. THE All_Schools_Page SHALL display every school with status indicators (active, inactive, trial, suspended)
2. THE All_Schools_Page SHALL provide filtering by school status, subscription plan, and activity level
3. THE All_Schools_Page SHALL provide search functionality by school name and location
4. THE Add_School_Page SHALL provide a form to onboard new schools to the platform
5. THE School_Requests_Page SHALL display pending applications from schools wanting to join the platform
6. THE School_Requests_Page SHALL provide approval and rejection actions for pending requests
7. THE Suspended_Schools_Page SHALL display all disabled schools in a separate view
8. THE Suspended_Schools_Page SHALL provide reactivation and permanent removal actions
9. WHEN a school is suspended, THE System SHALL prevent all users from that school from logging in
10. WHEN a school is reactivated, THE System SHALL restore normal access for that school's users

### Requirement 4: User Management System

**User Story:** As a platform owner, I want comprehensive user management across all schools, so that I can monitor and control platform access.

#### Acceptance Criteria

1. THE All_Users_Page SHALL display every user across all schools with their role, school, and status
2. THE All_Users_Page SHALL provide filtering by user role (admin, teacher, parent, student, accountant, librarian, head_teacher)
3. THE All_Users_Page SHALL provide filtering by school and user status
4. THE Admins_Page SHALL display only users with 'admin' role as primary school contacts
5. THE User_Roles_Page SHALL provide interface to manage permissions across the system
6. THE Login_Activity_Page SHALL display user login history with timestamps, IP addresses, and locations
7. THE Login_Activity_Page SHALL provide security monitoring alerts for suspicious login patterns
8. WHEN suspicious login activity is detected, THE System SHALL flag it for owner review
9. THE System SHALL track failed login attempts and account lockouts
10. THE System SHALL provide user impersonation capability for support purposes with audit logging

### Requirement 5: Financial Management Dashboard

**User Story:** As a platform owner, I want comprehensive financial oversight, so that I can monitor platform revenue and school subscriptions.

#### Acceptance Criteria

1. THE Revenue_Overview_Page SHALL display total platform earnings from subscription fees
2. THE Revenue_Overview_Page SHALL display Monthly Recurring Revenue (MRR) metrics
3. THE Revenue_Overview_Page SHALL display annual revenue totals and projections
4. THE Revenue_Overview_Page SHALL display revenue breakdown by subscription plan
5. THE Subscriptions_Page SHALL display all school subscription plans with expiration dates
6. THE Subscriptions_Page SHALL highlight overdue accounts and payment failures
7. THE Subscriptions_Page SHALL provide subscription modification capabilities
8. THE Invoices_Page SHALL display subscription billing history to schools
9. THE Invoices_Page SHALL provide invoice generation and resend functionality
10. THE Payouts_Page SHALL display platform percentage earnings from school transactions (if applicable)
11. WHEN a subscription expires, THE System SHALL automatically downgrade the school to free tier
12. WHEN payment fails, THE System SHALL retry according to configured retry policy
13. THE System SHALL generate automated dunning emails for overdue accounts

### Requirement 6: System Health Monitoring

**User Story:** As a platform owner, I want comprehensive system health monitoring, so that I can ensure platform reliability and performance.

#### Acceptance Criteria

1. THE Database_Health_Page SHALL display table sizes and row counts per school
2. THE Database_Health_Page SHALL display slow query analysis and performance metrics
3. THE Database_Health_Page SHALL display database errors and connection issues
4. THE Storage_Usage_Page SHALL display per-school storage usage versus their allocated limits
5. THE Storage_Usage_Page SHALL provide alerts when schools approach storage quotas
6. THE API_Usage_Page SHALL display Supabase API calls per school per day
7. THE API_Usage_Page SHALL monitor API rate limits and usage patterns
8. THE Error_Logs_Page SHALL display system errors, failed transactions, and trigger failures
9. THE Error_Logs_Page SHALL provide error categorization and severity levels
10. THE Audit_Log_Page SHALL record all important system actions including deletions, reversals, and configuration changes
11. WHEN database performance degrades, THE System SHALL alert the owner immediately
12. WHEN storage limits are exceeded, THE System SHALL prevent further uploads for that school
13. WHEN API limits are approached, THE System SHALL throttle requests and notify the owner

### Requirement 7: Content and Communication Management

**User Story:** As a platform owner, I want content and communication management tools, so that I can broadcast information and manage support requests.

#### Acceptance Criteria

1. THE Announcements_Page SHALL provide interface to create broadcast messages to all schools
2. THE Announcements_Page SHALL support targeted announcements to specific school groups
3. THE Announcements_Page SHALL provide scheduling for future announcement delivery
4. THE Support_Tickets_Page SHALL display all issues raised by schools across the platform
5. THE Support_Tickets_Page SHALL provide ticket assignment, status tracking, and resolution tools
6. THE Support_Tickets_Page SHALL categorize tickets by priority and issue type
7. THE Feature_Flags_Page SHALL provide interface to enable/disable features per school
8. THE Feature_Flags_Page SHALL support beta testing by enabling features for selected schools
9. WHEN an announcement is created, THE System SHALL deliver it to all targeted schools
10. WHEN a support ticket is created, THE System SHALL notify the owner and assign ticket numbers
11. WHEN feature flags are modified, THE System SHALL apply changes immediately without restart

### Requirement 8: Platform Configuration Management

**User Story:** As a platform owner, I want platform configuration management capabilities, so that I can control global settings and policies.

#### Acceptance Criteria

1. THE Platform_Settings_Page SHALL provide configuration for payment gateways across the platform
2. THE Platform_Settings_Page SHALL provide configuration for SMS and email service providers
3. THE Platform_Settings_Page SHALL provide configuration for global storage limits per subscription tier
4. THE Billing_Plans_Page SHALL provide interface to manage subscription tiers (Basic, Standard, Premium)
5. THE Billing_Plans_Page SHALL allow modification of plan features, pricing, and limits
6. THE Security_Page SHALL provide configuration for password policies across all schools
7. THE Security_Page SHALL provide configuration for session timeouts and 2FA requirements
8. THE Security_Page SHALL provide IP whitelisting and access control settings
9. THE Backup_Recovery_Page SHALL provide database backup scheduling configuration
10. THE Backup_Recovery_Page SHALL provide restore point management and recovery tools
11. WHEN platform settings are modified, THE System SHALL apply changes to all affected schools
12. WHEN security policies are updated, THE System SHALL enforce them on next user login
13. WHEN backup schedules are modified, THE System SHALL update the automated backup jobs

### Requirement 9: Performance and Real-Time Updates

**User Story:** As a platform owner, I want instant page loads and real-time updates, so that I can efficiently monitor the platform without delays.

#### Acceptance Criteria

1. THE Dashboard SHALL load within 200ms for all page navigations
2. THE Dashboard SHALL implement efficient caching strategies for frequently accessed data
3. THE Dashboard SHALL use real-time updates for critical metrics without full page refresh
4. THE Dashboard SHALL implement optimized database queries to handle multi-school data efficiently
5. THE Dashboard SHALL use pagination for large data sets to maintain performance
6. THE Dashboard SHALL implement lazy loading for non-critical dashboard sections
7. WHEN real-time data changes occur, THE Dashboard SHALL update affected metrics within 5 seconds
8. WHEN large datasets are displayed, THE System SHALL implement virtual scrolling for performance
9. THE System SHALL cache aggregated metrics and refresh them every 5 minutes
10. THE System SHALL use database indexes optimized for cross-school queries

### Requirement 10: Responsive Design and User Experience

**User Story:** As a platform owner, I want a modern, responsive interface, so that I can access the dashboard from any device efficiently.

#### Acceptance Criteria

1. THE Dashboard SHALL implement responsive design that works on desktop, tablet, and mobile devices
2. THE Dashboard SHALL maintain consistent styling with the existing PwezaCore design system
3. THE Dashboard SHALL use Tailwind CSS classes consistent with the current codebase
4. THE Dashboard SHALL implement proper loading states for all data fetching operations
5. THE Dashboard SHALL provide clear error messages and recovery options when operations fail
6. THE Dashboard SHALL implement keyboard navigation support for accessibility
7. THE Dashboard SHALL provide tooltips and help text for complex features
8. WHEN accessed on mobile devices, THE Sidebar_Navigation SHALL collapse into a hamburger menu
9. WHEN data is loading, THE Dashboard SHALL display skeleton screens or loading indicators
10. WHEN errors occur, THE Dashboard SHALL provide actionable error messages with retry options

### Requirement 11: Security and Access Control

**User Story:** As a platform owner, I want robust security measures, so that I can safely manage sensitive platform data and operations.

#### Acceptance Criteria

1. THE Dashboard SHALL verify that only users with role 'owner' can access any dashboard functionality
2. THE Dashboard SHALL implement session management with automatic timeout for security
3. THE Dashboard SHALL log all owner actions in the audit trail for security compliance
4. THE Dashboard SHALL implement CSRF protection for all state-changing operations
5. THE Dashboard SHALL sanitize all user inputs to prevent XSS attacks
6. THE Dashboard SHALL implement rate limiting for API calls to prevent abuse
7. THE Dashboard SHALL mask sensitive data (passwords, API keys) in all displays
8. WHEN unauthorized access is attempted, THE System SHALL log the attempt and deny access
9. WHEN sensitive operations are performed, THE System SHALL require additional authentication
10. THE System SHALL implement proper error handling that doesn't expose sensitive system information

### Requirement 12: Data Export and Reporting

**User Story:** As a platform owner, I want data export and reporting capabilities, so that I can analyze platform performance and generate business reports.

#### Acceptance Criteria

1. THE Dashboard SHALL provide CSV export functionality for all major data tables
2. THE Dashboard SHALL provide PDF report generation for financial summaries
3. THE Dashboard SHALL provide Excel export for detailed analytics data
4. THE Dashboard SHALL generate automated monthly platform performance reports
5. THE Dashboard SHALL provide custom date range selection for all reports
6. THE Dashboard SHALL include data visualization charts in exported reports
7. WHEN reports are generated, THE System SHALL include metadata (generation date, filters applied)
8. WHEN large exports are requested, THE System SHALL process them asynchronously and notify when complete
9. THE System SHALL maintain export history and allow re-downloading of previous reports
10. THE System SHALL implement proper data formatting and headers in all export formats

### Requirement 13: Integration with Existing System

**User Story:** As a platform owner, I want seamless integration with the existing PwezaCore system, so that the dashboard works harmoniously with current functionality.

#### Acceptance Criteria

1. THE Dashboard SHALL integrate with the existing Supabase database schema without modifications
2. THE Dashboard SHALL use the existing authentication system and user roles
3. THE Dashboard SHALL integrate with the existing Zustand state management system
4. THE Dashboard SHALL use the existing React Router navigation system
5. THE Dashboard SHALL follow the existing TypeScript patterns and interfaces
6. THE Dashboard SHALL integrate with existing notification systems (SMS, email, WhatsApp)
7. THE Dashboard SHALL use existing API endpoints where applicable and create new ones as needed
8. WHEN integrating with existing systems, THE Dashboard SHALL maintain backward compatibility
9. WHEN new API endpoints are created, THE System SHALL follow existing naming conventions and patterns
10. THE System SHALL reuse existing utility functions and components where appropriate