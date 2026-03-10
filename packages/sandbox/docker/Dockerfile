FROM ubuntu:24.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# System essentials
RUN apt-get update && apt-get install -y \
  curl wget git build-essential python3 python3-pip python3-venv \
  ca-certificates gnupg lsof net-tools jq unzip sudo \
  && rm -rf /var/lib/apt/lists/*

# Node.js 22 (LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/*

# Common Node.js global tools
RUN npm install -g yarn pnpm tsx

# --- Agent Runtimes ---

# 1. Claude Code (npm)
RUN npm install -g @anthropic-ai/claude-code

# 2. Codex CLI (npm)
RUN npm install -g @openai/codex

# 3. OpenCode (Go binary via install script)
RUN curl -fsSL https://opencode.ai/install | bash \
  && mv /root/.local/bin/opencode /usr/local/bin/opencode 2>/dev/null || true

# 4. Cursor Agent (Go binary via install script)
RUN curl -fsSL https://cursor.com/install | bash \
  && mv /root/.local/bin/cursor-agent /usr/local/bin/cursor-agent 2>/dev/null || true

# --- Virtual Desktop (for computer-use agents) ---

# Display server, window manager, VNC, input tools, screenshot
RUN apt-get update && apt-get install -y --no-install-recommends \
  xvfb \
  fluxbox \
  x11vnc \
  xdotool \
  wmctrl \
  scrot \
  imagemagick \
  libxss1 \
  libx11-xcb1 \
  xterm \
  dbus-x11 \
  x11-utils \
  && rm -rf /var/lib/apt/lists/*

# noVNC (web-based VNC viewer for dashboard)
RUN git clone --depth 1 https://github.com/novnc/noVNC /opt/noVNC && \
  git clone --depth 1 https://github.com/novnc/websockify /opt/noVNC/utils/websockify && \
  ln -s /opt/noVNC/vnc.html /opt/noVNC/index.html

# Chromium (for Playwright browser automation)
RUN apt-get update && apt-get install -y --no-install-recommends \
  chromium-browser \
  && rm -rf /var/lib/apt/lists/*

# Computer-use server (copied from build context by ImageManager)
COPY computer-use/ /opt/computer-use/
RUN cd /opt/computer-use && npm install --production 2>/dev/null || true

# Desktop startup script (copied from build context by ImageManager)
COPY start-desktop.sh /usr/local/bin/start-desktop.sh
RUN chmod +x /usr/local/bin/start-desktop.sh

# Create non-root agent user (Claude Code refuses --dangerously-skip-permissions as root)
# Restricted sudo: only package managers — no arbitrary root commands
RUN useradd -m -s /bin/bash -G sudo agent \
  && echo "agent ALL=(root) NOPASSWD: /usr/bin/apt-get, /usr/bin/apt, /usr/bin/npm, /usr/bin/pip3" \
  >> /etc/sudoers.d/agent \
  && chmod 0440 /etc/sudoers.d/agent

# Working directory
WORKDIR /workspace
RUN chown agent:agent /workspace

USER agent

# Default command: idle process (container stays alive, commands via docker exec)
# Desktop agents override this with start-desktop.sh
CMD ["sleep", "infinity"]
