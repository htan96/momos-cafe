#!/usr/bin/env bash
# One-time: enable PM2 to resurrect processes after server reboot.
set -euo pipefail
export PATH="/usr/local/bin:/usr/bin:/bin:${PATH:-}"
pm2 save
echo "Run the command printed below as root (sudo), then reboot to verify 'pm2 list':"
sudo env PATH="$PATH:/usr/bin" pm2 startup systemd -u "${SUDO_USER:-$USER}" --hp "${HOME:-/home/$USER}"
