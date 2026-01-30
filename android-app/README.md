# PwezaCore Mobile - Native Android App

A comprehensive native Android application that replicates all functionality of the PwezaCore web application with full offline support.

## 🚀 Features

### ✅ Implemented
- **Offline-First Architecture**: SQLite database with full offline functionality
- **Supabase Integration**: Automatic sync when online
- **Multi-Role Support**: Admin, Teacher, Parent, Student, Accountant, Librarian, Head Teacher, Owner
- **Authentication**: Secure login with Supabase Auth
- **Navigation**: Role-based navigation with drawer menus
- **State Management**: Redux Toolkit for global state
- **Database Service**: Complete SQLite wrapper with sync tracking

### 🚧 In Progress
- Student Management (CRUD operations)
- Exam Results Entry and Management
- Attendance Tracking
- Financial Management (Payments, Receipts, Expenses)
- Report Generation with PDF Export
- Library Management
- AI Features Integration

## 📋 Prerequisites

- Node.js 18+
- React Native CLI
- Android Studio with Android SDK
- Java Development Kit (JDK) 11+
- Android device or emulator

## 🛠️ Installation

### 1. Install Dependencies

```bash
cd android-app
npm install
```

### 2. Install React Native Dependencies

For iOS (if needed):
```bash
cd ios && pod install && cd ..
```

### 3. Configure Supabase

Update `src/services/SupabaseService.ts` with your Supabase credentials:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key

### 4. Run on Android

```bash
# Start Metro bundler
npm start

# In another terminal, run Android app
npm run android
```

## 📱 Project Structure

```
android-app/
├── src/
│   ├── components/          # Reusable UI components
│   ├── navigation/          # Navigation configuration
│   ├── screens/            # Screen components
│   │   ├── admin/          # Admin screens
│   │   ├── teacher/        # Teacher screens
│   │   ├── parent/         # Parent screens
│   │   ├── student/        # Student screens
│   │   └── auth/           # Authentication screens
│   ├── services/           # Business logic services
│   │   ├── DatabaseService.ts    # SQLite operations
│   │   ├── SupabaseService.ts    # Supabase client
│   │   └── SyncService.ts        # Sync logic
│   ├── store/              # Redux store and slices
│   ├── theme/              # Theme configuration
│   └── utils/              # Utility functions
├── App.tsx                  # Root component
├── package.json
└── tsconfig.json
```

## 🗄️ Database Schema

The app uses SQLite with tables mirroring your Supabase schema:

- `users` - User accounts
- `schools` - School information
- `students` - Student records
- `teachers` - Teacher information
- `exam_results` - Exam results
- `exam_sets` - Exam set definitions
- `payments` - Payment records
- `receipts` - Receipt records
- `expenses` - Expense records
- `attendance` - Attendance records
- `teacher_remarks_settings` - Teacher remark settings
- `class_teacher_comments_settings` - Class teacher comment settings
- `library` - Library resources
- `reports` - Generated reports
- `pending_operations` - Sync queue
- `sync_status` - Sync tracking

## 🔄 Sync System

The app implements an intelligent sync system:

1. **Offline Queue**: All operations are queued when offline
2. **Automatic Sync**: Syncs automatically when connection is restored
3. **Conflict Resolution**: Handles conflicts between local and remote data
4. **Incremental Sync**: Only syncs changed data to save bandwidth
5. **Background Sync**: Syncs in the background every 5 minutes

### Manual Sync

Users can manually trigger sync from the dashboard or settings.

## 🎨 UI Components

- **Material Design**: Using React Native Paper
- **Custom Drawer**: Role-based navigation drawer
- **Cards**: Consistent card-based layouts
- **Forms**: Standardized form inputs
- **Loading States**: Skeleton loaders and activity indicators

## 🔐 Security

- **Secure Storage**: AsyncStorage for sensitive data
- **Row-Level Security**: Respects Supabase RLS policies
- **Token Management**: Automatic token refresh
- **Offline Security**: Local data encryption (to be implemented)

## 📦 Building for Production

### Generate APK

```bash
cd android
./gradlew assembleRelease
```

The APK will be in `android/app/build/outputs/apk/release/`

### Generate AAB (for Play Store)

```bash
cd android
./gradlew bundleRelease
```

The AAB will be in `android/app/build/outputs/bundle/release/`

## 🧪 Testing

```bash
npm test
```

## 📝 Environment Variables

Create a `.env` file in the root:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🐛 Troubleshooting

### Metro Bundler Issues
```bash
npm start -- --reset-cache
```

### Android Build Issues
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### Database Issues
The database is automatically initialized on first app launch. If you need to reset:
- Uninstall the app
- Reinstall and launch

## 📚 Documentation

- [React Native Docs](https://reactnative.dev/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [Supabase Docs](https://supabase.com/docs)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

Same as main PwezaCore project

## 🎯 Roadmap

- [ ] Complete all screen implementations
- [ ] Add PDF generation for reports
- [ ] Implement camera integration for student photos
- [ ] Add push notifications
- [ ] Implement offline conflict resolution UI
- [ ] Add data export functionality
- [ ] Performance optimization
- [ ] Unit and integration tests
- [ ] Play Store deployment

## 💡 Notes

- The app works 100% offline - all data is stored locally in SQLite
- Sync happens automatically when online
- All operations are queued when offline and synced when connection is restored
- The app maintains data consistency with the web application

---

**Built with ❤️ for PwezaCore**


