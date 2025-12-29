#!/usr/bin/env bash
# Lightweight script to start a local server, run Lighthouse (mobile & desktop), and stop the server.
# Usage: ./run-lighthouse.sh

set -e
PORT=8000
ROOT_DIR="$(pwd)"

# Start a simple HTTP server in the background
python3 -m http.server $PORT &
SERVER_PID=$!
sleep 1

echo "Local server started at http://localhost:$PORT (pid $SERVER_PID)"

echo "Running Lighthouse (mobile)..."
npx lighthouse "http://localhost:$PORT" --output html --output-path ./lighthouse-mobile.html --preset=mobile --chrome-flags='--no-sandbox --headless'

echo "Running Lighthouse (desktop)..."
npx lighthouse "http://localhost:$PORT" --output html --output-path ./lighthouse-desktop.html --preset=desktop --chrome-flags='--no-sandbox --headless'

# Stop the server
kill $SERVER_PID || true

echo "Lighthouse reports generated: ./lighthouse-mobile.html and ./lighthouse-desktop.html"
