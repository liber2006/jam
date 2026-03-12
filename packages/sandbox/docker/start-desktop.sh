#!/bin/bash
set -e

# === Virtual Desktop Startup ===
# Starts Xvfb, fluxbox, VNC, noVNC, and the computer-use server.
# Designed to run as the Docker container entrypoint for desktop agents.

RESOLUTION="${SCREEN_RESOLUTION:-1920x1080}"
DISPLAY_NUM="${DISPLAY:-:99}"
COMPUTER_USE_PORT="${COMPUTER_USE_PORT:-3100}"

echo "[desktop] Starting virtual desktop at ${RESOLUTION} on display ${DISPLAY_NUM}"

# Start virtual framebuffer
Xvfb ${DISPLAY_NUM} -screen 0 ${RESOLUTION}x24 -ac +extension GLX +render -noreset &
XVFB_PID=$!
export DISPLAY=${DISPLAY_NUM}

# Wait for X server to be ready
for i in $(seq 1 30); do
  if xdpyinfo -display ${DISPLAY_NUM} >/dev/null 2>&1; then
    echo "[desktop] X server ready"
    break
  fi
  sleep 0.2
done

# Start lightweight window manager
fluxbox &

# Start VNC server (no password — container-internal only)
x11vnc -display ${DISPLAY_NUM} -nopw -listen 0.0.0.0 -port 5900 -shared -forever -noxdamage &

# Start noVNC web client (bridges WebSocket to VNC)
/opt/noVNC/utils/novnc_proxy --vnc localhost:5900 --listen 6080 &

# Start computer-use HTTP server
cd /opt/computer-use
node cli.js --port ${COMPUTER_USE_PORT} --display ${DISPLAY_NUM} &
CU_PID=$!

# Wait for computer-use server to be ready
for i in $(seq 1 30); do
  if curl -sf http://localhost:${COMPUTER_USE_PORT}/status >/dev/null 2>&1; then
    echo "[desktop] Computer-use server ready on port ${COMPUTER_USE_PORT}"
    break
  fi
  sleep 0.5
done

echo "[desktop] All desktop services started"

# Keep container alive — forward signals to Xvfb
trap "kill $XVFB_PID $CU_PID 2>/dev/null; exit 0" SIGTERM SIGINT
wait $XVFB_PID
