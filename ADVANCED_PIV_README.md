# Advanced PIV Data Acquisition System

## 🎯 Project Overview

This project implements a **smartphone-based Particle Image Velocimetry (PIV) data acquisition system** for the Samsung Galaxy S25, designed to function as a low-cost, high-performance PIV tool. The system utilizes **240fps high-speed capture** with **manual exposure control** for visualizing and measuring low-speed air flows using continuous laser illumination and tracer particles.

## 📋 Project Specification Summary

Based on the detailed project specification document, this system implements:

### Phase 1: High-Speed Data Acquisition ✅
- **Android Camera2 API** with `ConstrainedHighSpeedCaptureSession`
- **240fps capture** capability using `REQUEST_AVAILABLE_CAPABILITIES_CONSTRAINED_HIGH_SPEED_VIDEO`
- **Y-plane luminance extraction** from YUV_420_888 format (discarding U/V chroma planes)
- **Manual exposure controls**:
  - ISO/Sensor Sensitivity: 100-3200 (device dependent)
  - Exposure time: <1ms (typically 0.5ms to minimize particle streaking)
  - Disabled auto-exposure (`CONTROL_AE_MODE_OFF`)

### Phase 2: Memory Architecture & Storage ✅
- **Circular buffer** implementation (~1000 frames, ~4 seconds at 240fps)
- **Raw binary data export** (.raw format) - no compression artifacts
- **Background thread** for buffer dump to storage
- **Metadata tracking** (timestamps, exposure settings, frame count)

### Phase 3: Real-Time Visualization ✅
- **Decoupled display rate**: 10Hz visualization while capturing at 240fps
- **Coarse PIV grid**: 64×64 pixel interrogation windows
- **Normalized Cross-Correlation (DCC)** algorithm
- **Live vector overlay** on camera preview

## 🏗️ System Architecture

```
┌─────────────────────────────────────────┐
│   Samsung Galaxy S25 (Android App)      │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Camera2 API Module (Native)      │ │
│  │  • 240fps ConstrainedHighSpeed    │ │
│  │  • Manual ISO + Exposure Control  │ │
│  │  • Y-plane extraction (YUV420)    │ │
│  │  • Circular buffer (1000 frames)  │ │
│  └───────────────────────────────────┘ │
│             ↓                           │
│  ┌───────────────────────────────────┐ │
│  │  React Native UI (Expo)           │ │
│  │  • Advanced Camera Screen         │ │
│  │  • Real-Time PIV Visualization    │ │
│  │  • Manual Controls Interface      │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
                ↓
        Raw .raw files
                ↓
┌─────────────────────────────────────────┐
│   PIV Processing Backend (Node.js)      │
│                                         │
│  • Normalized Cross-Correlation (DCC)  │
│  • Sub-pixel accuracy                  │
│  • Outlier filtering (3σ threshold)    │
│  • Batch processing                    │
│  • Calibrated measurements             │
└─────────────────────────────────────────┘
```

## 📂 Project Structure

```
web application/
├── android_application/          # Mobile app (React Native/Expo)
│   ├── modules/
│   │   └── camera2/              # Native Camera2 API module
│   │       ├── android/
│   │       │   └── src/main/java/com/pivapp/camera2/
│   │       │       └── Camera2Module.kt   # Core Camera2 implementation
│   │       └── index.ts          # TypeScript bindings
│   │
│   ├── components/
│   │   ├── AdvancedPIVCameraScreen.tsx    # 240fps capture UI
│   │   ├── RealTimePIVVisualization.tsx   # 10Hz vector overlay
│   │   ├── PIVCameraScreen.tsx            # Basic capture
│   │   ├── PIVCalibrationScreen.tsx       # Spatial calibration
│   │   ├── PIVGalleryScreen.tsx           # Image management
│   │   └── PIVAnalysisScreen.tsx          # Processing UI
│   │
│   └── app/
│       ├── advanced-camera.tsx   # Route for 240fps camera
│       ├── realtime-piv.tsx      # Route for real-time viz
│       └── (tabs)/
│           ├── index.tsx         # Home screen
│           └── explore.tsx       # PIV tools menu
│
└── piv-backend/                  # Processing server (Node.js/Express)
    ├── server.js                 # Advanced PIV processing
    └── package.json
```

## 🚀 Quick Start Guide

### Prerequisites
- Samsung Galaxy S25 (or device with 240fps support)
- Node.js 18+ (for backend server)
- Expo Go app (for development)

### 1. Install Dependencies

**Mobile App:**
```bash
cd "web application/android_application"
npm install
```

**Backend Server:**
```bash
cd "web application/piv-backend"
npm install
```

### 2. Start Backend Server
```bash
cd "web application/piv-backend"
npm start
```

Expected output:
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

### 3. Start Mobile App
```bash
cd "web application/android_application"
npm start
```

Then scan the QR code with Expo Go on your Samsung S25.

## 📱 Using the Application

### 1. Advanced 240fps High-Speed Camera

**Access:** PIV Tools → "240fps High-Speed Camera"

**Features:**
- Opens Camera2 API with `ConstrainedHighSpeedCaptureSession`
- Displays available cameras with 240fps support
- Manual ISO control (100-3200)
- Manual exposure time (0.1ms - 2ms)
- Resolution selection (1920x1080, 1280x720, 720x480)
- Circular buffer capture (stores ~1000 frames)
- Raw binary .raw file export

**Workflow:**
1. App auto-detects 240fps capable cameras
2. Select resolution (recommend 1280x720 for balance)
3. Adjust manual exposure:
   - **ISO**: Start at 400-800
   - **Exposure**: Set <1ms (e.g., 0.5ms) to minimize motion blur
4. Tap "Configure 240fps High-Speed Session"
5. Tap "Start Capture" → records to circular buffer
6. Tap "Stop & Save Buffer" → exports frames as .raw files

**Technical Details:**
- Format: YUV_420_888 → Y-plane only (luminance)
- Frame rate: 240 fps constant
- Buffer: 1000 frames = 4.16 seconds at 240fps
- Export: `frame_000000.raw`, `frame_000001.raw`, ... + `metadata.txt`

### 2. Real-Time PIV Visualization

**Access:** PIV Tools → "Real-Time PIV Visualization"

**Features:**
- Live vector field overlay
- Processes every 24th frame (240fps → 10Hz display)
- Adjustable interrogation window: 32px, 64px, 128px
- Color-coded vectors (green = slow, red = fast)
- Grid overlay for alignment

**How It Works:**
```
Capture:  [Frame 1][Frame 2]...[Frame 24][Frame 25]...
                    ↓                      ↓
Process:      PIV Analysis            PIV Analysis
              (10Hz display)          (10Hz display)
```

### 3. Calibration

**Access:** PIV Tools → "Calibration"

**Purpose:** Convert pixel measurements to real-world units (mm)

**Steps:**
1. Place ruler/reference object in camera view
2. Measure known distance in pixels (e.g., 10mm ruler)
3. Input known distance: `10` mm
4. Input measured pixels: `250` pixels
5. Calculates: `25 pixels/mm`
6. Save calibration for later analysis

### 4. Analysis (Processing)

**Access:** PIV Tools → "Analysis"

**Features:**
- Process standard JPEG/PNG image pairs
- Server-based PIV computation
- Normalized Cross-Correlation
- Outlier removal (3σ threshold)
- Velocity statistics
- Calibrated real-world measurements

## 🔬 PIV Processing Details

### Normalized Cross-Correlation (DCC) Algorithm

The backend implements Direct Cross-Correlation with the following parameters:

```javascript
PIV_CONFIG = {
  interrogationWindow: 64,      // 64x64 pixel windows
  overlap: 0.5,                 // 50% overlap
  searchRange: 32,              // ±32 pixels search
  subPixelAccuracy: true,       // Gaussian peak fitting
  outlierThreshold: 3,          // 3σ outlier removal
  minimumCorrelation: 0.1       // Quality threshold
}
```

### Processing Pipeline

1. **Load Images** → Convert to grayscale (Y-plane)
2. **Extract Windows** → 64×64 px with 50% overlap
3. **Cross-Correlation** → Compute displacement via DCC
4. **Sub-pixel Fitting** → Gaussian interpolation for accuracy
5. **Filter Outliers** → Remove vectors >3σ from median
6. **Calculate Statistics** → Mean, std dev, max/avg velocity
7. **Export Results** → JSON with vectors + metadata

### Backend API Endpoints

```
POST /process               - Standard image pair (JPEG/PNG)
POST /process-raw           - Raw binary frames from circular buffer
POST /process-realtime      - Fast coarse PIV (10Hz visualization)
GET  /result/:resultId      - Retrieve processing results
GET  /config                - Get PIV configuration
POST /config                - Update PIV parameters
GET  /health                - Server health check
```

## 📊 Expected Performance

### Capture Performance
- **Frame rate**: 240 fps constant
- **Exposure time**: 0.5ms typical (adjustable 0.1-2ms)
- **Buffer capacity**: 1000 frames (~4 seconds)
- **Data rate**: ~500 MB/s (1280x720 @ 240fps)

### Processing Performance
- **PIV computation**: ~100-200ms per pair (64×64 windows)
- **Real-time display**: 10Hz vector overlay
- **Batch processing**: ~1 second per 10 pairs

### Accuracy
- **Spatial resolution**: 32-128 pixels (adjustable)
- **Displacement accuracy**: ±0.1 pixels (sub-pixel fitting)
- **Velocity range**: ±32 pixels per frame

## 🎓 Technical Implementation Notes

### Camera2 API Key Points

**1. High-Speed Capability Check:**
```kotlin
val capabilities = characteristics.get(REQUEST_AVAILABLE_CAPABILITIES)
val supportsHighSpeed = capabilities?.contains(
    REQUEST_AVAILABLE_CAPABILITIES_CONSTRAINED_HIGH_SPEED_VIDEO
)
```

**2. Session Configuration:**
```kotlin
camera.createConstrainedHighSpeedCaptureSession(
    surfaces,
    sessionCallback,
    backgroundHandler
)
```

**3. Manual Exposure:**
```kotlin
captureRequest.set(CONTROL_AE_MODE, CONTROL_AE_MODE_OFF)
captureRequest.set(SENSOR_SENSITIVITY, iso)  // 100-3200
captureRequest.set(SENSOR_EXPOSURE_TIME, exposureTimeNs)  // <1ms
```

**4. Y-Plane Extraction:**
```kotlin
val image = imageReader.acquireLatestImage()
val yPlane = image.planes[0]  // Luminance only
val yBuffer = yPlane.buffer
```

### Circular Buffer Architecture

The circular buffer uses `ArrayBlockingQueue` with overflow handling:

```kotlin
val circularBuffer = ArrayBlockingQueue<ByteArray>(BUFFER_SIZE)

// On new frame
if (!circularBuffer.offer(yData)) {
    circularBuffer.poll()  // Remove oldest
    circularBuffer.offer(yData)  // Add new
}
```

Benefits:
- Fixed memory footprint
- Automatic oldest-frame removal
- Thread-safe operations
- No memory fragmentation

## 📝 Recommended PIV Workflow

### For Best Results:

1. **Setup Flow Experiment**
   - Seed flow with appropriate particles (10-100 μm diameter)
   - Use continuous laser illumination (not pulsed)
   - Ensure uniform light sheet

2. **Calibration**
   - Calibrate with ruler/reference in measurement plane
   - Record pixels-per-mm ratio

3. **Camera Settings**
   - **ISO**: 400-800 (balance sensitivity vs noise)
   - **Exposure**: 0.5ms (fast enough to freeze particles)
   - **Resolution**: 1280x720 (balance quality vs data rate)

4. **Capture Strategy**
   - Use circular buffer for continuous recording
   - Trigger "Stop & Save" after interesting flow event
   - Multiple captures for statistical averaging

5. **Processing**
   - Upload raw .raw files to backend server
   - Process with 64×64 px windows (coarse) or 32×32 px (fine)
   - Apply calibration for real-world measurements

## 🔧 Troubleshooting

### "No cameras with 240fps support found"
- Verify device supports high-speed video
- Check Camera2 permissions granted
- Some devices may require specific modes enabled

### "Failed to configure session"
- Try lower resolution (720x480)
- Ensure no other apps using camera
- Restart app and try again

### "Circular buffer full"
- Normal behavior - automatically overwrites oldest
- Increase BUFFER_SIZE in Camera2Module.kt if needed

### Backend connection failed
- Ensure backend server running (`npm start`)
- Check IP address matches (use `ipconfig`/`ifconfig`)
- Verify port 3000 not blocked by firewall

## 📚 References & Documentation

### Android Camera2 API
- [CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP](https://developer.android.com/reference/android/hardware/camera2/CameraCharacteristics#SCALER_STREAM_CONFIGURATION_MAP)
- [ConstrainedHighSpeedCaptureSession](https://developer.android.com/reference/android/hardware/camera2/CameraConstrainedHighSpeedCaptureSession)
- [ImageFormat.YUV_420_888](https://developer.android.com/reference/android/graphics/ImageFormat#YUV_420_888)

### PIV Theory
- Raffel et al. (2018). "Particle Image Velocimetry: A Practical Guide"
- Westerweel & Scarano (2005). "Universal outlier detection for PIV data"

## 🎯 Future Enhancements (From Project Spec)

### GPU Acceleration (Appendix C)
If CPU-based processing is too slow:
- Implement Vulkan Compute Shader for DCC
- Process PIV math in parallel on GPU
- Target: <100ms per frame pair

### OpenGL Surface Texture (Appendix B)
If ImageReader is too slow:
- Read pixels directly from OpenGL SurfaceTexture
- Lower latency access to frame data
- More complex implementation

### Advanced PIV Features
- Multi-pass interrogation (adaptive window sizing)
- Window deformation for high shear flows
- 3D PIV (stereoscopic setup)

## 📄 License & Attribution

This project implements the specifications from "Project Specification: Smartphone-Based PIV Data Acquisition" internship project.

**Key Technologies:**
- React Native + Expo (Mobile UI)
- Kotlin (Android Camera2 native module)
- Node.js + Express (Backend processing)
- Sharp (Image processing)

---

**Version:** 2.0.0  
**Target Device:** Samsung Galaxy S25  
**Last Updated:** February 2026

For questions or issues, refer to the detailed project specification document.
