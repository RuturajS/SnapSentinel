# SnapSentinel

A comprehensive desktop monitoring system with a Client Agent, Admin Console, and Backend.

## Components

1.  **Backend** (`/backend`): Node.js + Express server handling Socket.io connections, image uploads, and webhooks.
2.  **Client Agent** (`/client-agent`): Electron + React application that captures camera snapshots and sends them to the backend. Runs silently (configurable).
3.  **Admin Console** (`/admin-console`): Electron + React dashboard to view connected clients, live feed, and send control commands.

## Prerequisites

- Node.js (v18+ recommended)
- NPM

## Installation & Running

You need to run all three components simultaneously (in separate terminals).

### 1. Backend

```bash
cd backend
npm install
# Optional: Create .env with DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
node server.js
```

Runs on `http://localhost:3000`.

### 2. Client Agent

```bash
cd client-agent
npm install
npm run start
```

This will launch the client agent window. By default, it captures every 5 minutes.
*Note: In a real deploy, you would package this as an EXE/DMG.*

### 3. Admin Console

```bash
cd admin-console
npm install
npm run start
```

This will launch the dashboard. You will see connected devices and can trigger manual snapshots.

## Features implemented

-   **Real-time Communication**: Socket.io for instant updates.
-   **Strict Design**: Black/White/Gray aesthetics for Admin Console.
-   **Image Capture**: `react-webcam` integration.
-   **Remote Control**: Admin can trigger 'Start Capture' or 'Set Interval'.
-   **Webhooks**: Discord webhook support for offline alerts and new images.

Creator and author : Ruturaj Sharbidre