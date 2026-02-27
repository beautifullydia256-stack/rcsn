# Android Studio – PwezaCore

## Opening the project in Android Studio

1. **Start Android Studio.**

2. **Open the Android project:**
   - **File → Open** (or **Open** on the welcome screen).
   - Go to:
     ```
     C:\Pwezacore\pwezacore\android-app\android
     ```
   - Select the **`android`** folder (the one that contains `build.gradle`, `settings.gradle`, `app/`).  
   - Click **OK**.

3. **Wait for Gradle sync** to finish (first time can take a few minutes).

4. **Run the app:**
   - Connect an Android device with USB debugging, or start an **AVD** (Tools → Device Manager).
   - Click the green **Run** button (or **Run → Run 'app'**).  
   The app will build and install on the device/emulator.

**Important:** Open the **`android`** folder, not the repo root or `android-app` alone. The Gradle project root is `android-app\android`.

---

## Opening the Desktop app in Android Studio (optional)

To work on or run the **Compose Desktop** app (JVM) in Android Studio:

1. **File → Open** → go to `C:\Pwezacore\pwezacore\desktop-app`.
2. Select the **`desktop-app`** folder and click **OK**.
3. After sync, in the **Gradle** tool window: **desktop-app → app → Tasks → compose desktop → run** (double-click **run**), or right-click `app/src/main/kotlin/com/pwezacore/desktop/Main.kt` → **Run 'MainKt'**.

---

# Gradle lock / sync issues

## JAVA_HOME not set (when running `.\gradlew` in terminal)

Gradle needs a JDK. Use **Android Studio’s bundled JDK** (no extra install).

### Option A: Set JAVA_HOME for this PowerShell session (quick test)

In PowerShell, run (use the path where **your** Android Studio is installed):

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew --stop
```

If Android Studio is installed elsewhere, use that path and add `\jbr` at the end (e.g. `D:\Android Studio\jbr`).

### Option B: Set JAVA_HOME permanently (recommended)

1. Find the Gradle JDK path in Android Studio:
   - **File → Settings** (or **Android Studio → Settings** on Mac)
   - **Build, Execution, Deployment → Build Tools → Gradle**
   - Note the **Gradle JDK** path (e.g. `C:\Program Files\Android\Android Studio\jbr`).

2. Set JAVA_HOME in Windows:
   - Press **Win + R**, type `sysdm.cpl`, Enter.
   - **Advanced** tab → **Environment Variables**.
   - Under **User variables** (or **System variables**), click **New**:
     - Variable name: `JAVA_HOME`
     - Variable value: the path from step 1 (e.g. `C:\Program Files\Android\Android Studio\jbr`).
   - Click **OK** everywhere and **close any open PowerShell/terminal windows**.

3. Open a **new** PowerShell window and run:
   ```powershell
   cd C:\Pwezacore\pwezacore\android-app\android
   .\gradlew --stop
   ```

### Option C: Use Gradle’s Java home (no JAVA_HOME needed)

In `android-app/android/gradle.properties`, uncomment and set the line (use your Android Studio `jbr` path):

```properties
org.gradle.java.home=C:\\Program Files\\Android\\Android Studio\\jbr
```

Use double backslashes `\\`. Then from the project folder:

```powershell
.\gradlew --stop
```

---

## KSP NoSuchFileException or Internal compiler error

If you see `NoSuchFileException` for a path like `...byRounds\1\dagger\hilt\...` or "Detected multiple Kotlin daemon sessions":

1. **Stop daemons and clean** (terminal, from `android-app\android`):
   ```powershell
   .\gradlew --stop
   .\gradlew clean
   .\gradlew assembleDebug
   ```
2. In Android Studio: **File → Invalidate Caches → Invalidate and Restart**, then **Build → Rebuild Project**.
3. The project has `ksp.incremental=false` in `gradle.properties` to reduce this. Avoid running Gradle from terminal and Android Studio at the same time.

---

## "Timeout waiting to lock Artifact transforms cache"

This happens when **another Gradle instance** (command line, previous sync, or another IDE) is using the same Gradle cache.

### Fix: stop all Gradle daemons, then sync in Android Studio

1. **Close Android Studio** (so it doesn’t start a new sync while you clean up).

2. **Stop all Gradle daemons** (in PowerShell or Command Prompt):
   ```bash
   cd C:\Pwezacore\pwezacore\android-app\android
   .\gradlew --stop
   ```
   Wait until it says something like "Stopping Daemon(s)…" and exits.

3. **(Optional)** If the lock persists, end any process using the cache:
   - Open **Task Manager** (Ctrl+Shift+Esc).
   - Find **Java** or **Gradle** processes (e.g. PID 37064 from the error).
   - End those tasks.

4. **Reopen Android Studio**, open the project at:
   ```
   C:\Pwezacore\pwezacore\android-app\android
   ```
   (Open the `android` folder, not the repo root.)

5. Let it **Sync** once. Don’t run `gradlew` in a terminal at the same time.

### Avoid the lock in the future

- Don’t run `.\gradlew assembleDebug` (or any Gradle command) in a terminal while Android Studio is syncing or building.
- Prefer building from Android Studio: **Build → Make Project** or **Run**.

### If sync still fails

- **File → Invalidate Caches → Invalidate and Restart**.
- After restart, sync again with no other Gradle builds running.
