#!/bin/bash
# SKYEAR — Quick Setup
# Run: chmod +x setup.sh && ./setup.sh

set -e

echo "╔══════════════════════════════════════════════╗"
echo "║           SKYEAR — Setup                     ║"
echo "╚══════════════════════════════════════════════╝"

# Install dependencies
echo "→ Installing server dependencies..."
npm install

echo "→ Installing client dependencies..."
cd client && npm install && cd ..

# Create .env from example
if [ ! -f .env ]; then
  cp .env.example .env
  echo "→ Created .env from .env.example"
fi

# Init git
if [ ! -d .git ]; then
  git init
  git add -A
  git commit -m "feat: SkyEar v1.0 — acoustic threat detection system"
  echo "→ Git initialized with initial commit"
fi

echo ""
echo "Ready. Commands:"
echo "  npm run dev     → dev server + client (hot reload)"
echo "  npm run build   → production build"
echo "  npm start       → start production server"
echo ""
echo "To push to GitHub:"
echo "  gh repo create skyear --public --source=. --push"
echo "  # or manually:"
echo "  git remote add origin git@github.com:YOUR_USER/skyear.git"
echo "  git push -u origin main"
echo ""
echo "To deploy to Railway:"
echo "  railway login && railway init && railway up"
