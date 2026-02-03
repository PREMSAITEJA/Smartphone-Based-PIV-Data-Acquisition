# Installation & Setup Guide - Advanced PIV System

## 📋 Prerequisites

Before you begin, ensure you have:

1. **Samsung Galaxy S25** (or compatible device with 240fps support)
2. **Computer** (Windows/Mac/Linux) with:
   - Node.js 18+ installed
   - USB cable for device connection
   - WiFi network (both devices on same network)

## 🚀 Installation Steps

### Step 1: Install Expo Go on Samsung S25

1. Open **Google Play Store** on your phone
2. Search for **"Expo Go"**
3. Install the official Expo Go app
4. Open once to verify it works

### Step 2: Clone/Download Project

If you have the project files, navigate to:
```bash
cd "/home/fmea01/Downloads/PREMSAITEJA/web application"
```

### Step 3: Install Mobile App Dependencies

```bash
cd android_application
npm install
```

This installs:
- React Native dependencies
- Expo modules
- Camera2 API bindings
- Slider component
- Skia for visualization

**Note:** The first install may take 5-10 minutes.

### Step 4: Install Backend Dependencies

Open a **new terminal** window:

```bash
cd "/home/fmea01/Downloads/PREMSAITEJA/web application/piv-backend"
npm install
```

This installs:
- Express server
- Sharp image processing
- Multer file uploads
- CORS middleware

### Step 5: Start the Backend Server

In the `piv-backend` terminal:

```bash
npm start
```

✅ **Expected output:**
```
🚀 Advanced PIV Processing Server v2.0
📡 Server running on port 3000
🏥 Health check: http://localhost:3000/health

✨ Features:
  • High-speed 240fps processing
  • Normalized Cross-Correlation (DCC)
  • Sub-pixel accuracy
  • Outlier filtering
  • Raw binary frame support
  • Real-time visualization (10Hz)
```

**Keep this terminal running!**

### Step 6: Start the Mobile App

In the `android_application` terminal:

```bash
npm start
```

✅ **Expected output:**
```
› Metro waiting on exp://10.131.169.69:8081
› Scan the QR code above with Expo Go (Android)

▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█ ▄▄▄▄▄ █▄▄▄ ▀▄██▄█ ▄▄▄▄▄ █
█ █   █ ██▄▀ █ ▀▀▀█ █   █ █
...
```

### Step 7: Open App on Samsung S25

**Option A: Scan QR Code**
1. Open **Expo Go** app on your S25
2. Tap **"Scan QR code"**
3. Point camera at the QR code on your computer screen
4. App loads automatically!

**Option B: USB Cable (More Reliable)**
1. Connect S25 to computer with USB cable
2. In the terminal, press **`a`** key
3. App deploys directly to phone

**Option C: Manual URL**
1. Note the URL from terminal: `exp://10.131.169.69:8081`
2. In Expo Go, tap the address bar
3. Enter the URL manually
4. Tap "Open"

## ✅ Verification

Once the app loads, you should see:

1. **Home Screen** with "PIV Camera" title
2. Navigate to **"PIV Tools"** tab (bottom navigation)
3. You should see these options:
   - 🎥 **240fps High-Speed Camera** (NEW!)
   - ⚡ **Real-Time PIV Visualization** (NEW!)
   - 📸 PIV Camera (Basic)
   - 🖼️ Image Gallery
   - 📏 Calibration
   - 📊 Analysis

## 🔧 Building Native Modules (Advanced)

The Camera2 native module requires building for production use. For development with Expo Go, some features may be limited.

### For Full Native Build:

```bash
cd android_application

# Build Android APK
npx expo run:android
```

This will:
1. Compile the Kotlin Camera2Module
2. Create a development build
3. Install on connected device

**Note:** Requires Android Studio and Android SDK installed.

## 📱 First-Time Usage

### 1. Test Basic Features

**Try the Basic Camera:**
1. Tap **"PIV Camera (Basic)"**
2. Grant camera permissions when prompted
3. Test capture functionality

### 2. Try Advanced Camera (if native module available)

**Advanced 240fps Camera:**
1. Tap **"240fps High-Speed Camera"**
2. Check if camera is detected
3. If error: "No cameras with 240fps support" → requires native build

### 3. Test Backend Connection

**Analysis Screen:**
1. Tap **"Analysis"**
2. Tap settings gear icon
3. Verify server host/port: `localhost:3000`
4. Tap "Test Connection"
5. Should show "Server healthy"

## 🐛 Troubleshooting

### App won't load / QR code doesn't work

**Solution 1: Check WiFi**
- Ensure phone and computer on **same WiFi network**
- Check: Settings → WiFi on both devices

**Solution 2: Use USB Cable**
```bash
# Connect phone via USB
# In terminal:
npm start
# Then press 'a'
```

**Solution 3: Restart Metro**
```bash
# In terminal, press 'r' to reload
# Or Ctrl+C then npm start again
```

### "Module not found: @/modules/camera2"

This is expected in Expo Go development. The Camera2 native module requires:

**Option 1: Use Basic Features**
- Use the standard PIV Camera (non-240fps)
- Use calibration and analysis features
- Backend processing still works

**Option 2: Build Native App**
```bash
npx expo prebuild
npx expo run:android
```

### Backend not connecting

**Check backend is running:**
```bash
cd piv-backend
npm start
```

**Check IP address:**
```bash
# Linux/Mac
ifconfig | grep inet

# Windows
ipconfig
```

Update server config in app if needed:
- Analysis screen → Settings gear → Enter correct IP

### "Failed to resolve Android SDK path"

This error only appears if you try `npm run android`. For development:

✅ **Use Expo Go** (no SDK needed):
```bash
npm start
# Scan QR code
```

❌ **Don't use** `npm run android` unless you have Android Studio installed.

## 📦 What Gets Installed

### Mobile App Dependencies (android_application/node_modules)

**Core:**
- `expo` - Expo framework
- `react-native` - React Native core
- `expo-router` - Navigation

**Camera:**
- `expo-camera` - Basic camera API
- `expo-modules-core` - Native module support

**UI:**
- `@react-native-community/slider` - Slider controls
- `@shopify/react-native-skia` - Canvas for vector visualization

**Storage:**
- `expo-file-system` - File operations

### Backend Dependencies (piv-backend/node_modules)

- `express` - Web server
- `sharp` - Image processing
- `multer` - File upload handling
- `cors` - Cross-origin requests

## 🔄 Updates & Restarts

**When to restart:**

**Mobile app:** Any code changes
```bash
# In terminal: Press 'r' to reload
# Or shake phone → "Reload"
```

**Backend server:** Changes to server.js
```bash
# Ctrl+C to stop
npm start
```

## 📚 Next Steps

After successful installation:

1. Read **ADVANCED_PIV_README.md** for full documentation
2. Review **Project Specification PDF** for scientific background
3. Try the **Calibration** feature first
4. Capture test data with **Basic PIV Camera**
5. Process with **Analysis** screen

## 💡 Development Tips

**Keep two terminals open:**

```
Terminal 1: Backend Server
cd piv-backend
npm start

Terminal 2: Mobile App
cd android_application
npm start
```

**Reload app quickly:**
- Shake device → "Reload"
- Or press `r` in terminal

**View logs:**
- Terminal shows Metro bundler logs
- Backend terminal shows API requests

**Common commands:**
```bash
npm start          # Start development server
npm install        # Install dependencies
npm run android    # Build native (requires SDK)
```

## ✨ Success Indicators

You're ready when:

✅ Backend shows: `Server running on port 3000`  
✅ Mobile app shows QR code or "Metro waiting..."  
✅ App loads on phone showing "PIV Camera" home screen  
✅ Can navigate between tabs  
✅ Backend health check returns `{ status: 'healthy' }`

---

**Having issues?** Check:
1. Both servers running (mobile + backend)
2. Same WiFi network
3. Firewall not blocking port 3000/8081
4. Expo Go app updated to latest version

For advanced features (240fps), consider building the native app with Android Studio.
