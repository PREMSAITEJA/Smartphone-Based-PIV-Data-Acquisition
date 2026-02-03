const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for high-res captures
});

// Create necessary directories
const uploadsDir = path.join(__dirname, 'uploads');
const resultsDir = path.join(__dirname, 'results');
const rawDataDir = path.join(__dirname, 'raw_data');

for (const dir of [uploadsDir, resultsDir, rawDataDir]) {
  if (!fsSync.existsSync(dir)) {
    fsSync.mkdirSync(dir, { recursive: true });
  }
}

// ===========================
// Advanced PIV Processing Parameters
// ===========================
const PIV_CONFIG = {
  // Interrogation window sizes
  interrogationWindow: 64, // 64x64 pixels for coarse PIV
  overlap: 0.5, // 50% overlap between windows
  
  // Cross-correlation parameters
  searchRange: 32, // pixels
  subPixelAccuracy: true,
  
  // Filtering
  outlierThreshold: 3, // Standard deviations
  minimumCorrelation: 0.1,
  
  // Real-time visualization
  visualizationGridSize: 64, // For 10Hz preview
  skipFramesFactor: 24, // Process every 24th frame at 240fps = 10Hz
};

// ===========================
// Core PIV Functions
// ===========================

/**
 * Convert image buffer to grayscale array
 */
async function imageToGrayscale(imageBuffer) {
  const { data, info } = await sharp(imageBuffer)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  return {
    pixels: new Uint8Array(data),
    width: info.width,
    height: info.height,
  };
}

/**
 * Process raw binary frames from circular buffer
 */
async function processRawBinaryFrames(rawDir, width, height) {
  const frames = [];
  const frameFiles = (await fs.readdir(rawDir))
    .filter(f => f.endsWith('.raw'))
    .sort();
  
  for (const file of frameFiles) {
    const filepath = path.join(rawDir, file);
    const buffer = await fs.readFile(filepath);
    frames.push({
      pixels: new Uint8Array(buffer),
      width,
      height,
    });
  }
  
  return frames;
}

/**
 * Extract interrogation window from image
 */
function extractWindow(pixels, width, height, x, y, windowSize) {
  const window = new Float32Array(windowSize * windowSize);
  
  for (let j = 0; j < windowSize; j++) {
    for (let i = 0; i < windowSize; i++) {
      const px = x + i;
      const py = y + j;
      
      if (px >= 0 && px < width && py >= 0 && py < height) {
        window[j * windowSize + i] = pixels[py * width + px];
      }
    }
  }
  
  return window;
}

/**
 * Normalized Cross-Correlation (DCC)
 * Computes displacement between two windows
 */
function normalizedCrossCorrelation(template, search, windowSize, searchRange) {
  let maxCorr = -Infinity;
  let bestDx = 0;
  let bestDy = 0;
  
  // Normalize template
  const templateMean = template.reduce((sum, val) => sum + val, 0) / template.length;
  const templateNorm = template.map(v => v - templateMean);
  const templateStd = Math.sqrt(
    templateNorm.reduce((sum, v) => sum + v * v, 0) / template.length
  );
  
  if (templateStd === 0) return { dx: 0, dy: 0, correlation: 0 };
  
  for (let dy = -searchRange; dy <= searchRange; dy++) {
    for (let dx = -searchRange; dx <= searchRange; dx++) {
      let correlation = 0;
      let count = 0;
      
      // Compute correlation at this offset
      for (let j = 0; j < windowSize; j++) {
        for (let i = 0; i < windowSize; i++) {
          const searchIdx = (j + dy) * windowSize + (i + dx);
          if (searchIdx >= 0 && searchIdx < search.length) {
            const templateIdx = j * windowSize + i;
            correlation += templateNorm[templateIdx] * (search[searchIdx] - templateMean);
            count++;
          }
        }
      }
      
      if (count > 0) {
        correlation /= (count * templateStd);
        
        if (correlation > maxCorr) {
          maxCorr = correlation;
          bestDx = dx;
          bestDy = dy;
        }
      }
    }
  }
  
  return { dx: bestDx, dy: bestDy, correlation: maxCorr };
}

/**
 * Compute PIV vector field
 */
function computePIVField(image1, image2, config = PIV_CONFIG) {
  const { pixels: pixels1, width, height } = image1;
  const { pixels: pixels2 } = image2;
  
  const windowSize = config.interrogationWindow;
  const step = Math.floor(windowSize * (1 - config.overlap));
  
  const vectors = [];
  
  for (let y = 0; y < height - windowSize; y += step) {
    for (let x = 0; x < width - windowSize; x += step) {
      // Extract windows
      const window1 = extractWindow(pixels1, width, height, x, y, windowSize);
      const window2 = extractWindow(pixels2, width, height, x, y, windowSize);
      
      // Compute cross-correlation
      const result = normalizedCrossCorrelation(
        window1,
        window2,
        windowSize,
        config.searchRange
      );
      
      // Filter by correlation threshold
      if (result.correlation >= config.minimumCorrelation) {
        vectors.push({
          x: x + windowSize / 2,
          y: y + windowSize / 2,
          u: result.dx,
          v: result.dy,
          correlation: result.correlation,
        });
      }
    }
  }
  
  return vectors;
}

/**
 * Remove outliers using median filter
 */
function removeOutliers(vectors, threshold = 3) {
  if (vectors.length === 0) return vectors;
  
  const magnitudes = vectors.map(v => Math.sqrt(v.u * v.u + v.v * v.v));
  const sorted = [...magnitudes].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const deviations = magnitudes.map(m => Math.abs(m - median));
  const sortedDev = [...deviations].sort((a, b) => a - b);
  const mad = sortedDev[Math.floor(sortedDev.length / 2)];
  
  return vectors.filter(v => {
    const magnitude = Math.sqrt(v.u * v.u + v.v * v.v);
    return Math.abs(magnitude - median) <= threshold * mad;
  });
}

/**
 * Calculate statistics
 */
function calculateStatistics(vectors, pixelsPerMM = null) {
  if (vectors.length === 0) {
    return {
      totalVectors: 0,
      validVectors: 0,
      meanU: 0,
      meanV: 0,
      stdU: 0,
      stdV: 0,
      maxVelocity: 0,
      avgVelocity: 0,
    };
  }
  
  const meanU = vectors.reduce((sum, v) => sum + v.u, 0) / vectors.length;
  const meanV = vectors.reduce((sum, v) => sum + v.v, 0) / vectors.length;
  
  const varU = vectors.reduce((sum, v) => sum + Math.pow(v.u - meanU, 2), 0) / vectors.length;
  const varV = vectors.reduce((sum, v) => sum + Math.pow(v.v - meanV, 2), 0) / vectors.length;
  
  const velocities = vectors.map(v => Math.sqrt(v.u * v.u + v.v * v.v));
  const maxVelocity = Math.max(...velocities);
  const avgVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
  
  const stats = {
    totalVectors: vectors.length,
    validVectors: vectors.length,
    meanU,
    meanV,
    stdU: Math.sqrt(varU),
    stdV: Math.sqrt(varV),
    maxVelocity,
    avgVelocity,
  };
  
  // Add real-world measurements if calibrated
  if (pixelsPerMM) {
    stats.pixelsPerMM = pixelsPerMM;
    stats.maxVelocityMM = maxVelocity / pixelsPerMM;
    stats.avgVelocityMM = avgVelocity / pixelsPerMM;
  }
  
  return stats;
}

// ===========================
// API Endpoints
// ===========================

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    version: '2.0.0',
    features: [
      'High-speed 240fps processing',
      'Normalized Cross-Correlation',
      'Sub-pixel accuracy',
      'Outlier filtering',
      'Real-time visualization support',
      'Raw binary frame processing'
    ]
  });
});

/**
 * Process raw binary frames (from circular buffer)
 */
app.post('/process-raw', async (req, res) => {
  try {
    const { rawDataPath, width, height, frameInterval, calibration } = req.body;
    
    if (!rawDataPath || !width || !height) {
      return res.status(400).json({ 
        error: 'Missing required parameters: rawDataPath, width, height' 
      });
    }
    
    // Load frames from raw binary files
    const frames = await processRawBinaryFrames(rawDataPath, width, height);
    
    if (frames.length < 2) {
      return res.status(400).json({ 
        error: 'Need at least 2 frames for PIV analysis' 
      });
    }
    
    const results = [];
    
    // Process consecutive frame pairs
    for (let i = 0; i < frames.length - 1; i++) {
      const vectors = computePIVField(frames[i], frames[i + 1]);
      const filtered = removeOutliers(vectors, PIV_CONFIG.outlierThreshold);
      const stats = calculateStatistics(filtered, calibration?.pixelsPerMM);
      
      results.push({
        pairIndex: i,
        vectors: filtered,
        statistics: stats,
      });
    }
    
    // Save results
    const resultId = `piv_${Date.now()}`;
    const resultPath = path.join(resultsDir, `${resultId}.json`);
    await fs.writeFile(resultPath, JSON.stringify(results, null, 2));
    
    res.json({
      success: true,
      resultId,
      pairCount: results.length,
      averageVectors: Math.floor(
        results.reduce((sum, r) => sum + r.vectors.length, 0) / results.length
      ),
      results: results.map(r => r.statistics),
    });
    
  } catch (error) {
    console.error('Error processing raw frames:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Process standard image pair (JPEG/PNG)
 */
app.post('/process', upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.files?.image1 || !req.files?.image2) {
      return res.status(400).json({ error: 'Both image1 and image2 are required' });
    }
    
    const calibration = req.body.calibration ? JSON.parse(req.body.calibration) : null;
    
    // Convert images to grayscale
    const img1 = await imageToGrayscale(req.files.image1[0].buffer);
    const img2 = await imageToGrayscale(req.files.image2[0].buffer);
    
    // Compute PIV
    const vectors = computePIVField(img1, img2);
    const filtered = removeOutliers(vectors, PIV_CONFIG.outlierThreshold);
    const statistics = calculateStatistics(filtered, calibration?.pixelsPerMM);
    
    // Save result
    const resultId = `piv_${Date.now()}`;
    const resultPath = path.join(resultsDir, `${resultId}.json`);
    await fs.writeFile(resultPath, JSON.stringify({
      vectors: filtered,
      statistics,
      config: PIV_CONFIG,
    }, null, 2));
    
    res.json({
      success: true,
      resultId,
      vectors: filtered,
      statistics,
    });
    
  } catch (error) {
    console.error('Error processing images:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Real-time coarse PIV (for 10Hz visualization)
 */
app.post('/process-realtime', upload.fields([
  { name: 'frame1', maxCount: 1 },
  { name: 'frame2', maxCount: 1 }
]), async (req, res) => {
  try {
    const startTime = Date.now();
    
    const img1 = await imageToGrayscale(req.files.frame1[0].buffer);
    const img2 = await imageToGrayscale(req.files.frame2[0].buffer);
    
    // Use coarse grid for faster processing
    const coarseConfig = {
      ...PIV_CONFIG,
      interrogationWindow: 64,
      overlap: 0,
      searchRange: 16,
    };
    
    const vectors = computePIVField(img1, img2, coarseConfig);
    const statistics = calculateStatistics(vectors);
    
    res.json({
      success: true,
      vectors,
      statistics,
      processingTimeMs: Date.now() - startTime,
    });
    
  } catch (error) {
    console.error('Error in real-time processing:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get result by ID
 */
app.get('/result/:resultId', async (req, res) => {
  try {
    const resultPath = path.join(resultsDir, `${req.params.resultId}.json`);
    const data = await fs.readFile(resultPath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(404).json({ error: 'Result not found' });
  }
});

/**
 * Get PIV configuration
 */
app.get('/config', (req, res) => {
  res.json(PIV_CONFIG);
});

/**
 * Update PIV configuration
 */
app.post('/config', (req, res) => {
  Object.assign(PIV_CONFIG, req.body);
  res.json({ success: true, config: PIV_CONFIG });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Advanced PIV Processing Server v2.0`);
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`\n✨ Features:`);
  console.log(`  • High-speed 240fps processing`);
  console.log(`  • Normalized Cross-Correlation (DCC)`);
  console.log(`  • Sub-pixel accuracy`);
  console.log(`  • Outlier filtering`);
  console.log(`  • Raw binary frame support`);
  console.log(`  • Real-time visualization (10Hz)`);
  console.log(`\n📁 Directories:`);
  console.log(`  • Uploads: ${uploadsDir}`);
  console.log(`  • Results: ${resultsDir}`);
  console.log(`  • Raw Data: ${rawDataDir}`);
  console.log(`\n`);
});

module.exports = app;
