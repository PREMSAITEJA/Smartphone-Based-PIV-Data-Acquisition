# PIV App Setup Guide - Samsung S25 Ultra

## Quick Start with Expo Go (Recommended for Development)

Since you have a Samsung S25 Ultra, the easiest way to test the app is using **Expo Go** - no Android SDK or emulator needed!

### Step 1: Install Expo Go on Your Phone
1. Open **Google Play Store** on your Samsung S25 Ultra
2. Search for **"Expo Go"**
3. Install the official app by Expo

### Step 2: Enable Developer Mode on Your Phone
1. Go to **Settings** → **About Phone**
2. Tap **Build Number** 7 times (you'll see a toast message: "You are now a developer")
3. Go back to **Settings** → **Developer Options** (or **Advanced**)
4. Enable **USB Debugging**

### Step 3: Start the App
On your computer, navigate to the project folder and run:

```bash
cd "/home/fmea01/Downloads/PREMSAITEJA/web application/android_application"
npm start
```

### Step 4: Scan QR Code
When you see the QR code in the terminal:
- **On Android**: Open Expo Go app → Press home icon (bottom-left) → Scan QR code
- Or: Open your phone's **Camera app** and scan the QR code (should open in Expo Go)

## Alternative: Use Physical USB Connection

If WiFi scanning doesn't work:

1. Connect your Samsung S25 Ultra via USB cable to your computer
2. Enable **USB Debugging** (see Step 2 above)
3. In terminal, run:
   ```bash
   npm start
   ```
4. Press **`a`** in the terminal to open on Android device
5. Expo will automatically deploy to your connected phone

## Troubleshooting

### QR Code Won't Scan?
- Make sure your phone and computer are on the **same WiFi network**
- Or use USB connection instead (Step 3 above)

### "Metro connection failed"?
- Stop the current process (Ctrl+C)
- Run: `npm start -- --clear`
- Then try again

### Camera Permission Error?
- When the app launches, **allow camera permissions**
- If already denied, go to **Settings** → **Apps** → **PIV Camera** → **Permissions** → Enable Camera

### "Expo Go" app not connecting?
- Ensure Expo Go is up to date in Play Store
- Restart both the app and npm server

## What You'll See

Once connected:
1. The PIV Camera app will load
2. You'll see the home screen with "Particle Image Velocimetry"
3. Press **"Start PIV Capture"** to begin

## Getting Data Off Your Phone

After capturing images:
1. All data is saved in the app's directory
2. To export: Use the **Export** button in the app
3. Connect phone via USB and use file transfer or Expo's file sharing

## Production Build (Optional Later)

When ready for production, you can:
- Build an APK: `npx eas build --platform android`
- Build an AAB: `npx eas build --platform android --app-variant preview`
- (This requires setting up Expo Account)

## Need Help?

- Official Expo Docs: https://docs.expo.dev
- Expo Go Guide: https://docs.expo.dev/get-started/expo-go/
- Samsung S25 Ultra Camera Guide: Check Samsung's official documentation
