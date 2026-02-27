# Building the PwezaCore Desktop App with Android Studio

## What to do now (install & test)

Your Gradle build already succeeded. Do this next:

### 1. Run the app (test without installing)

- In the **Run** dropdown (top toolbar), choose **"Compose Desktop"** or **"app"**.
- Click the green **Run** button (or press **Shift+F10**).
- A desktop window opens: **login screen** first. Use **Sign In** (or any credentials for now) to get to the **admin layout** (sidebar + content). Click sidebar items to test navigation.

### 2. Build the installer (EXE / MSI)

- Open **Gradle** tool window: **View → Tool Windows → Gradle**.
- Go to **PwezaCoreDesktop → app → Tasks → compose desktop**.
- **Double‑click** **packageDistributionForCurrentOS**.
- Wait for the task to finish. Installer output is in:
  - **`desktop-app\app\build\compose\binaries\main\msi\`** → `.msi` installer  
  - **`desktop-app\app\build\compose\binaries\main\exe\`** → `.exe` installer  

If the task fails with a **jpackage** error, set the project Gradle JVM to a **full JDK 17+** that includes jpackage (e.g. [Eclipse Temurin](https://adoptium.net/)): **File → Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK**.

### 3. Install on your desktop

- Go to the folder above and double‑click the **`.msi`** (recommended) or run the **`.exe`**.
- Follow the installer; then start **PwezaCore** from the Start Menu or desktop shortcut.
- Test login and all sidebar sections.

---

## Opening the project

1. **Open the desktop-app folder** (not the repo root, not the android-app):
   - In Android Studio: **File → Open**
   - Navigate to and select: `c:\Pwezacore\pwezacore\desktop-app`
   - Click **OK**. Android Studio will import it as a Gradle project.

2. **Wait for sync**  
   Let Gradle sync finish (progress in the status bar). Use **JDK 17** or higher (File → Project Structure → SDK).

3. **If asked about Gradle JVM**  
   Choose a JDK 17+ (e.g. Eclipse Temurin or the one bundled with Android Studio).

---

## Running the app

- In the **Run** dropdown, select the **"Compose Desktop"** or **"app"** run configuration (Android Studio usually creates it for Compose Desktop).
- Click the **Run** (green play) button, or press **Shift+F10**.
- The app starts as a native window: first the **login screen**, then after sign-in the **web-style admin layout** (sidebar + content).

---

## Building installers (EXE / MSI)

- Open the **Gradle** tool window (View → Tool Windows → Gradle).
- Expand **PwezaCoreDesktop → app → Tasks → compose desktop**.
- Run:
  - **packageDistributionForCurrentOS** – builds an installer for your current OS (e.g. Windows → EXE + MSI).
- Output is under:  
  `desktop-app/app/build/compose/binaries/main/` (or path shown in the Gradle run).

**Note:** You need a JDK that includes **jpackage** (e.g. Eclipse Temurin 17+). The JRE bundled with Android Studio may not have it; in that case set the project’s Gradle JVM to a full JDK that has jpackage.

---

## How the desktop app works

### 1. Entry point

- **Main:** `app/src/main/kotlin/com/pwezacore/desktop/Main.kt`
- Uses Compose Desktop’s `application { }` and `Window { }`.
- Holds a single state: **current screen** (`AppScreen`).
- Wraps the UI in `LiquidGlassTheme` and `AppContent(currentScreen, onScreenChange)`.

### 2. Navigation (no Android Navigation library)

- **AppScreen** (in `ui/navigation/AppScreen.kt`): sealed class – `Login`, `Register`, `ForgotPassword`, `Admin(route: String)`.
- **AppContent** (in `ui/navigation/AppContent.kt`): one composable that switches on `currentScreen`:
  - **Login** → `LoginScreen` (with “Sign in”, “Register”, “Forgot password”).
  - **Register** → `RegisterScreen`.
  - **ForgotPassword** → `ForgotPasswordScreen`.
  - **Admin(route)** → `WebStyleAdminLayout(route, onNavigate, onLogout)`.

So navigation is **state-based**: changing `currentScreen` (e.g. to `AppScreen.Admin("students")`) is what “navigates”.

### 3. Web-style admin UI

- **WebStyleAdminLayout** (`ui/components/WebStyleAdminLayout.kt`):
  - **Left sidebar:** fixed width, glass style, list of items (Dashboard, Students, Teachers, Parents, Staff, Finance, Reports, etc.). Clicking an item calls `onNavigate(route)`.
  - **Top bar:** search placeholder, Term/Class/Academic Year, Notifications, Admin menu (Settings, Logout).
  - **Content area:** `WebAdminContent(currentRoute, onNavigate)` renders the screen for the current route.

- **Routes** are defined in **WebAdminRoutes** (in `AppScreen.kt`): e.g. `""`, `"students"`, `"students/add"`, `"teachers"`, `"parents"`, `"accounts"`, `"outstanding"`, `"reports/generate"`, `"attendance"`, `"exam-sets"`, `"identity"`, `"settings/classes"`, `"settings"`, `"notifications"`, etc.

### 4. Admin screens

- Each route is mapped to a composable in **WebAdminContent** (inside `WebStyleAdminLayout.kt`):
  - Dashboard → `AdminDashboardScreen`
  - Students list → `StudentsScreen`, add → `AddStudentScreen`
  - Teachers → `TeachersScreen`, add → `AddTeacherScreen`
  - Parents → `ParentsScreen`, add → `AddParentScreen`
  - Staff, Finance, Reports, Attendance, Exam Sets, Identity, Classes, Job Vacancies, System Settings, Notifications, etc.
- Screens live under `ui/screens/admin/*.kt`. They use the same **glass theme** and **components** (`GlassButton`, `GlassCard`, `GlassTextField`, etc.) and call `onNavigate(...)` to move between routes.

### 5. Theme and glass

- **LiquidGlassTheme** (`ui/theme/LiquidGlassTheme.kt`): dark/light color scheme and typography.
- **GlassConstants** (same file): blur/transparency/corner constants (desktop uses transparency only, no real blur).
- **GlassEffects** (`ui/theme/GlassEffects.kt`): modifiers like `glassSurface`, `glassEdgeHighlight`, and **GlassContainer**.
- **AnimationSpecs** (`ui/theme/AnimationSpecs.kt`): `glassPressAnimation`, `glassFocusGlow`, springs.

So: **Android Studio opens `desktop-app` → Gradle builds the Compose Desktop app → Run runs the window app → state-based navigation and WebStyleAdminLayout give the web-like admin experience.**
