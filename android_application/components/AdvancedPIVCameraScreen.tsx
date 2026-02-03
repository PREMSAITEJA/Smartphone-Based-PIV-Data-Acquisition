import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import * as FileSystem from 'expo-file-system';
import * as Camera2 from '@/modules/camera2';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CameraState {
  isOpen: boolean;
  isConfigured: boolean;
  isCapturing: boolean;
  cameraId: string | null;
  availableCameras: Camera2.CameraInfo[];
}

export default function AdvancedPIVCameraScreen() {
  const router = useRouter();
  
  // Camera state
  const [cameraState, setCameraState] = useState<CameraState>({
    isOpen: false,
    isConfigured: false,
    isCapturing: false,
    cameraId: null,
    availableCameras: [],
  });
  
  // Manual exposure controls
  const [iso, setIso] = useState(400);
  const [exposureTimeMs, setExposureTimeMs] = useState(0.5); // 500µs = 0.5ms
  const [isoRange, setIsoRange] = useState([100, 3200]);
  const [exposureRange, setExposureRange] = useState([0.1, 10]); // in ms
  
  // Capture settings
  const [resolution, setResolution] = useState({ width: 1280, height: 720 });
  const [targetFps] = useState(240);
  
  // Capture stats
  const [captureStats, setCaptureStats] = useState({
    frameCount: 0,
    duration: 0,
    averageFps: 0,
  });
  
  useEffect(() => {
    initializeCamera();
    
    return () => {
      cleanup();
    };
  }, []);
  
  const initializeCamera = async () => {
    try {
      // Get available cameras
      const cameras = await Camera2.getAvailableCameras();
      
      if (cameras.length === 0) {
        Alert.alert('Error', 'No cameras with 240fps support found on this device');
        return;
      }
      
      setCameraState(prev => ({
        ...prev,
        availableCameras: cameras,
      }));
      
      // Auto-select first camera
      await selectCamera(cameras[0].id);
      
    } catch (error: any) {
      Alert.alert('Camera Error', error.message);
    }
  };
  
  const selectCamera = async (cameraId: string) => {
    try {
      const result = await Camera2.openCamera(cameraId);
      
      // Update ISO and exposure ranges from camera capabilities
      if (result.isoRange && result.isoRange.length === 2) {
        setIsoRange(result.isoRange);
        setIso(Math.min(400, result.isoRange[1]));
      }
      
      if (result.exposureRange && result.exposureRange.length === 2) {
        // Convert nanoseconds to milliseconds
        const expRangeMs = result.exposureRange.map((ns: number) => ns / 1000000);
        setExposureRange(expRangeMs);
        setExposureTimeMs(Math.min(0.5, expRangeMs[1]));
      }
      
      setCameraState(prev => ({
        ...prev,
        isOpen: true,
        cameraId,
      }));
      
      Alert.alert('Camera Opened', `Camera ${cameraId} is ready for configuration`);
      
    } catch (error: any) {
      Alert.alert('Error', `Failed to open camera: ${error.message}`);
    }
  };
  
  const configureSession = async () => {
    try {
      if (!cameraState.isOpen) {
        Alert.alert('Error', 'Please open camera first');
        return;
      }
      
      await Camera2.configureHighSpeedSession(
        resolution.width,
        resolution.height,
        targetFps
      );
      
      // Set initial manual exposure
      await Camera2.setManualExposure(iso, Camera2.msToNs(exposureTimeMs));
      
      setCameraState(prev => ({
        ...prev,
        isConfigured: true,
      }));
      
      Alert.alert('Success', `High-speed session configured at ${targetFps}fps`);
      
    } catch (error: any) {
      Alert.alert('Error', `Failed to configure session: ${error.message}`);
    }
  };
  
  const updateExposure = async () => {
    try {
      const result = await Camera2.setManualExposure(iso, Camera2.msToNs(exposureTimeMs));
      Alert.alert('Exposure Updated', 
        `ISO: ${result.iso}\nExposure: ${result.exposureTimeMs.toFixed(3)}ms`
      );
    } catch (error: any) {
      Alert.alert('Error', `Failed to update exposure: ${error.message}`);
    }
  };
  
  const startCapture = async () => {
    try {
      if (!cameraState.isConfigured) {
        Alert.alert('Error', 'Please configure session first');
        return;
      }
      
      await Camera2.startCapture();
      
      setCameraState(prev => ({
        ...prev,
        isCapturing: true,
      }));
      
      Alert.alert('Capturing', 'High-speed capture started. Recording to circular buffer...');
      
    } catch (error: any) {
      Alert.alert('Error', `Failed to start capture: ${error.message}`);
    }
  };
  
  const stopCapture = async () => {
    try {
      const outputPath = `${FileSystem.documentDirectory}PIV/HighSpeed_${Date.now()}`;
      
      const result = await Camera2.stopCapture(outputPath);
      
      setCameraState(prev => ({
        ...prev,
        isCapturing: false,
      }));
      
      setCaptureStats({
        frameCount: result.frameCount,
        duration: result.duration,
        averageFps: result.averageFps,
      });
      
      Alert.alert('Capture Complete', 
        `Frames: ${result.frameCount}\n` +
        `Duration: ${(result.duration / 1000).toFixed(2)}s\n` +
        `Average FPS: ${result.averageFps.toFixed(1)}\n` +
        `Saved to: ${outputPath}`
      );
      
    } catch (error: any) {
      Alert.alert('Error', `Failed to stop capture: ${error.message}`);
    }
  };
  
  const cleanup = async () => {
    try {
      await Camera2.closeCamera();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Advanced PIV Camera</Text>
        <View style={{ width: 60 }} />
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Camera Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📹 Camera Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Camera:</Text>
            <Text style={[styles.statusValue, cameraState.isOpen && styles.statusActive]}>
              {cameraState.isOpen ? `Open (${cameraState.cameraId})` : 'Not Open'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Session:</Text>
            <Text style={[styles.statusValue, cameraState.isConfigured && styles.statusActive]}>
              {cameraState.isConfigured ? `Configured (${targetFps}fps)` : 'Not Configured'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Capture:</Text>
            <Text style={[styles.statusValue, cameraState.isCapturing && styles.statusActive]}>
              {cameraState.isCapturing ? 'RECORDING' : 'Idle'}
            </Text>
          </View>
        </View>
        
        {/* Available Cameras */}
        {cameraState.availableCameras.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📱 Available Cameras</Text>
            {cameraState.availableCameras.map((camera) => (
              <View key={camera.id} style={styles.cameraCard}>
                <Text style={styles.cameraId}>Camera {camera.id}</Text>
                <Text style={styles.cameraDetail}>
                  FPS Ranges: {camera.fpsRanges.join(', ')}
                </Text>
                <Text style={styles.cameraDetail}>
                  Resolutions: {camera.highSpeedSizes.slice(0, 3).join(', ')}
                </Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Resolution Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Resolution</Text>
          <View style={styles.resolutionButtons}>
            <TouchableOpacity
              style={[styles.resButton, resolution.width === 1920 && styles.resButtonActive]}
              onPress={() => setResolution({ width: 1920, height: 1080 })}
            >
              <Text style={styles.resButtonText}>1920x1080</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.resButton, resolution.width === 1280 && styles.resButtonActive]}
              onPress={() => setResolution({ width: 1280, height: 720 })}
            >
              <Text style={styles.resButtonText}>1280x720</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.resButton, resolution.width === 720 && styles.resButtonActive]}
              onPress={() => setResolution({ width: 720, height: 480 })}
            >
              <Text style={styles.resButtonText}>720x480</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Manual Exposure Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Manual Exposure Controls</Text>
          
          {/* ISO Control */}
          <View style={styles.controlGroup}>
            <View style={styles.controlHeader}>
              <Text style={styles.controlLabel}>ISO Sensitivity</Text>
              <Text style={styles.controlValue}>{iso}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={isoRange[0]}
              maximumValue={isoRange[1]}
              value={iso}
              onValueChange={setIso}
              minimumTrackTintColor="#4CAF50"
              maximumTrackTintColor="#666"
              thumbTintColor="#4CAF50"
              step={50}
            />
            <View style={styles.rangeLabels}>
              <Text style={styles.rangeLabel}>{isoRange[0]}</Text>
              <Text style={styles.rangeLabel}>{isoRange[1]}</Text>
            </View>
          </View>
          
          {/* Exposure Time Control */}
          <View style={styles.controlGroup}>
            <View style={styles.controlHeader}>
              <Text style={styles.controlLabel}>Exposure Time</Text>
              <Text style={styles.controlValue}>{exposureTimeMs.toFixed(3)} ms</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={exposureRange[0]}
              maximumValue={Math.min(exposureRange[1], 2)}
              value={exposureTimeMs}
              onValueChange={setExposureTimeMs}
              minimumTrackTintColor="#FF9800"
              maximumTrackTintColor="#666"
              thumbTintColor="#FF9800"
              step={0.05}
            />
            <View style={styles.rangeLabels}>
              <Text style={styles.rangeLabel}>{exposureRange[0].toFixed(1)} ms</Text>
              <Text style={styles.rangeLabel}>{Math.min(exposureRange[1], 2).toFixed(1)} ms</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={[styles.button, styles.updateButton]}
            onPress={updateExposure}
            disabled={!cameraState.isConfigured}
          >
            <Text style={styles.buttonText}>Apply Exposure Settings</Text>
          </TouchableOpacity>
        </View>
        
        {/* Capture Stats */}
        {captureStats.frameCount > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Last Capture Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{captureStats.frameCount}</Text>
                <Text style={styles.statLabel}>Frames</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{(captureStats.duration / 1000).toFixed(2)}s</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{captureStats.averageFps.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Avg FPS</Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Main Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎬 Capture Controls</Text>
          
          {!cameraState.isConfigured && (
            <TouchableOpacity
              style={[styles.button, styles.configButton]}
              onPress={configureSession}
              disabled={!cameraState.isOpen}
            >
              <Text style={styles.buttonText}>
                Configure {targetFps}fps High-Speed Session
              </Text>
            </TouchableOpacity>
          )}
          
          {cameraState.isConfigured && !cameraState.isCapturing && (
            <TouchableOpacity
              style={[styles.button, styles.startButton]}
              onPress={startCapture}
            >
              <Text style={styles.buttonText}>▶ Start Capture (Circular Buffer)</Text>
            </TouchableOpacity>
          )}
          
          {cameraState.isCapturing && (
            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={stopCapture}
            >
              <Text style={styles.buttonText}>⏹ Stop & Save Buffer</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Technical Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ Technical Information</Text>
          <Text style={styles.infoText}>
            • Uses Android Camera2 API with ConstrainedHighSpeedCaptureSession
          </Text>
          <Text style={styles.infoText}>
            • Captures at {targetFps}fps with manual exposure control
          </Text>
          <Text style={styles.infoText}>
            • Extracts Y-plane (luminance) from YUV420 format
          </Text>
          <Text style={styles.infoText}>
            • Circular buffer stores ~1000 frames (~4 seconds at {targetFps}fps)
          </Text>
          <Text style={styles.infoText}>
            • Saves as raw binary .raw files for offline PIV analysis
          </Text>
          <Text style={styles.infoText}>
            • Recommended: ISO 400-800, Exposure &lt; 1ms for sharp particle images
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#2196F3',
    fontSize: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  statusLabel: {
    color: '#aaa',
    fontSize: 14,
  },
  statusValue: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  statusActive: {
    color: '#4CAF50',
  },
  cameraCard: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  cameraId: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cameraDetail: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 2,
  },
  resolutionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  resButton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resButtonActive: {
    backgroundColor: '#2196F3',
  },
  resButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  controlGroup: {
    marginBottom: 20,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  controlLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  controlValue: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  rangeLabel: {
    color: '#666',
    fontSize: 12,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  configButton: {
    backgroundColor: '#FF9800',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  updateButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    color: '#4CAF50',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#aaa',
    fontSize: 12,
  },
  infoText: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 22,
    marginBottom: 4,
  },
});
