# PIV Camera Application

A professional Particle Image Velocimetry (PIV) application for Samsung S25 Ultra, designed for capturing and analyzing fluid flow patterns using particle tracking.

## Features

### 🎯 Core Functionality
- **High-Speed Image Pair Capture**: Capture sequential image pairs with precise timing (50-1000ms intervals)
- **Batch Capture Mode**: Capture 1-50 image pairs in a single session
- **Multiple Resolution Settings**: High, Medium, and Low quality options
- **Real-time Grid Overlay**: Visual alignment guides for precise positioning

### 📸 PIV Camera
- Sequential image pair capture optimized for PIV analysis
- Configurable time intervals between images (Δt)
- Batch capture for time-series analysis
- Flash control for varied lighting conditions
- Live preview with alignment grid
- Status indicators and capture progress

### 📏 Calibration Tools
- Spatial calibration with reference objects
- Pixels-per-millimeter calculation
- Camera parameter configuration
- Field of view measurements
- Calibration data storage and retrieval
- Built-in PIV best practices guide

### 🖼️ Image Gallery
- View all captured image pairs
- Organized by timestamp
- Side-by-side pair preview
- Individual pair deletion
- Bulk delete functionality
- Storage statistics

### 💾 Data Management
- Structured file storage in PIV directory
- JSON metadata export
- Capture settings documentation
- Timestamp tracking
- Device information logging
- Export-ready format for PIV analysis software

## Installation

```bash
npm install
```

## Running the App

### Android (Samsung S25 Ultra)
```bash
npm run android
```

### iOS
```bash
npm run ios
```

### Web (Development)
```bash
npm run web
```

## PIV Measurement Workflow

1. **Calibration**
   - Navigate to Calibration screen
   - Place a ruler or reference object in the measurement plane
   - Measure known distance in pixels
   - Calculate and save calibration data

2. **Setup**
   - Prepare flow with appropriate seeding particles (10-100 μm)
   - Ensure uniform illumination
   - Position camera perpendicular to measurement plane

3. **Configure Capture**
   - Set time interval (Δt) based on flow velocity
   - Aim for 5-10 pixel particle displacement
   - Choose number of pairs needed
   - Select appropriate resolution

4. **Capture**
   - Use PIV Camera to capture image pairs
   - Review captures in Gallery
   - Repeat if necessary

5. **Export**
   - Export metadata with calibration data
   - Transfer images and metadata for post-processing
   - Use with PIV software (PIVlab, OpenPIV, etc.)

## PIV Best Practices

- **Seeding**: Use particles 10-100 μm in diameter
- **Illumination**: Ensure uniform lighting of measurement plane
- **Time Interval**: Set Δt for 5-10 pixel displacement
- **Out-of-plane motion**: Minimize depth-wise particle movement
- **Calibration**: Always calibrate at the measurement plane
- **Resolution**: Use highest resolution for best accuracy

## Technical Specifications

### Supported Capture Settings
- **Time Intervals**: 50ms, 100ms, 200ms, 500ms, 1000ms (customizable)
- **Pair Count**: 1-50 pairs per session
- **Resolution**: High (1.0), Medium (0.7), Low (0.5)
- **Flash Modes**: On, Off

### File Structure
```
PIV/
├── PIV_[timestamp]_[index]_img1.jpg
├── PIV_[timestamp]_[index]_img2.jpg
├── metadata.json
└── calibration.json
```

### Metadata Format
```json
{
  "captureDate": "ISO 8601 timestamp",
  "device": "Samsung S25 Ultra",
  "settings": {
    "pairInterval": 100,
    "pairCount": 10,
    "resolution": "high"
  },
  "imagePairs": [...]
}
```

## Samsung S25 Ultra Optimizations

This app leverages the Samsung S25 Ultra's advanced camera capabilities:
- High-resolution sensor for detailed particle tracking
- Fast capture rates for precise time intervals
- Excellent low-light performance
- Advanced processing capabilities

## Post-Processing

The captured images can be processed with various PIV software:
- **PIVlab** (MATLAB)
- **OpenPIV** (Python)
- **DaVis** (LaVision)
- **PIVview** (PIVTEC)

## Troubleshooting

### Images too bright/dark
- Adjust flash settings
- Modify ambient lighting
- Use manual exposure control (if available)

### Particles not visible
- Increase seeding density
- Improve illumination
- Check particle size

### Blurry images
- Reduce time interval
- Stabilize camera mounting
- Focus on measurement plane

## Dependencies

- expo-camera: Camera functionality
- expo-file-system: File and directory management
- expo-router: Navigation
- react-native: UI framework

## Development

This is an Expo-based React Native application using TypeScript.

### Project Structure
```
app/
├── (tabs)/
│   ├── index.tsx          # Home screen
│   └── explore.tsx        # Tools screen
├── camera.tsx             # PIV Camera route
├── gallery.tsx            # Gallery route
└── calibration.tsx        # Calibration route

components/
├── PIVCameraScreen.tsx    # Main camera component
├── PIVGalleryScreen.tsx   # Gallery component
└── PIVCalibrationScreen.tsx # Calibration component
```

## License

This project is for research and educational purposes.

## Contact

For questions about PIV methodology or application usage, please refer to the included PIV literature.

## References

Based on principles from "Particle Image Velocimetry: A Practical Guide" by Raffel et al.
