#!/bin/bash
# Double-click to start Dr. NAM Virtual Secret Lab on a Mac. Keep this window open while you play.
cd "$(dirname "$0")"
PORT=8080
echo "Dr. NAM Virtual Secret Lab is running at http://localhost:$PORT/"
echo "Keep this window open while you play. Close it to stop."
( sleep 1; open "http://localhost:$PORT/" ) &
if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server $PORT --bind 127.0.0.1
else
  echo "Python 3 is needed. macOS will offer to install it (Command Line Tools) — accept, then double-click this file again."
  xcode-select --install
  read -p "Press Enter to close"
fi
