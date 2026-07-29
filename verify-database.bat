@echo off
REM =============================================================================
REM Database Verification Script (Windows)
REM Checks if the PostgreSQL database is properly initialized
REM =============================================================================

setlocal enabledelayedexpansion

echo ==================================
echo Database Verification Checklist
echo ==================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not installed
    exit /b 1
)

REM Check if we should use docker-compose or docker compose
docker-compose --version >nul 2>&1
if errorlevel 1 (
    set DOCKER_COMPOSE=docker compose
) else (
    set DOCKER_COMPOSE=docker-compose
)

echo 1. Checking PostgreSQL container status...
%DOCKER_COMPOSE% ps postgres 2>nul | find "Up" >nul
if errorlevel 0 (
    echo    OK - PostgreSQL container is running
) else (
    echo    ERROR - PostgreSQL container is not running
    exit /b 1
)
echo.

echo 2. Checking if insomea_tech schema exists...
%DOCKER_COMPOSE% exec -T postgres psql -U dev_user -d insomea_db -c "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='insomea_tech';" 2>nul | find "1" >nul
if errorlevel 0 (
    echo    OK - Schema exists
) else (
    echo    ERROR - Schema does not exist
    exit /b 1
)
echo.

echo 3. Checking trigger functions...
%DOCKER_COMPOSE% exec -T postgres psql -U dev_user -d insomea_db -c "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema='insomea_tech';" 2>nul
echo.

echo 4. Checking tables...
%DOCKER_COMPOSE% exec -T postgres psql -U dev_user -d insomea_db -c "\dt insomea_tech.*" 2>nul
echo.

echo 5. Checking seed data...
echo    Record Counts:
%DOCKER_COMPOSE% exec -T postgres psql -U dev_user -d insomea_db -c "
  SELECT 
    'Distis: ' || COUNT(*) FROM insomea_tech.distis;
  SELECT 
    'Products: ' || COUNT(*) FROM insomea_tech.products;
  SELECT 
    'Users: ' || COUNT(*) FROM insomea_tech.users;
  SELECT 
    'Customers: ' || COUNT(*) FROM insomea_tech.customers;
  SELECT 
    'Orders: ' || COUNT(*) FROM insomea_tech.orders;
" 2>nul
echo.

echo ==================================
echo Database Verification Complete!
echo ==================================
echo.
echo Connection Details:
echo   Host: 127.0.0.1:5432
echo   Database: insomea_db
echo   User: dev_user
echo   Password: my_secure_password
echo.
echo pgAdmin UI: http://localhost:5050
echo.
pause
