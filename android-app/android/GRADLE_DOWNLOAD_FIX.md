# Fix Gradle Download Timeout Issue

## Problem
Gradle is timing out when trying to download the distribution file.

## Solutions (Try in order)

### Solution 1: Increase Timeout (Already Applied)
I've increased the network timeout from 10 seconds to 60 seconds in `gradle-wrapper.properties`.

### Solution 2: Download Gradle Manually

1. **Download Gradle manually:**
   - Go to: https://gradle.org/releases/
   - Download: Gradle 8.3 (Full distribution)
   - Or direct link: https://services.gradle.org/distributions/gradle-8.3-all.zip

2. **Place it in the Gradle cache:**
   - Windows: `C:\Users\YourUsername\.gradle\wrapper\dists\gradle-8.3-all\`
   - Create the folder structure if it doesn't exist
   - Place the downloaded zip file there (don't extract it)

3. **Retry sync in Android Studio**

### Solution 3: Use a Different Gradle Version

If 8.3 keeps failing, try using Gradle 8.0 which is more stable:

1. Edit `android/gradle/wrapper/gradle-wrapper.properties`
2. Change the version:
   ```
   distributionUrl=https\://services.gradle.org/distributions/gradle-8.0-all.zip
   ```
3. Sync again

### Solution 4: Use Gradle Daemon with Proxy Settings

If you're behind a proxy:

1. Create/edit `android/gradle.properties`
2. Add:
   ```
   systemProp.http.proxyHost=your.proxy.host
   systemProp.http.proxyPort=8080
   systemProp.https.proxyHost=your.proxy.host
   systemProp.https.proxyPort=8080
   ```

### Solution 5: Use Android Studio's Bundled Gradle

1. In Android Studio: **File → Settings → Build, Execution, Deployment → Build Tools → Gradle**
2. Select: **"Use Gradle from: 'wrapper' task in Gradle build script"**
3. Or select: **"Use default Gradle wrapper (recommended)"**
4. Click **Apply** and sync again

### Solution 6: Check Internet Connection

- Make sure you have a stable internet connection
- Try disabling VPN if you're using one
- Check firewall settings

### Solution 7: Clear Gradle Cache and Retry

1. Close Android Studio
2. Delete the Gradle cache:
   - Windows: `C:\Users\YourUsername\.gradle\caches\`
   - Delete the entire `caches` folder
3. Restart Android Studio
4. Try syncing again

## Quick Fix Command (Windows)

Run this in PowerShell to download Gradle manually:

```powershell
# Create the directory
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.gradle\wrapper\dists\gradle-8.3-all\"

# Download Gradle
Invoke-WebRequest -Uri "https://services.gradle.org/distributions/gradle-8.3-all.zip" -OutFile "$env:USERPROFILE\.gradle\wrapper\dists\gradle-8.3-all\gradle-8.3-all.zip"
```

Then retry the sync in Android Studio.

## Alternative: Use Gradle 7.6 (More Stable)

If Gradle 8.3 continues to fail, you can use Gradle 7.6 which is more widely used:

1. Edit `android/gradle/wrapper/gradle-wrapper.properties`
2. Change to:
   ```
   distributionUrl=https\://services.gradle.org/distributions/gradle-7.6.3-all.zip
   ```
3. Also update `android/build.gradle`:
   ```gradle
   classpath("com.android.tools.build:gradle:7.4.2")
   ```
4. Sync again

---

**Try Solution 1 first (already applied), then Solution 2 if it still fails.**


