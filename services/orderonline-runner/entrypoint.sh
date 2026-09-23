#!/usr/bin/env bash
set -euo pipefail

runtime_dir="${ORDERONLINE_RUNTIME_DIR:-/work/runtime}"
token_file="${runtime_dir}/novnc.tokens"

mkdir -p "${runtime_dir}"
chmod 0700 "${runtime_dir}"
touch "${token_file}"
chmod 0600 "${token_file}"

Xvfb :99 -screen 0 1440x900x24 -nolisten tcp &
x11vnc -display :99 -localhost -forever -shared -nopw -rfbport 5900 &
websockify --web /usr/share/novnc --token-plugin TokenFile --token-source "${token_file}" 6080 &

export DISPLAY=:99
exec "$@"
