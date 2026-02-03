const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const fs = require('fs');
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
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
const resultsDir = path.join(__dirname, 'results');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// ===========================
// PIV Processing Parameters
// ===========================
const PIV_PARAMS = {
  windowWidth: 48,
  windowHeight: 128,
  stepSize: 24,
  threshold: 3,
  roiXMin: 17,
  roiXMax: 1260,
  roiYMin: 0,
  roiYMax: 800,
};

// ===========================
// Helper Functions
// ===========================

/**
 * Convert image buffer to grayscale pixel array
 */
async function imageToPixelArray(imageBuffer) {
  const metadata = await sharp(imageBuffer).metadata();
  const data = await sharp(imageBuffer)
    .grayscale()
    .raw()
    .toBuffer();
  
  return {
    data: new Uint8Array(data),
    width: metadata.width,
    height: metadata.height,
  };
}

/**
 * Phase correlation calculation (simplified)
 */
function phaseCorrelate(template, search, width, height) {
  // Simple normalized cross-correlation
  let maxCorr = -1;
  let bestX = 0;
  let bestY = 0;
  
  const searchRange = 16; // Search range in pixels
  
  for (let dy = -searchRange; dy <= searchRange; dy++) {
    for (let dx = -searchRange; dx <= searchRange; dx++) {
      let correlation = 0;
      let count = 0;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const sy = y + dy;
          const sx = x + dx;
          
          if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
            const templateVal = template[y * width + x];
            const searchVal = search[sy * width + sx];
            correlation += templateVal * searchVal;
            count++;
          }
        }
      }
      
      correlation /= count;
      
      if (correlation > maxCorr) {
        maxCorr = correlation;
        bestX = dx;
        bestY = dy;
      }
    }
  }
  
  return { x: bestX, y: -bestY, correlation: maxCorr };
}

/**
 * Extract window from padded image
 */
function extractWindow(paddedData, x, y, width, height, paddedWidth) {
  const window = new Float32Array(width * height);
  
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const paddedIdx = (y + row) * paddedWidth + (x + col);
      const windowIdx = row * width + col;
      window[windowIdx] = paddedData[paddedIdx];
    }
  }
  
  return window;
}

/**
 * Apply Hanning window function
 */
function applyHanningWindow(data, width, height) {
  const windowed = new Float32Array(data.length);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const hanningX = 0.5 * (1 - Math.cos(2 * Math.PI * x / (width - 1)));
      const hanningY = 0.5 * (1 - Math.cos(2 * Math.PI * y / (height - 1)));
      const idx = y * width + x;
      windowed[idx] = data[idx] * hanningX * hanningY;
    }
  }
  
  return windowed;
}

/**
 * Process single image pair
 */
async function processImagePair(img1Buffer, img2Buffer, calibration = null) {
  try {
    console.log('Loading images...');
    const frame1 = await imageToPixelArray(img1Buffer);
    const frame2 = await imageToPixelArray(img2Buffer);
    
    if (frame1.width !== frame2.width || frame1.height !== frame2.height) {
      throw new Error('Images must have the same dimensions');
    }
    
    const { width, height } = frame1;
    const padLeft = PIV_PARAMS.windowWidth / 2;
    const padRight = PIV_PARAMS.windowWidth / 2;
    const padTop = PIV_PARAMS.windowHeight / 2;
    const padBottom = PIV_PARAMS.windowHeight / 2;
    
    // Pad images
    console.log('Padding images...');
    const paddedWidth = width + padLeft + padRight;
    const paddedHeight = height + padTop + padBottom;
    
    const frame1Padded = new Float32Array(paddedWidth * paddedHeight);
    const frame2Padded = new Float32Array(paddedWidth * paddedHeight);
    
    // Fill padded arrays (simple reflection padding)
    for (let y = 0; y < paddedHeight; y++) {
      for (let x = 0; x < paddedWidth; x++) {
        let srcX = x - padLeft;
        let srcY = y - padTop;
        
        // Reflection padding
        if (srcX < 0) srcX = -srcX - 1;
        if (srcX >= width) srcX = 2 * width - srcX - 1;
        if (srcY < 0) srcY = -srcY - 1;
        if (srcY >= height) srcY = 2 * height - srcY - 1;
        
        const srcIdx = srcY * width + srcX;
        const dstIdx = y * paddedWidth + x;
        
        frame1Padded[dstIdx] = frame1.data[srcIdx];
        frame2Padded[dstIdx] = frame2.data[srcIdx];
      }
    }
    
    // Process windows
    console.log('Processing windows...');
    const originsX = [];
    const originsY = [];
    const vectorsX = [];
    const vectorsY = [];
    
    for (let y = padTop; y <= paddedHeight - padBottom - PIV_PARAMS.windowHeight; y += PIV_PARAMS.stepSize) {
      for (let x = padLeft; x <= paddedWidth - padRight - PIV_PARAMS.windowWidth; x += PIV_PARAMS.stepSize) {
        const xCenter = x - padLeft + PIV_PARAMS.windowWidth / 2;
        const yCenter = y - padTop + PIV_PARAMS.windowHeight / 2;
        
        // Check ROI
        if (xCenter >= PIV_PARAMS.roiXMin && xCenter <= PIV_PARAMS.roiXMax &&
            yCenter >= PIV_PARAMS.roiYMin && yCenter <= PIV_PARAMS.roiYMax) {
          
          const template = extractWindow(frame1Padded, x, y, PIV_PARAMS.windowWidth, PIV_PARAMS.windowHeight, paddedWidth);
          const search = extractWindow(frame2Padded, x, y, PIV_PARAMS.windowWidth, PIV_PARAMS.windowHeight, paddedWidth);
          
          const templateWindowed = applyHanningWindow(template, PIV_PARAMS.windowWidth, PIV_PARAMS.windowHeight);
          const searchWindowed = applyHanningWindow(search, PIV_PARAMS.windowWidth, PIV_PARAMS.windowHeight);
          
          const shift = phaseCorrelate(templateWindowed, searchWindowed, PIV_PARAMS.windowWidth, PIV_PARAMS.windowHeight);
          
          originsX.push(xCenter);
          originsY.push(yCenter);
          vectorsX.push(shift.x);
          vectorsY.push(shift.y);
        }
      }
    }
    
    console.log(`Processed ${vectorsX.length} vectors`);
    
    // Filter outliers
    console.log('Filtering outliers...');
    const meanX = vectorsX.reduce((a, b) => a + b, 0) / vectorsX.length;
    const meanY = vectorsY.reduce((a, b) => a + b, 0) / vectorsY.length;
    
    const stdX = Math.sqrt(vectorsX.reduce((sq, n) => sq + Math.pow(n - meanX, 2), 0) / vectorsX.length);
    const stdY = Math.sqrt(vectorsY.reduce((sq, n) => sq + Math.pow(n - meanY, 2), 0) / vectorsY.length);
    
    const filteredVectorsX = vectorsX.map((v, i) => 
      Math.abs(v - meanX) < PIV_PARAMS.threshold * stdX ? v : NaN
    );
    const filteredVectorsY = vectorsY.map((v, i) => 
      Math.abs(v - meanY) < PIV_PARAMS.threshold * stdY ? v : NaN
    );
    
    // Local median filter for interpolation
    for (let i = 0; i < originsX.length; i++) {
      if (isNaN(filteredVectorsX[i]) || isNaN(filteredVectorsY[i])) {
        const neighbors = [];
        
        for (let j = 0; j < originsX.length; j++) {
          if (Math.abs(originsX[j] - originsX[i]) <= PIV_PARAMS.stepSize &&
              Math.abs(originsY[j] - originsY[i]) <= PIV_PARAMS.stepSize &&
              !isNaN(filteredVectorsX[j]) &&
              !isNaN(filteredVectorsY[j])) {
            neighbors.push(j);
          }
        }
        
        if (neighbors.length > 0) {
          const neighborVX = neighbors.map(j => filteredVectorsX[j]).sort((a, b) => a - b);
          const neighborVY = neighbors.map(j => filteredVectorsY[j]).sort((a, b) => a - b);
          
          filteredVectorsX[i] = neighborVX[Math.floor(neighborVX.length / 2)];
          filteredVectorsY[i] = neighborVY[Math.floor(neighborVY.length / 2)];
        }
      }
    }
    
    // Calculate statistics
    const validVectors = filteredVectorsX.filter(v => !isNaN(v));
    const maxVelocity = Math.max(...validVectors.map(Math.abs));
    const avgVelocity = validVectors.reduce((a, b) => a + b, 0) / validVectors.length;
    
    // Apply calibration if provided
    let pixelsPerMM = 1;
    if (calibration && calibration.pixelsPerMM) {
      pixelsPerMM = calibration.pixelsPerMM;
    }
    
    return {
      originsX,
      originsY,
      vectorsX: filteredVectorsX,
      vectorsY: filteredVectorsY,
      statistics: {
        totalVectors: vectorsX.length,
        validVectors: validVectors.length,
        meanX,
        meanY,
        stdX,
        stdY,
        maxVelocity,
        avgVelocity,
        pixelsPerMM,
        maxVelocityMM: maxVelocity / pixelsPerMM,
        avgVelocityMM: avgVelocity / pixelsPerMM,
      },
      parameters: PIV_PARAMS,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error processing image pair:', error);
    throw error;
  }
}

// ===========================
// API Endpoints
// ===========================

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'PIV Processing Server is running', version: '1.0.0' });
});

/**
 * Process image pair endpoint
 */
app.post('/process', upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.files.image1 || !req.files.image2) {
      return res.status(400).json({ error: 'Both image1 and image2 are required' });
    }

    const calibration = req.body.calibration ? JSON.parse(req.body.calibration) : null;
    
    console.log('Processing image pair...');
    const result = await processImagePair(
      req.files.image1[0].buffer,
      req.files.image2[0].buffer,
      calibration
    );

    // Save result
    const resultId = `result_${Date.now()}`;
    const resultPath = path.join(resultsDir, `${resultId}.json`);
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));

    res.json({
      success: true,
      resultId,
      ...result,
    });
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get result endpoint
 */
app.get('/result/:resultId', (req, res) => {
  try {
    const resultPath = path.join(resultsDir, `${req.params.resultId}.json`);
    
    if (!fs.existsSync(resultPath)) {
      return res.status(404).json({ error: 'Result not found' });
    }

    const result = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Batch process endpoint
 */
app.post('/batch-process', upload.array('imagePairs', 100), async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ error: 'At least 2 images are required' });
    }

    const calibration = req.body.calibration ? JSON.parse(req.body.calibration) : null;
    const results = [];

    // Process pairs (assuming alternating image1, image2, image1, image2, ...)
    for (let i = 0; i < req.files.length - 1; i += 2) {
      try {
        const result = await processImagePair(
          req.files[i].buffer,
          req.files[i + 1].buffer,
          calibration
        );
        results.push(result);
      } catch (error) {
        console.error(`Error processing pair ${i/2}:`, error);
        results.push({ error: error.message });
      }
    }

    res.json({
      success: true,
      pairsProcessed: results.length,
      results,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`PIV Processing Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
