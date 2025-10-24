# 📱 Pwezacore Mobile App - Development Prompt

## 🎯 **Project Overview**
I need you to help me create a mobile app (Android) called **Pwezacore** that replicates the functionality of my existing school management web application with offline capabilities for deployment on Google Play Store and APK distribution.

## 🏗️ **My Existing Web Application Context**
I have a fully functional Next.js school management system with Supabase backend that includes:

- **Current System**: Next.js school management system with Supabase backend
- **Core Features**: Student management, exam results, report generation, teacher remarks, class teacher comments
- **Database**: Supabase with PostgreSQL
- **Key Tables**: students, exam_results, processed_primary_exam_results, teacher_remarks_settings, class_teacher_comments_settings, schools
- **Report Templates**: Multiple report formats including Template3KyoteraReport
- **Automation**: Database triggers for auto-processing exam results and generating comments
- **Multi-school Support**: The system supports multiple schools with proper data isolation
- **Real-time Updates**: All changes are automatically processed and reflected in reports

## 📱 **What I Need You to Build**

### **Technology Stack (Your Recommendation)**
Please recommend and implement:
- **Framework**: React Native (recommended) or Flutter
- **Local Database**: SQLite for offline storage
- **Backend Sync**: Supabase integration
- **UI Library**: React Native Paper (if RN) or Material Design (if Flutter)
- **State Management**: Redux Toolkit or Zustand
- **Navigation**: React Navigation (if RN) or Flutter Navigation

### **Core Features to Implement**

#### **1. Offline-First Architecture (CRITICAL)**
- Local SQLite database mirroring my Supabase schema exactly
- Background sync when internet available
- Conflict resolution for simultaneous edits
- Queue system for pending operations
- Clear offline/online status indicators
- **This is the most important feature - the app must work 100% offline**

#### **2. Student Management**
- Student profiles with photo capture/upload
- Add/edit students offline
- Search and filter functionality
- Bulk import/export capabilities
- Student photo management (base64 storage)

#### **3. Exam Management**
- Create and manage exam sets
- Enter exam results offline
- Auto-calculate grades, positions, and averages
- Support for multiple exam types (Mid Term, End of Term)
- Grade calculation based on percentage ranges

#### **4. Report Generation**
- Generate student reports offline
- Multiple report templates (including Template3KyoteraReport equivalent)
- PDF export functionality
- Print-ready formats
- Email sharing when online
- Report preview before generation

#### **5. Settings Management**
- Teacher remarks settings (percentage-based)
- Class teacher comments settings (average-based)
- School configuration
- User preferences and themes
- Sync settings and preferences

#### **6. Sync System**
- Smart sync priorities (critical data first)
- Incremental sync to save bandwidth
- Conflict resolution for simultaneous edits
- Background sync with progress indicators
- Manual sync trigger option

### **Database Schema (SQLite)**

#### **Core Tables (Mirror Supabase)**
```sql
-- Students table
CREATE TABLE students (
  student_id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  name TEXT NOT NULL,
  admission_number TEXT UNIQUE,
  current_class TEXT,
  photo_base64 TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Exam results table
CREATE TABLE exam_results (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  exam_set_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  class_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  marks_obtained INTEGER,
  total_marks INTEGER,
  grade TEXT,
  remarks TEXT,
  teacher_initials TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Processed exam results table
CREATE TABLE processed_primary_exam_results (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  class_name TEXT NOT NULL,
  exam_set_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  mid_term_marks INTEGER,
  end_term_marks INTEGER,
  teacher_remark TEXT,
  teacher_initials TEXT,
  class_teacher_comment TEXT,
  headteacher_comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Teacher remarks settings
CREATE TABLE teacher_remarks_settings (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  min_percent INTEGER NOT NULL,
  max_percent INTEGER NOT NULL,
  comment_text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Class teacher comments settings
CREATE TABLE class_teacher_comments_settings (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  class_name TEXT NOT NULL,
  min_percent INTEGER NOT NULL,
  max_percent INTEGER NOT NULL,
  comment_text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Schools table
CREATE TABLE schools (
  school_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### **Sync Management Tables**
```sql
-- Sync status tracking
CREATE TABLE sync_status (
  table_name TEXT PRIMARY KEY,
  last_sync DATETIME,
  pending_changes INTEGER DEFAULT 0,
  sync_in_progress BOOLEAN DEFAULT FALSE
);

-- Pending operations queue
CREATE TABLE pending_operations (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation_type TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  record_id TEXT NOT NULL,
  data TEXT NOT NULL, -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  retry_count INTEGER DEFAULT 0
);
```

### **App Structure & Navigation**

#### **Main Navigation**
```
🏠 Dashboard
├── 👥 Students
│   ├── Student List (with search/filter)
│   ├── Add Student (with photo capture)
│   └── Student Profile (edit/view)
├── 📝 Exams
│   ├── Exam Sets Management
│   ├── Enter Results (offline)
│   └── View Results (with calculations)
├── 📊 Reports
│   ├── Generate Reports (offline)
│   ├── Report Templates
│   ├── Report Preview
│   └── Print/Share Options
├── ⚙️ Settings
│   ├── School Settings
│   ├── Teacher Remarks Settings
│   ├── Class Teacher Comments
│   ├── Sync Settings
│   └── App Preferences
└── 🔄 Sync Status
    ├── Sync Progress
    ├── Pending Operations
    └── Conflict Resolution
```

### **Key Business Logic to Implement**

#### **1. Grade Calculation**
```javascript
// Grade calculation based on percentage
function calculateGrade(percentage) {
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}
```

#### **2. Position Calculation**
```javascript
// Calculate student position in class
function calculatePosition(studentMarks, allStudentMarks) {
  const sortedMarks = allStudentMarks.sort((a, b) => b - a);
  return sortedMarks.indexOf(studentMarks) + 1;
}
```

#### **3. Teacher Remarks Generation**
```javascript
// Generate teacher remarks based on percentage and settings
function generateTeacherRemark(percentage, subject, schoolId) {
  // Query teacher_remarks_settings table
  // Find matching percentage range
  // Return appropriate comment
}
```

#### **4. Class Teacher Comments**
```javascript
// Generate class teacher comments based on overall average
function generateClassTeacherComment(averagePercentage, className, schoolId) {
  // Query class_teacher_comments_settings table
  // Find matching percentage range
  // Return appropriate comment
}
```

### **Mobile-Specific Features**

#### **1. Camera Integration**
- Photo capture for student profiles
- Document scanning for report cards
- QR code scanning for quick student lookup

#### **2. Device Integration**
- File sharing with other apps
- Print functionality via mobile printers
- Backup to cloud storage (Google Drive, etc.)

#### **3. Push Notifications**
- Sync completion alerts
- Exam deadline reminders
- System update notifications

#### **4. Offline UX**
- Clear offline indicators
- Pending sync notifications
- Conflict resolution dialogs
- Progress indicators for sync operations

### **Sync Strategy**

#### **Sync Priorities**
1. **High Priority**: Students, exam results, critical settings
2. **Medium Priority**: Teacher remarks, class comments, school settings
3. **Low Priority**: Reports, analytics, photos
4. **Background**: Large files, documents

#### **Conflict Resolution**
- **Last Modified Wins**: For simple conflicts
- **User Choice**: For complex conflicts (show both versions)
- **Automatic Merge**: For non-conflicting fields

### **Development Phases**

#### **Phase 1: Foundation (2-3 weeks)**
- Project setup and configuration
- SQLite database implementation
- Basic navigation structure
- Core data models

#### **Phase 2: Student Management (2-3 weeks)**
- Student CRUD operations
- Photo capture and storage
- Search and filter functionality
- Offline data persistence

#### **Phase 3: Exam System (3-4 weeks)**
- Exam result entry
- Grade and position calculations
- Report generation
- PDF export functionality

#### **Phase 4: Sync System (2-3 weeks)**
- Supabase integration
- Background sync implementation
- Conflict resolution
- Sync status management

#### **Phase 5: Polish & Testing (2-3 weeks)**
- UI/UX refinement
- Performance optimization
- Testing and bug fixes
- Play Store preparation

### **Deployment Strategy**

#### **Google Play Store**
- **Free Version**: Basic features with limited sync
- **Pro Version**: Full features with unlimited sync
- **School Packages**: Multi-user licenses

#### **APK Distribution**
- Direct download from website
- School-specific customizations
- Offline installer packages

### **Target Market**
- Rural schools with poor internet connectivity
- International schools in developing countries
- Homeschooling communities
- Private tutors and small academies
- Schools needing offline-first solutions

### **Success Metrics**
- Offline functionality working 100%
- Sync completion rate > 95%
- User satisfaction with offline experience
- Play Store rating > 4.5 stars
- Download and adoption rates

## 🚀 **What I Need You to Do Right Now**

Please help me:

1. **Set up the project structure** with the recommended technology stack
2. **Initialize the mobile app** with proper configuration
3. **Implement the SQLite database schema** exactly as specified above
4. **Create the basic navigation** and UI components
5. **Start with the student management module** as the first feature
6. **Set up the sync system** to work with my existing Supabase backend

## 🎯 **My Expectations**

- **Start coding immediately** - I want to see progress today
- **Follow the exact database schema** I provided above
- **Implement offline-first approach** - this is critical
- **Make it production-ready** for Play Store deployment
- **Ensure compatibility** with my existing web application data

## 📝 **Important Notes**
- **Maintain consistency** with my existing web app design
- **Ensure data compatibility** between web and mobile versions
- **Focus on offline-first approach** - this is the main selling point
- **Prioritize user experience** on mobile devices
- **Consider tablet support** for larger screens
- **Implement proper error handling** and user feedback
- **Make it look professional** for Play Store deployment

---

## 🎯 **Project Summary**
**App Name**: Pwezacore Mobile  
**Repository**: [To be created]  
**Technology**: React Native (recommended) or Flutter  
**Database**: SQLite (local) + Supabase (sync)  
**Target**: Android (with potential iOS expansion)  
**Timeline**: 12-16 weeks for full implementation  

**I'm ready to start development immediately. Please begin with project setup and the first module!**
