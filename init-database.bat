@echo off
REM =============================================================================
REM Database Initialization Script (Windows PowerShell Version)
REM This script starts the PostgreSQL container and initializes the database
REM =============================================================================

setlocal enabledelayedexpansion

echo ==================================
echo InsomeaTech Database Initialization
echo ==================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not installed or not in PATH
    exit /b 1
)

REM Check if we should use docker-compose or docker compose
docker-compose --version >nul 2>&1
if errorlevel 1 (
    set DOCKER_COMPOSE=docker compose
) else (
    set DOCKER_COMPOSE=docker-compose
)

echo.
echo Starting Docker services...
%DOCKER_COMPOSE% up -d

echo.
echo Waiting for PostgreSQL to be healthy...
timeout /t 2 /nobreak

for /l %%i in (1,1,30) do (
    %DOCKER_COMPOSE% exec -T postgres pg_isready -U dev_user -d insomea_db >nul 2>&1
    if errorlevel 0 (
        echo PostgreSQL is ready!
        goto :ready
    )
    if %%i equ 30 (
        echo Error: PostgreSQL failed to start within 30 seconds
        %DOCKER_COMPOSE% logs postgres
        exit /b 1
    )
    echo Attempt %%i/30...
    timeout /t 1 /nobreak
)

:ready
echo.
echo ==================================
echo Database Initialization Complete!
echo ==================================
echo.
echo Database Details:
echo   Host: 127.0.0.1:5432
echo   Database: insomea_db
echo   User: dev_user
echo   Password: my_secure_password
echo.
echo Connection String:
echo   postgresql://dev_user:my_secure_password@127.0.0.1:5432/insomea_db?sslmode=disable^&search_path=insomea_tech,public
echo.
echo pgAdmin UI (Database Management):
echo   URL: http://localhost:5050
echo   Email: admin@insomea.com
echo   Password: admin
echo.
pause
