package com.pivapp.camera2

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.ImageFormat
import android.hardware.camera2.*
import android.hardware.camera2.params.StreamConfigurationMap
import android.media.Image
import android.media.ImageReader
import android.os.Handler
import android.os.HandlerThread
import android.util.Log
import android.util.Range
import android.util.Size
import android.view.Surface
import androidx.core.app.ActivityCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.util.concurrent.ArrayBlockingQueue

class Camera2Module : Module() {
    private val TAG = "Camera2Module"
    private var cameraDevice: CameraDevice? = null
    private var captureSession: CameraCaptureSession? = null
    private var imageReader: ImageReader? = null
    private var backgroundThread: HandlerThread? = null
    private var backgroundHandler: Handler? = null
    
    // Circular buffer for high-speed capture
    private val BUFFER_SIZE = 1000 // Store up to 1000 frames (~4 seconds at 240fps)
    private val circularBuffer = ArrayBlockingQueue<ByteArray>(BUFFER_SIZE)
    private var isCapturing = false
    private var captureStartTime = 0L
    
    // Camera characteristics
    private var sensorSensitivityRange: Range<Int>? = null
    private var exposureTimeRange: Range<Long>? = null
    private var availableFpsRanges: Array<Range<Int>>? = null
    
    // Manual controls
    private var manualISO: Int = 100
    private var manualExposureTime: Long = 1000000L // 1ms in nanoseconds
    
    override fun definition() = ModuleDefinition {
        Name("Camera2Module")
        
        // Get available cameras with 240fps support
        AsyncFunction("getAvailableCameras") { promise: Promise ->
            try {
                val context = appContext.reactContext ?: throw Exception("Context not available")
                val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
                val cameras = mutableListOf<Map<String, Any>>()
                
                for (cameraId in cameraManager.cameraIdList) {
                    val characteristics = cameraManager.getCameraCharacteristics(cameraId)
                    
                    // Check for high-speed video capability
                    val capabilities = characteristics.get(CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES)
                    val supportsHighSpeed = capabilities?.contains(
                        CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_CONSTRAINED_HIGH_SPEED_VIDEO
                    ) ?: false
                    
                    if (supportsHighSpeed) {
                        val configMap = characteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
                        val highSpeedSizes = configMap?.highSpeedVideoSizes ?: emptyArray()
                        val fpsRanges = configMap?.highSpeedVideoFpsRanges ?: emptyArray()
                        
                        // Get sensor sensitivity and exposure ranges
                        val isoRange = characteristics.get(CameraCharacteristics.SENSOR_INFO_SENSITIVITY_RANGE)
                        val expRange = characteristics.get(CameraCharacteristics.SENSOR_INFO_EXPOSURE_TIME_RANGE)
                        
                        cameras.add(mapOf(
                            "id" to cameraId,
                            "supportsHighSpeed" to true,
                            "highSpeedSizes" to highSpeedSizes.map { "${it.width}x${it.height}" },
                            "fpsRanges" to fpsRanges.map { "[${it.lower}-${it.upper}]" },
                            "isoRange" to listOfNotNull(isoRange?.lower, isoRange?.upper),
                            "exposureRange" to listOfNotNull(expRange?.lower, expRange?.upper)
                        ))
                    }
                }
                
                promise.resolve(cameras)
            } catch (e: Exception) {
                promise.reject("ERROR", "Failed to get cameras: ${e.message}", e)
            }
        }
        
        // Open camera with 240fps support
        AsyncFunction("openCamera") { cameraId: String, promise: Promise ->
            try {
                val context = appContext.reactContext ?: throw Exception("Context not available")
                val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
                
                // Check permission
                if (ActivityCompat.checkSelfPermission(context, Manifest.permission.CAMERA) 
                    != PackageManager.PERMISSION_GRANTED) {
                    promise.reject("PERMISSION_DENIED", "Camera permission not granted")
                    return@AsyncFunction
                }
                
                // Get camera characteristics
                val characteristics = cameraManager.getCameraCharacteristics(cameraId)
                sensorSensitivityRange = characteristics.get(CameraCharacteristics.SENSOR_INFO_SENSITIVITY_RANGE)
                exposureTimeRange = characteristics.get(CameraCharacteristics.SENSOR_INFO_EXPOSURE_TIME_RANGE)
                
                val configMap = characteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
                availableFpsRanges = configMap?.highSpeedVideoFpsRanges
                
                startBackgroundThread()
                
                cameraManager.openCamera(cameraId, object : CameraDevice.StateCallback() {
                    override fun onOpened(camera: CameraDevice) {
                        cameraDevice = camera
                        promise.resolve(mapOf(
                            "status" to "opened",
                            "cameraId" to cameraId,
                            "isoRange" to listOfNotNull(sensorSensitivityRange?.lower, sensorSensitivityRange?.upper),
                            "exposureRange" to listOfNotNull(exposureTimeRange?.lower, exposureTimeRange?.upper)
                        ))
                    }
                    
                    override fun onDisconnected(camera: CameraDevice) {
                        camera.close()
                        cameraDevice = null
                        promise.reject("DISCONNECTED", "Camera disconnected")
                    }
                    
                    override fun onError(camera: CameraDevice, error: Int) {
                        camera.close()
                        cameraDevice = null
                        promise.reject("ERROR", "Camera error: $error")
                    }
                }, backgroundHandler)
                
            } catch (e: Exception) {
                promise.reject("ERROR", "Failed to open camera: ${e.message}", e)
            }
        }
        
        // Configure high-speed capture session
        AsyncFunction("configureHighSpeedSession") { width: Int, height: Int, targetFps: Int, promise: Promise ->
            try {
                val camera = cameraDevice ?: throw Exception("Camera not opened")
                
                // Create ImageReader for YUV420 format
                imageReader = ImageReader.newInstance(width, height, ImageFormat.YUV_420_888, 30)
                imageReader?.setOnImageAvailableListener({ reader ->
                    val image = reader.acquireLatestImage()
                    image?.let {
                        processYPlane(it)
                        it.close()
                    }
                }, backgroundHandler)
                
                val surfaces = listOf(imageReader!!.surface)
                
                // Create constrained high-speed capture session
                camera.createConstrainedHighSpeedCaptureSession(
                    surfaces,
                    object : CameraCaptureSession.StateCallback() {
                        override fun onConfigured(session: CameraCaptureSession) {
                            captureSession = session
                            promise.resolve(mapOf("status" to "configured"))
                        }
                        
                        override fun onConfigureFailed(session: CameraCaptureSession) {
                            promise.reject("CONFIG_FAILED", "Failed to configure session")
                        }
                    },
                    backgroundHandler
                )
            } catch (e: Exception) {
                promise.reject("ERROR", "Failed to configure session: ${e.message}", e)
            }
        }
        
        // Set manual exposure controls
        AsyncFunction("setManualExposure") { iso: Int, exposureTimeNs: Double, promise: Promise ->
            try {
                // Validate ranges
                val isoRange = sensorSensitivityRange ?: throw Exception("ISO range not available")
                val expRange = exposureTimeRange ?: throw Exception("Exposure range not available")
                
                val clampedISO = iso.coerceIn(isoRange.lower, isoRange.upper)
                val clampedExp = exposureTimeNs.toLong().coerceIn(expRange.lower, expRange.upper)
                
                manualISO = clampedISO
                manualExposureTime = clampedExp
                
                promise.resolve(mapOf(
                    "iso" to clampedISO,
                    "exposureTimeNs" to clampedExp,
                    "exposureTimeMs" to (clampedExp / 1000000.0)
                ))
            } catch (e: Exception) {
                promise.reject("ERROR", "Failed to set exposure: ${e.message}", e)
            }
        }
        
        // Start high-speed capture
        AsyncFunction("startCapture") { promise: Promise ->
            try {
                val session = captureSession ?: throw Exception("Session not configured")
                val camera = cameraDevice ?: throw Exception("Camera not opened")
                
                circularBuffer.clear()
                isCapturing = true
                captureStartTime = System.currentTimeMillis()
                
                // Build capture request with manual controls
                val requestBuilder = camera.createCaptureRequest(CameraDevice.TEMPLATE_RECORD)
                requestBuilder.addTarget(imageReader!!.surface)
                
                // Set manual exposure
                requestBuilder.set(CaptureRequest.CONTROL_AE_MODE, CaptureRequest.CONTROL_AE_MODE_OFF)
                requestBuilder.set(CaptureRequest.SENSOR_SENSITIVITY, manualISO)
                requestBuilder.set(CaptureRequest.SENSOR_EXPOSURE_TIME, manualExposureTime)
                
                // Set high frame rate
                requestBuilder.set(CaptureRequest.CONTROL_AE_TARGET_FPS_RANGE, Range(240, 240))
                
                session.setRepeatingRequest(
                    requestBuilder.build(),
                    null,
                    backgroundHandler
                )
                
                promise.resolve(mapOf("status" to "capturing"))
            } catch (e: Exception) {
                promise.reject("ERROR", "Failed to start capture: ${e.message}", e)
            }
        }
        
        // Stop capture and save buffer
        AsyncFunction("stopCapture") { outputPath: String, promise: Promise ->
            try {
                isCapturing = false
                captureSession?.stopRepeating()
                
                val captureTime = System.currentTimeMillis() - captureStartTime
                val frameCount = circularBuffer.size
                
                // Save buffer to raw binary files
                val outputDir = File(outputPath)
                outputDir.mkdirs()
                
                val frames = mutableListOf<ByteArray>()
                circularBuffer.drainTo(frames)
                
                // Save each frame as raw binary
                frames.forEachIndexed { index, frameData ->
                    val frameFile = File(outputDir, "frame_${String.format("%06d", index)}.raw")
                    FileOutputStream(frameFile).use { it.write(frameData) }
                }
                
                // Save metadata
                val metadataFile = File(outputDir, "metadata.txt")
                metadataFile.writeText("""
                    Frame Count: $frameCount
                    Capture Duration: ${captureTime}ms
                    Average FPS: ${frameCount * 1000.0 / captureTime}
                    ISO: $manualISO
                    Exposure Time: ${manualExposureTime}ns (${manualExposureTime / 1000000.0}ms)
                    Format: YUV420 Y-plane (Luminance only)
                    Width: ${imageReader?.width}
                    Height: ${imageReader?.height}
                """.trimIndent())
                
                promise.resolve(mapOf(
                    "frameCount" to frameCount,
                    "duration" to captureTime,
                    "averageFps" to (frameCount * 1000.0 / captureTime),
                    "outputPath" to outputPath
                ))
                
            } catch (e: Exception) {
                promise.reject("ERROR", "Failed to stop capture: ${e.message}", e)
            }
        }
        
        // Close camera
        AsyncFunction("closeCamera") { promise: Promise ->
            try {
                captureSession?.close()
                captureSession = null
                cameraDevice?.close()
                cameraDevice = null
                imageReader?.close()
                imageReader = null
                stopBackgroundThread()
                
                promise.resolve(mapOf("status" to "closed"))
            } catch (e: Exception) {
                promise.reject("ERROR", "Failed to close camera: ${e.message}", e)
            }
        }
    }
    
    // Extract Y-plane (luminance) from YUV420 image
    private fun processYPlane(image: Image) {
        if (!isCapturing) return
        
        try {
            // Get Y-plane buffer
            val yPlane = image.planes[0]
            val yBuffer = yPlane.buffer
            val ySize = yBuffer.remaining()
            
            // Copy Y-plane data
            val yData = ByteArray(ySize)
            yBuffer.get(yData)
            
            // Add to circular buffer (overwrites oldest if full)
            if (!circularBuffer.offer(yData)) {
                circularBuffer.poll() // Remove oldest
                circularBuffer.offer(yData) // Add new
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error processing Y-plane: ${e.message}")
        }
    }
    
    private fun startBackgroundThread() {
        backgroundThread = HandlerThread("Camera2Background")
        backgroundThread?.start()
        backgroundHandler = Handler(backgroundThread!!.looper)
    }
    
    private fun stopBackgroundThread() {
        backgroundThread?.quitSafely()
        try {
            backgroundThread?.join()
            backgroundThread = null
            backgroundHandler = null
        } catch (e: InterruptedException) {
            Log.e(TAG, "Error stopping background thread: ${e.message}")
        }
    }
}
