import { NativeModulesProxy, EventEmitter } from 'expo-modules-core';

const Camera2Module = NativeModulesProxy.Camera2Module;

export interface CameraInfo {
  id: string;
  supportsHighSpeed: boolean;
  highSpeedSizes: string[];
  fpsRanges: string[];
  isoRange: number[];
  exposureRange: number[];
}

export interface CaptureResult {
  frameCount: number;
  duration: number;
  averageFps: number;
  outputPath: string;
}

export interface ExposureSettings {
  iso: number;
  exposureTimeNs: number;
  exposureTimeMs: number;
}

/**
 * Get available cameras with 240fps high-speed capability
 */
export async function getAvailableCameras(): Promise<CameraInfo[]> {
  return await Camera2Module.getAvailableCameras();
}

/**
 * Open camera with specified ID
 */
export async function openCamera(cameraId: string): Promise<any> {
  return await Camera2Module.openCamera(cameraId);
}

/**
 * Configure high-speed capture session at 240fps
 * @param width - Frame width in pixels
 * @param height - Frame height in pixels
 * @param targetFps - Target frame rate (e.g., 240)
 */
export async function configureHighSpeedSession(
  width: number,
  height: number,
  targetFps: number = 240
): Promise<any> {
  return await Camera2Module.configureHighSpeedSession(width, height, targetFps);
}

/**
 * Set manual exposure controls
 * @param iso - ISO sensitivity (100-3200 typical)
 * @param exposureTimeNs - Exposure time in nanoseconds (e.g., 1000000 = 1ms)
 */
export async function setManualExposure(
  iso: number,
  exposureTimeNs: number
): Promise<ExposureSettings> {
  return await Camera2Module.setManualExposure(iso, exposureTimeNs);
}

/**
 * Start high-speed capture to circular buffer
 */
export async function startCapture(): Promise<any> {
  return await Camera2Module.startCapture();
}

/**
 * Stop capture and save buffer to raw binary files
 * @param outputPath - Directory path to save frames
 */
export async function stopCapture(outputPath: string): Promise<CaptureResult> {
  return await Camera2Module.stopCapture(outputPath);
}

/**
 * Close camera and release resources
 */
export async function closeCamera(): Promise<any> {
  return await Camera2Module.closeCamera();
}

// Helper function to convert exposure time ms to ns
export function msToNs(ms: number): number {
  return Math.floor(ms * 1000000);
}

// Helper function to convert exposure time ns to ms
export function nsToMs(ns: number): number {
  return ns / 1000000;
}
