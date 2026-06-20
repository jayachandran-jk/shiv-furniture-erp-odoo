#!/bin/bash

echo "==========================================="
echo "   Starting Shiv Furniture Works ERP"
echo "==========================================="

# Trap SIGINT (Ctrl+C) to kill background processes when the script exits
trap 'kill 0' SIGINT

# 1. Start Backend
echo "[1/2] Starting Spring Boot Backend on port 4000..."
cd backend
mvn spring-boot:run &
BACKEND_PID=$!
cd ..

# Wait a few seconds for backend to initialize
echo "Waiting for backend to initialize..."
sleep 10

# 2. Start Frontend
echo "[2/2] Starting Vite Frontend on port 8080..."
cd shiv-furniture-works
npm run dev &
FRONTEND_PID=$!
cd ..

echo "==========================================="
echo "   ERP is now running!"
echo "   Access it at: http://localhost:8080"
echo "   Press Ctrl+C to shut down all services."
echo "==========================================="

# Wait for both processes to finish (or until user presses Ctrl+C)
wait
