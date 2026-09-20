#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$DIR/backend"
FRONTEND_DIR="$DIR/frontend"

echo "========================================="
echo "       BOOTING SUBSIGHT FULL-STACK       "
echo "========================================="

# Ensure backend venv
if [ ! -d "$BACKEND_DIR/venv" ]; then
    echo "[!] Setting up backend virtual environment..."
    python3 -m venv "$BACKEND_DIR/venv"
    "$BACKEND_DIR/venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt"
fi

# Cleanup on exit
cleanup() {
    echo ""
    echo "Stopping SUBSIGHT servers..."
    kill $(jobs -p) 2>/dev/null || true
    exit
}
trap cleanup SIGINT SIGTERM EXIT

# Start backend
echo "[*] Starting FastAPI Backend on http://localhost:8000..."
cd "$BACKEND_DIR"
PYTHONPATH=. ./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start frontend
echo "[*] Starting Next.js Frontend on http://localhost:3000..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✓ SUBSIGHT is running!"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  Docs:     http://localhost:8000/docs"
echo ""

wait $BACKEND_PID $FRONTEND_PID
