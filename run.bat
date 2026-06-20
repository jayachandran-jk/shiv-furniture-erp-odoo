@echo off
title Shiv Furniture ERP Launcher
echo ========================================================
echo       SHIV FURNITURE ERP - DEVELOPMENT LAUNCHER
echo ========================================================
echo.
echo [1/2] Launching Spring Boot Backend...
start "Shiv ERP Backend" cmd /k "cd backend && mvn spring-boot:run -DskipTests"

echo.
echo [2/2] Launching Vite Frontend...
start "Shiv ERP Frontend" cmd /k "cd shiv-furniture-works && npm run dev -- --host"

echo.
echo ========================================================
echo Servers are launching in separate windows!
echo - Backend: http://localhost:8080 (API)
echo - Frontend: http://localhost:8080 (Vite Dev Server)
echo ========================================================
echo.
echo Press any key to exit this launcher window.
pause > nul
