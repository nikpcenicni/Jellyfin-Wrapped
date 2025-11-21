#!/bin/sh

# Start Express API server in background on port 3000
# Bind to 0.0.0.0 so nginx can connect
PORT=3000 node ./server/index.js &
API_PID=$!

# Wait a moment for API to start
sleep 2

# Start Next.js frontend on port 3001
# Next.js standalone server.js is in the root directory (/app)
# Based on find output, server.js is at ./server.js
if [ -f "server.js" ]; then
  # server.js is in the current directory (root) - standalone output puts it here
  PORT=3001 HOSTNAME=0.0.0.0 node server.js &
elif [ -f ".next/standalone/server.js" ]; then
  cd .next/standalone
  PORT=3001 HOSTNAME=0.0.0.0 node server.js &
else
  echo "ERROR: Could not find Next.js server.js"
  echo "Current directory: $(pwd)"
  echo "Looking for: server.js, .next/standalone/server.js"
  find . -name "server.js" -type f 2>/dev/null | head -5
  exit 1
fi

NEXT_PID=$!

# Wait for Next.js to start (give it more time)
sleep 5

# Start nginx in foreground (it will handle routing)
nginx -g "daemon off;" &
NGINX_PID=$!

# Function to cleanup on exit
cleanup() {
  echo "Shutting down..."
  kill $API_PID $NEXT_PID $NGINX_PID 2>/dev/null
  nginx -s quit 2>/dev/null
  wait $API_PID $NEXT_PID $NGINX_PID
  exit 0
}

trap cleanup SIGTERM SIGINT

# Wait for all processes
wait $API_PID $NEXT_PID $NGINX_PID