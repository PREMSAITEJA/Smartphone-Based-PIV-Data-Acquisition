# PIV Application - Complete Setup & Deployment Guide

## 📱 Mobile App Architecture

Your PIV application consists of:
- **React Native/Expo**: Mobile UI and camera interface
- **Node.js Express Server**: Image processing and analysis backend
- **Samsung S25 Ultra**: High-performance capture device

---

## 🚀 Quick Start (3 Steps)

### Step 1: Install Expo Go on Your Phone
1. Open Google Play Store on your Samsung S25 Ultra
2. Search for "Expo Go"
3. Install the official app by Expo
4. Enable **USB Debugging** in phone settings

### Step 2: Start the Backend Server

```bash
cd "/home/fmea01/Downloads/PREMSAITEJA/web application/piv-backend"
npm install
npm start
```

You should see:
```
PIV Processing Server running on port 3000
Health check: http://localhost:3000/health
```

### Step 3: Start the Mobile App

In a **NEW terminal** window:

```bash
cd "/home/fmea01/Downloads/PREMSAITEJA/web application/android_application"
npm start
```

Then:
- Scan the QR code with Expo Go (or Camera app)
- App will load on your Samsung S25 Ultra
- Make sure your computer and phone are on the **same WiFi network**

---

## 📋 Application Features

### 1. 🎥 PIV Camera (Capture)
- Capture sequential image pairs with precise timing
- Configurable intervals: 50ms - 1000ms
- Batch capture: 1-50 pairs per session
- Alignment grid overlay
- Flash control for various lighting conditions

### 2. 📏 Calibration (Setup)
- Spatial calibration with reference objects
- Calculate pixels-per-millimeter conversion
- Store camera parameters
- Save calibration data for processing

### 3. 🖼️ Gallery (View)
- Browse all captured image pairs
- View pair metadata
- Delete individual or bulk delete
- Storage statistics

### 4. 📊 Analysis (Process)
- Upload image pairs to backend server
- Phase correlation velocity computation
- Calculate velocity statistics
- Generate real-world measurements (if calibrated)

---

## 🔧 Backend Server Details

### Endpoints Available

#### Health Check
```
GET /health
```
Test if server is running

#### Process Single Pair
```
POST /process
Content-Type: multipart/form-data

Parameters:
- image1: First image file
- image2: Second image file
- calibration: (Optional) JSON calibration data
```

Response:
```json
{
  "success": true,
  "resultId": "result_1706835123456",
  "originsX": [...],
  "originsY": [...],
  "vectorsX": [...],
  "vectorsY": [...],
  "statistics": {
    "totalVectors": 840,
    "validVectors": 823,
    "meanX": 2.45,
    "meanY": -1.23,
    "stdX": 0.89,
    "stdY": 0.76,
    "maxVelocity": 8.2,
    "avgVelocity": 2.1,
    "maxVelocityMM": 0.0082,
    "avgVelocityMM": 0.0021
  }
}
```

#### Get Result
```
GET /result/:resultId
```

#### Batch Process
```
POST /batch-process
Content-Type: multipart/form-data

Parameters:
- imagePairs: Multiple image files (process in pairs)
- calibration: (Optional) JSON calibration data
```

---

## 📱 Complete Workflow

### Scenario: Capture and Analyze Fluid Flow

1. **Prepare your setup**
   - Setup flow chamber with seeding particles
   - Mount Samsung S25 Ultra on stable mount
   - Ensure uniform illumination

2. **Calibrate**
   - Open app → PIV Tools tab → **Calibration**
   - Place ruler/reference object in field of view
   - Measure known distance in pixels
   - Save calibration data

3. **Configure capture**
   - Go back to **PIV Tools** → **PIV Camera**
   - Set time interval (Δt) → 100ms recommended
   - Set number of pairs → 10 pairs recommended
   - Select resolution → High

4. **Capture**
   - Click **"Capture Pairs"** button
   - Wait for capture to complete
   - Review in **Image Gallery**

5. **Process**
   - Open **Analysis** screen
   - Select an image pair
   - Results show velocity field statistics
   - Real-world measurements if calibrated

6. **Export**
   - Use Gallery export for metadata
   - Results saved as JSON
   - Ready for post-processing with PIVlab or OpenPIV

---

## 🐛 Troubleshooting

### "Cannot read properties of undefined"
- **Solution**: Already fixed in the code. Restart with `npm start`

### Server Connection Failed
- **Check**: 
  - Backend running? (`npm start` in piv-backend folder)
  - Same WiFi network? (Phone & Computer)
  - Firewall blocking port 3000?
- **Fix**: 
  ```bash
  # In Analysis screen, click ⚙️ → Test Connection
  ```

### Camera Permission Denied
- Go to **Settings** → **Apps** → **Expo Go** → **Permissions**
- Enable **Camera** permission
- Restart Expo Go app

### Images Too Bright/Dark
- Adjust **Flash** setting in PIV Camera
- Optimize ambient lighting
- Use diffuse light source

### "Metro connection failed"
- Stop terminal (Ctrl+C)
- Clear cache: `npm start -- --clear`
- Restart

### Low Frame Rate / Slow Capture
- Use **Medium** or **Low** resolution
- Reduce number of pairs
- Increase time interval

---

## 🖥️ System Requirements

### Computer (Backend)
- Node.js 14+ installed
- Port 3000 available
- 2GB+ RAM
- 1GB disk space

### Samsung S25 Ultra (Mobile)
- 10GB+ free storage
- Android 14+
- WiFi connectivity
- USB Debugging enabled (for development)

---

## 📊 Processing Parameters

These are configurable in the backend server:

```javascript
const PIV_PARAMS = {
  windowWidth: 48,      // Interrogation window width (pixels)
  windowHeight: 128,    // Interrogation window height (pixels)
  stepSize: 24,         // Window step/overlap
  threshold: 3,         // Outlier threshold (standard deviations)
  roiXMin: 17,         // Region of Interest X minimum
  roiXMax: 1260,       // Region of Interest X maximum
  roiYMin: 0,          // Region of Interest Y minimum
  roiYMax: 800,        // Region of Interest Y maximum
};
```

To modify:
1. Edit `/piv-backend/server.js`
2. Update `PIV_PARAMS` object
3. Restart server: `npm start`

---

## 🎓 PIV Analysis Best Practices

### Image Capture
- ✅ Use particles 10-100 μm diameter
- ✅ Ensure uniform illumination
- ✅ Minimize out-of-plane motion
- ✅ Calibrate at measurement plane
- ✅ Set Δt for 5-10 pixel displacement

### Processing
- ✅ Always calibrate first
- ✅ Use appropriate window size (48×128 default)
- ✅ Verify velocity statistics make sense
- ✅ Check outlier filtering results
- ✅ Validate with physical measurements

### Results Interpretation
- **Mean X/Y**: Average particle displacement
- **Std X/Y**: Uniformity of flow
- **Max Velocity**: Peak flow magnitude
- **Valid Vectors**: Data quality indicator (aim for >95%)

---

## 📤 Exporting Results

### File Structure
```
PIV/
├── PIV_[timestamp]_[index]_img1.jpg    # First image
├── PIV_[timestamp]_[index]_img2.jpg    # Second image
├── calibration.json                     # Calibration data
├── metadata.json                        # Capture metadata
└── [pairId]_results.json               # Processing results
```

### Using Results in External Software

**PIVlab (MATLAB)**:
1. Export image pairs and calibration
2. Import to PIVlab
3. Load calibration data
4. Run analysis

**OpenPIV (Python)**:
1. Use exported images
2. Load calibration from JSON
3. Run processing
4. Compare with backend results

---

## 🚢 Production Deployment

### Option 1: Local Network (Current)
- Backend runs on your computer
- Phone connects via WiFi
- Good for lab environment

### Option 2: Cloud Deployment
- Deploy backend to cloud (AWS, Heroku, etc.)
- Mobile app connects to cloud server
- Scalable for multiple devices
- Requires internet connection

### Option 3: Standalone APK
- Build production APK
- Distribute to team members
- Embed backend URL in app config

For production deployment, contact the development team.

---

## 📞 Support

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Port 3000 in use" | Kill process: `lsof -ti:3000 \| xargs kill -9` |
| "Cannot find module" | Run `npm install` in that directory |
| "Images blurry" | Reduce time interval, stabilize camera |
| "Vectors all NaN" | Check image quality, adjust threshold |
| "Server timeout" | Increase image size limit in server.js |

### Performance Tips

- Use **High** resolution for best accuracy
- Capture 5-10 pairs initially for testing
- Process one pair at a time
- Close background apps to free memory
- Use USB connection for faster transfers

---

## 📚 References

- [Expo Documentation](https://docs.expo.dev)
- [React Native API](https://reactnative.dev)
- ["Particle Image Velocimetry: A Practical Guide" - Raffel et al.](https://link.springer.com/book/10.1007/978-3-319-68852-7)
- [OpenPIV Project](https://www.openpiv.net/)

---

## ✅ Checklist Before Using

- [ ] Installed Expo Go on Samsung S25 Ultra
- [ ] Enabled USB Debugging on phone
- [ ] Backend server installed (`npm install` in piv-backend)
- [ ] Both backend and app on same WiFi
- [ ] Tested server health check
- [ ] Calibration data saved
- [ ] Seeding particles prepared
- [ ] Flow setup ready

---

## 🎯 Next Steps

1. **First Run**: Start with calibration, then single pair capture
2. **Validation**: Compare results with known flow rates
3. **Optimization**: Adjust parameters based on results
4. **Scaling**: Batch process multiple pairs
5. **Publication**: Export results for analysis/papers

---

Happy PIV imaging! 🔬📊
