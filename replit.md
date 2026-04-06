# TRUTH-MD WhatsApp Bot

## Overview
A multi-device (MD) WhatsApp bot relay built with Node.js using the `@whiskeysockets/baileys` library. It connects to WhatsApp Web and handles commands, media processing, and automation.

## Architecture
- **Runtime**: Node.js 20.x
- **Entry point**: `index.js` (obfuscated/minified relay code)
- **Package manager**: npm
- **Key dependencies**: `@whiskeysockets/baileys`, `express`, `fluent-ffmpeg`, `jimp`, `sharp`, `pg`, `axios`

## Project Structure
```
/
├── index.js          # Main bot entry point (obfuscated relay code)
├── package.json      # Dependencies and scripts
├── scripts/
│   └── patch-baileys.cjs  # Post-install patch for baileys library
├── Procfile          # Heroku/cloud deployment config
├── Dockerfile        # Container deployment config
└── .env              # Bot configuration (must be created with credentials)
```

## Setup & Running
1. Install dependencies: `npm install` (also runs `patch-baileys.cjs` post-install)
2. Configure `.env` with required credentials (session ID, bot settings)
3. Start: `npm start` → runs `node index.js`

## Configuration
The bot requires a `.env` file with WhatsApp session credentials and bot settings. On first run, it creates a template `.env` automatically. Key env vars needed:
- `SESSION_ID` — WhatsApp session ID (obtained from https://truthsite.courtneytech.xyz/)
- Other bot configuration variables as defined in the generated template

## Workflow
- **Start application** — runs `npm start` (console output, no port)

## Notes
- The bot syncs code from a remote relay URL (`VERCEL_RELAY_URL`) on startup
- Requires ffmpeg and imagemagick system tools for media processing
- Uses PostgreSQL (`pg`) for data persistence if configured
