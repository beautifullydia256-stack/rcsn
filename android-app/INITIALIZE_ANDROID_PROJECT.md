# Initialize Android Project for React Native

Since we created the React Native code structure but need the native Android project files, follow these steps:

## Option 1: Initialize New React Native Project (Recommended)

1. **Create a new React Native project** in a temporary location:
```bash
npx react-native init PwezaCoreTemp --template react-native-template-typescript
```

2. **Copy the Android folder** from the temp project to your android-app:
```bash
cp -r PwezaCoreTemp/android android-app/
```

3. **Update package.json** in the temp project's android folder to match your app:
   - Change `applicationId` in `android/app/build.gradle` to `com.pwezacore`
   - Update package name in `AndroidManifest.xml`

4. **Copy your src folder** to the temp project:
```bash
cp -r android-app/src PwezaCoreTemp/
cp android-app/App.tsx PwezaCoreTemp/
cp android-app/package.json PwezaCoreTemp/
```

5. **Move everything back**:
```bash
mv PwezaCoreTemp/* android-app/
rm -rf PwezaCoreTemp
```

## Option 2: Manual Setup (If Option 1 doesn't work)

I'll create the essential Android project files for you.

## Option 3: Use React Native CLI to Initialize

```bash
cd android-app
npx react-native init . --template react-native-template-typescript --skip-install
```

This will create the android/ folder with all Gradle files.


