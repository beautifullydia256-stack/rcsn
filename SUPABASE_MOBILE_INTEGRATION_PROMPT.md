# 🔗 Supabase Mobile App Integration Guide

## 🎯 **Objective**
I need you to help me connect my existing Supabase backend to the Pwezacore mobile app. The app is already built with offline-first SQLite, and now I need to establish the sync connection with my Supabase database.

## 🏗️ **Current Setup**

### **My Existing Supabase Project**
- **Project URL**: https://ibnyclqobbrnjyxbbfsg.supabase.co
- **API Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlibnljbHFvYmJybmp5eGJiZnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzA4NTksImV4cCI6MjA3MzYwNjg1OX0.JR5mcF3o8zDsl65KUgeAsPDDAf8qVhla_wm6gTadeVw
- **Service Role Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlibnljbHFvYmJybmp5eGJiZnNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAzMDg1OSwiZXhwIjoyMDczNjA2ODU5fQ.6JmH9gygbdQV2hbdju19hu0_aPmZ-9vqbXSDvOpdTSc
- **Database**: PostgreSQL with all school management tables
- **Tables**: students, exam_results, processed_primary_exam_results, teacher_remarks_settings, class_teacher_comments_settings, schools, etc.
- **RLS Policies**: Already configured for multi-school access

### **Mobile App Status**
- **Framework**: React Native with TypeScript
- **Local Database**: SQLite with offline-first architecture
- **Sync System**: Framework ready, needs Supabase connection
- **State Management**: Redux Toolkit with sync slice

## 🔧 **Integration Requirements**

### **1. Supabase Client Setup**
- **Install Supabase client** for React Native
- **Configure connection** with project URL and API key
- **Set up authentication** (if needed)
- **Configure real-time subscriptions** for live updates

### **2. Sync Service Implementation**
- **Create sync service** to handle data synchronization
- **Implement conflict resolution** for simultaneous edits
- **Set up background sync** when app comes online
- **Handle offline queue** for pending operations

### **3. Data Mapping**
- **Map SQLite tables** to Supabase tables
- **Handle data type conversions** between local and remote
- **Manage relationships** between tables
- **Ensure data consistency** across platforms

## 📱 **Implementation Steps**

### **Step 1: Install Dependencies**
```bash
npm install @supabase/supabase-js
npm install @react-native-async-storage/async-storage
npm install react-native-url-polyfill
```

### **Step 2: Supabase Configuration**
Create/update the Supabase service file:
```typescript
// src/services/SupabaseService.ts
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = 'https://ibnyclqobbrnjyxbbfsg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlibnljbHFvYmJybmp5eGJiZnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzA4NTksImV4cCI6MjA3MzYwNjg1OX0.JR5mcF3o8zDsl65KUgeAsPDDAf8qVhla_wm6gTadeVw'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Service role client for admin operations (server-side only)
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlibnljbHFvYmJybmp5eGJiZnNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAzMDg1OSwiZXhwIjoyMDczNjA2ODU5fQ.6JmH9gygbdQV2hbdju19hu0_aPmZ-9vqbXSDvOpdTSc'

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

### **Step 3: Sync Service Implementation**
```typescript
// src/services/SyncService.ts
class SyncService {
  async syncStudents() {
    // Sync students between SQLite and Supabase
  }
  
  async syncExamResults() {
    // Sync exam results
  }
  
  async syncSettings() {
    // Sync teacher remarks and class comments settings
  }
  
  async handleConflicts() {
    // Resolve conflicts between local and remote data
  }
}
```

### **Step 4: Background Sync Setup**
```typescript
// src/services/BackgroundSync.ts
import { AppState } from 'react-native'

class BackgroundSync {
  setupBackgroundSync() {
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        this.performSync()
      }
    })
  }
  
  async performSync() {
    // Sync data when app becomes active
  }
}
```

## 🔄 **Sync Strategy**

### **Sync Priorities**
1. **High Priority**: Students, exam results, critical settings
2. **Medium Priority**: Teacher remarks, class comments
3. **Low Priority**: Reports, analytics, photos

### **Conflict Resolution**
- **Last Modified Wins**: For simple conflicts
- **User Choice**: For complex conflicts (show both versions)
- **Automatic Merge**: For non-conflicting fields

### **Offline Queue Management**
```typescript
// src/services/OfflineQueue.ts
class OfflineQueue {
  async addOperation(operation: PendingOperation) {
    // Add operation to local queue
  }
  
  async processQueue() {
    // Process pending operations when online
  }
  
  async retryFailedOperations() {
    // Retry failed sync operations
  }
}
```

## 🛠️ **What I Need You to Do**

### **1. Configuration Setup**
- **Help me configure** the Supabase client in the app
- **Set up the connection** with my existing Supabase project
- **Configure authentication** if needed
- **Test the connection** to ensure it works

### **2. Sync Service Implementation**
- **Create the sync service** to handle data synchronization
- **Implement conflict resolution** logic
- **Set up background sync** functionality
- **Handle offline queue** management

### **3. Data Mapping**
- **Map SQLite tables** to Supabase tables
- **Handle data type conversions** properly
- **Ensure data consistency** between local and remote
- **Test data synchronization** thoroughly

### **4. Testing & Debugging**
- **Test sync functionality** with real data
- **Debug any connection issues**
- **Verify data integrity** after sync
- **Test offline/online scenarios**

## 📋 **Configuration Checklist**

### **Supabase Setup**
- [ ] Install Supabase client dependencies
- [ ] Configure Supabase client with URL and API key
- [ ] Set up AsyncStorage for session persistence
- [ ] Test connection to Supabase

### **Sync Implementation**
- [ ] Create sync service for each table
- [ ] Implement conflict resolution logic
- [ ] Set up background sync triggers
- [ ] Handle offline queue operations

### **Data Mapping**
- [ ] Map students table
- [ ] Map exam_results table
- [ ] Map processed_primary_exam_results table
- [ ] Map teacher_remarks_settings table
- [ ] Map class_teacher_comments_settings table
- [ ] Map schools table

### **Testing**
- [ ] Test online sync functionality
- [ ] Test offline data persistence
- [ ] Test conflict resolution
- [ ] Test background sync
- [ ] Verify data integrity

## 🚨 **Important Considerations**

### **Security**
- **Use environment variables** for API keys
- **Implement proper RLS policies** in Supabase
- **Handle authentication** securely
- **Validate data** before syncing

### **Performance**
- **Implement incremental sync** to save bandwidth
- **Use batch operations** for large data sets
- **Optimize sync frequency** based on usage
- **Handle large files** efficiently

### **Error Handling**
- **Handle network errors** gracefully
- **Implement retry logic** for failed operations
- **Show sync status** to users
- **Log errors** for debugging

## 🎯 **Expected Outcome**

After implementation, the app should:
- **Connect successfully** to your Supabase database
- **Sync data automatically** when online
- **Handle conflicts** intelligently
- **Work offline** with pending sync queue
- **Maintain data consistency** across platforms

## 📱 **Next Steps**

1. **Use the provided credentials** (already configured above)
2. **Let me configure** the connection with your actual Supabase project
3. **Implement the sync service** for all tables
4. **Test the integration** thoroughly
5. **Deploy and verify** everything works

## 🔑 **Your Supabase Credentials (Ready to Use)**

- **Project URL**: https://ibnyclqobbrnjyxbbfsg.supabase.co
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlibnljbHFvYmJybmp5eGJiZnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzA4NTksImV4cCI6MjA3MzYwNjg1OX0.JR5mcF3o8zDsl65KUgeAsPDDAf8qVhla_wm6gTadeVw
- **Service Role Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlibnljbHFvYmJybmp5eGJiZnNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAzMDg1OSwiZXhwIjoyMDczNjA2ODU5fQ.6JmH9gygbdQV2hbdju19hu0_aPmZ-9vqbXSDvOpdTSc

**Please help me connect the mobile app to my Supabase backend and implement the sync functionality using these credentials!**
