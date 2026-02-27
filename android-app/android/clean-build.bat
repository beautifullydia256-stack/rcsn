@echo off
REM Run this script from a Command Prompt or PowerShell when build folder is locked.
REM Close Android Studio / Cursor (or stop any running build) first, then run:
REM   cd c:\Pwezacore\pwezacore\android-app\android
REM   clean-build.bat

echo Stopping Gradle daemons...
call gradlew.bat --stop
timeout /t 3 /nobreak >nul

echo Deleting app\build...
if exist "app\build" (
    rmdir /s /q "app\build"
    if exist "app\build" (
        echo WARNING: Could not delete app\build. Close all IDEs and Gradle processes, then run again.
        pause
        exit /b 1
    )
    echo Deleted app\build
) else (
    echo app\build not found
)

echo Running clean assembleDebug...
call gradlew.bat clean assembleDebug
echo Done.
pause
