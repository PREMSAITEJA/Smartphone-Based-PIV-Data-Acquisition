# 📱 QUICK START - NO ANDROID SDK NEEDED!

## ✅ You Already Have Everything You Need!

The app is **ready to run** on your Samsung S25 Ultra. No Android SDK installation required!

---

## 🎯 DO THIS RIGHT NOW:

### Step 1: On Your Samsung S25 Ultra Phone
1. Open **Google Play Store**
2. Search: **"Expo Go"**
3. Install the app by Expo (verified account)
4. Open the app once to make sure it works

**That's it for the phone!**

---

### Step 2: On Your Computer
Keep the terminal running with:
```bash
npm start
```

You should see a **QR code** in the terminal like this:
```
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█ ▄▄▄▄▄ █▄▄▄ ▀▄██▄█ ▄▄▄▄▄ █
█ █   █ ██▄▀ █ ▀▀▀█ █   █ █
...
```

**Keep this terminal window open!**

---

### Step 3: Scan QR Code with Your Phone

#### Option A: Use Expo Go App
1. Open **Expo Go** app on your phone
2. Tap the **home icon** at bottom-left
3. Tap **"Scan QR code"** button
4. Point camera at the QR code in terminal
5. **Done!** App will load automatically

#### Option B: Use Camera App
1. Open **Camera app** on your S25 Ultra
2. Point at the QR code on your computer screen
3. A notification should appear
4. Tap it to open in Expo Go
5. **App loads!**

---

## 🚀 WHAT YOU'LL SEE

Once the app loads:
1. **Home Screen** → "Welcome! Particle Image Velocimetry"
2. Press **"Start PIV Capture"** button
3. Or go to **"PIV Tools"** tab for all features

---

## ✨ THAT'S ALL YOU NEED!

**Don't do any of this:**
- ❌ Don't install Android Studio
- ❌ Don't set up Android SDK
- ❌ Don't create an emulator
- ❌ Don't use `npm run android`

**Just:**
- ✅ Run `npm start` (one terminal)
- ✅ Scan QR code with phone
- ✅ Use the app!

---

## 🔌 Make Sure Your Phone & Computer are on Same WiFi!

This is **IMPORTANT**. Both devices must be on the same network for the QR code to work.

Check:
- Phone WiFi: **Settings → WiFi → [Your Network]**
- Computer WiFi: Same network name (or USB cable works too)

---

## ❓ WHAT IF QR CODE DOESN'T SCAN?

### Option 1: USB Cable (Most Reliable)
1. Connect phone to computer with USB cable
2. In terminal, press **`a`** key
3. Expo will automatically deploy to your phone
4. Done!

### Option 2: Different QR Code
1. In terminal, press **`r`** to reload
2. A new QR code will appear
3. Try scanning again

### Option 3: Enter URL Manually
1. Look at terminal output, find: `exp://[IP-ADDRESS]:[PORT]`
2. Example: `exp://10.131.169.69:8082`
3. In Expo Go app → tap address bar
4. Paste the URL → Press Open
5. App loads!

---

## 📚 NEXT: Using the App

Once app is running:

### 1. Calibrate (First Time Only)
- Go to **PIV Tools** tab
- Click **"Calibration"** button
- Place ruler in camera view
- Measure and save calibration

### 2. Capture Images
- Click **"PIV Camera"** button
- Aim at your flow/particles
- Click **"Capture Pairs"** button
- Wait for capture
- Images saved automatically

### 3. View Gallery
- Click **"Image Gallery"** button
- See all captured images
- View metadata

### 4. Analyze
- Click **"Analysis"** button (NEW! 📊)
- Select an image pair
- Server processes it
- See velocity statistics

---

## 🎨 App Features

### Home Screen
- Quick start guide
- Feature overview
- Recommended settings

### PIV Tools Tab
- 📸 **PIV Camera** - Capture mode
- 🖼️ **Gallery** - View images
- 📏 **Calibration** - Setup
- 📊 **Analysis** - Process (NEW!)

### Settings in PIV Camera
- Time interval: 50-1000ms
- Number of pairs: 1-50
- Resolution: High/Medium/Low
- Flash: On/Off

---

## 🔗 Backend Server (Optional)

For the **Analysis** feature to work, you need the backend server running.

In a **NEW** terminal:
```bash
cd "/home/fmea01/Downloads/PREMSAITEJA/web application/piv-backend"
npm install
npm start
```

Then:
- In app → **Analysis** button
- Processing happens automatically
- Results show velocity statistics

---

## 💡 TIPS & TRICKS

### Speed Up Scanning
- Make QR code bigger: Move terminal window to full screen
- Good lighting: Point camera at screen in well-lit area
- Steady hand: Rest phone against something stable

### Faster App Updates
- Press **`r`** in terminal to reload
- Changes appear on phone instantly
- No need to scan QR code again

### Debug the App
- Press **`j`** in terminal to open debugger
- Check console logs
- See errors in real-time

### Test the Backend
- In **Analysis** screen, click ⚙️ icon
- Click **"Test Connection"**
- It will tell you if server is reachable

---

## ❌ ERRORS & FIXES

| Error | Fix |
|-------|-----|
| "Cannot find app" | Make sure Expo Go is installed on phone |
| "QR code won't scan" | Try USB cable method (press `a`) |
| "Server connection failed" | Make sure backend is running: `npm start` in piv-backend folder |
| "Camera permission denied" | Allow in phone settings: Settings → Apps → Expo Go → Permissions → Camera |
| "Port 8082 in use" | Terminal will auto-select port 8083, 8084, etc. |
| "Images blurry" | Use faster time interval, or reduce speed |

---

## ✅ CHECKLIST

Before you start:
- [ ] Installed Expo Go on S25 Ultra
- [ ] Phone & Computer on same WiFi
- [ ] Terminal can run `npm start`
- [ ] No Android SDK needed
- [ ] No emulator needed
- [ ] Just run and scan!

---

## 🎉 YOU'RE READY!

That's it! Your PIV app is ready to use.

```bash
cd "/home/fmea01/Downloads/PREMSAITEJA/web application/android_application"
npm start
```

Then scan the QR code with your phone.

**Enjoy your PIV application! 🔬📊**

---

Need help? Check the full guide:
📄 [COMPLETE_SETUP_GUIDE.md](../COMPLETE_SETUP_GUIDE.md)
