# Android App Setup Guide

## Complete Setup Instructions

### Step 1: Install Prerequisites

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **Java Development Kit (JDK)** (v11 or higher)
   - Download from: https://adoptium.net/
   - Set JAVA_HOME environment variable

3. **Android Studio**
   - Download from: https://developer.android.com/studio
   - Install Android SDK (API 33+)
   - Set ANDROID_HOME environment variable

4. **React Native CLI**
   ```bash
   npm install -g react-native-cli
   ```

### Step 2: Initialize React Native Project

If starting fresh:
```bash
npx react-native init PwezaCoreMobile --template react-native-template-typescript
```

### Step 3: Install Dependencies

```bash
cd android-app
npm install
```

### Step 4: Install Additional Native Dependencies

Some packages require native linking:

```bash
# For SQLite
npm install react-native-sqlite-storage

# For vector icons
npm install react-native-vector-icons

# Link native modules (if needed)
npx react-native link
```

### Step 5: Android Configuration

1. **Update `android/build.gradle`**:
```gradle
buildscript {
    ext {
        buildToolsVersion = "33.0.0"
        minSdkVersion = 21
        compileSdkVersion = 33
        targetSdkVersion = 33
        ndkVersion = "23.1.7779620"
    }
}
```

2. **Update `android/app/build.gradle`**:
```gradle
android {
    defaultConfig {
        applicationId "com.pwezacore"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0.0"
    }
}
```

3. **Add Permissions to `android/app/src/main/AndroidManifest.xml`**:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### Step 6: Configure Supabase

Update `src/services/SupabaseService.ts`:
- Replace `SUPABASE_URL` with your project URL
- Replace `SUPABASE_ANON_KEY` with your anon key

### Step 7: Run the App

```bash
# Start Metro bundler
npm start

# In another terminal, run Android
npm run android
```

### Step 8: Build for Production

#### Debug APK
```bash
cd android
./gradlew assembleDebug
```

#### Release APK
```bash
cd android
./gradlew assembleRelease
```

#### Release AAB (for Play Store)
```bash
cd android
./gradlew bundleRelease
```

## Common Issues and Solutions

### Issue: Metro bundler won't start
**Solution**: Clear cache and restart
```bash
npm start -- --reset-cache
```

### Issue: Android build fails
**Solution**: Clean and rebuild
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### Issue: SQLite not working
**Solution**: Ensure SQLite plugin is properly linked
```bash
npx react-native link react-native-sqlite-storage
```

### Issue: Vector icons not showing
**Solution**: Link the library and rebuild
```bash
npx react-native link react-native-vector-icons
cd android
./gradlew clean
cd ..
npm run android
```

## Testing on Physical Device

1. Enable Developer Options on your Android device
2. Enable USB Debugging
3. Connect device via USB
4. Run `adb devices` to verify connection
5. Run `npm run android`

## Environment Setup Checklist

- [ ] Node.js installed (v18+)
- [ ] JDK installed (v11+)
- [ ] Android Studio installed
- [ ] Android SDK installed (API 33+)
- [ ] JAVA_HOME set
- [ ] ANDROID_HOME set
- [ ] React Native CLI installed
- [ ] Dependencies installed (`npm install`)
- [ ] Supabase credentials configured
- [ ] Android device/emulator ready
- [ ] App runs successfully (`npm run android`)

## Next Steps

1. Test all features offline
2. Test sync functionality
3. Test on multiple devices
4. Prepare for Play Store submission
5. Generate signed APK/AAB
6. Submit to Google Play Store

---

For more help, refer to:
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Android Development Guide](https://developer.android.com/guide)


