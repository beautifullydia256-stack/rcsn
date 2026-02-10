@echo off
echo ========================================
echo Identity Module Installation Script
echo ========================================
echo.
echo Installing required dependencies...
echo.

npm install jsbarcode html2canvas canvas @types/jsbarcode

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Installation completed successfully!
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Restart your development server
    echo 2. Log in as admin
    echo 3. Click "Identity" in the sidebar
    echo 4. Test ID card generation
    echo.
    echo For detailed instructions, see:
    echo - IDENTITY_MODULE_SETUP.md
    echo - app/dashboard/admin/identity/README.md
    echo.
) else (
    echo.
    echo ========================================
    echo Installation failed!
    echo ========================================
    echo.
    echo Please ensure:
    echo 1. Node.js and npm are installed
    echo 2. You are in the project root directory
    echo 3. You have internet connection
    echo.
    echo Then run this script again or manually run:
    echo npm install jsbarcode html2canvas canvas @types/jsbarcode
    echo.
)

pause
