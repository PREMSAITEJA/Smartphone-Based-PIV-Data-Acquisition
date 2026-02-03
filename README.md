# Smartphone-Based PIV Data Acquisition

A complete Particle Image Velocimetry (PIV) system for capturing high‑speed image pairs on mobile and processing them with a Node.js backend.

## Quick Start

### 1) Install dependencies

**Mobile app**

```
cd "android_application"
npm install
```

**Backend**

```
cd "piv-backend"
npm install
```

### 2) Run the backend

```
cd "piv-backend"
npm start
```

Expected:
- Server running on port 3000
- Health check: http://localhost:3000/health

### 3) Run the mobile app

```
cd "android_application"
npm start
```

Scan the QR code using Expo Go on your phone (same Wi‑Fi network).

## Features

- Basic PIV capture (image pairs)
- Advanced 240fps capture (Camera2)
- Real‑time vector visualization (10Hz)
- Calibration tools
- Gallery management
- Backend PIV processing (NCC, filtering, stats)

## File Structure

```
web application/
├── ADVANCED_PIV_README.md
├── COMPLETE_SETUP_GUIDE.md
├── INSTALLATION_GUIDE.md
├── PROJECT_SUMMARY.md
├── QUICK_START.md
├── android_application/
│   ├── app/
│   ├── assets/
│   ├── components/
│   ├── constants/
│   ├── hooks/
│   ├── modules/
│   ├── scripts/
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
└── piv-backend/
    ├── package.json
    ├── server.js
    └── server.old.js
```

## Notes

- For Expo Go usage, no Android SDK is required.
- Advanced 240fps features require a native build.

## Docs

- QUICK_START.md for fastest setup
- COMPLETE_SETUP_GUIDE.md for full walkthrough
- INSTALLATION_GUIDE.md for dependencies and troubleshooting
