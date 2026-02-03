import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import * as FileSystemAPI from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';

const docDir = FileSystemAPI.documentDirectory ?? '';

type FlashMode = 'off' | 'on' | 'auto';

interface CaptureSettings {
  pairInterval: number; // milliseconds between image pairs
  pairCount: number; // number of image pairs to capture
  resolution: 'high' | 'medium' | 'low';
  flashMode: FlashMode;
}

interface ImagePair {
  id: string;
  timestamp: number;
  image1: string;
  image2: string;
  interval: number;
}

export default function PIVCameraScreen() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPairs, setCapturedPairs] = useState<ImagePair[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<CaptureSettings>({
    pairInterval: 100, // 100ms default for PIV
    pairCount: 1,
    resolution: 'high',
    flashMode: 'off' as FlashMode,
  });
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      // Create directory for PIV images
      if (!docDir) return;
      const pivDir = `${docDir}PIV/`;
      const dirInfo = await FileSystemAPI.getInfoAsync(pivDir);
      if (!dirInfo.exists) {
        await FileSystemAPI.makeDirectoryAsync(pivDir, { intermediates: true });
      }
    })();
  }, []);

  const captureImagePairs = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    const pairs: ImagePair[] = [];

    try {
      for (let i = 0; i < settings.pairCount; i++) {
        // Capture first image
        const photo1 = await cameraRef.current.takePictureAsync({
          quality: settings.resolution === 'high' ? 1 : settings.resolution === 'medium' ? 0.7 : 0.5,
          skipProcessing: true, // Faster capture
        });

        // Wait for specified interval
        await new Promise(resolve => setTimeout(resolve, settings.pairInterval));

        // Capture second image
        const photo2 = await cameraRef.current.takePictureAsync({
          quality: settings.resolution === 'high' ? 1 : settings.resolution === 'medium' ? 0.7 : 0.5,
          skipProcessing: true,
        });

        const pairId = `PIV_${Date.now()}_${i}`;
        const timestamp = Date.now();

        // Save images to PIV directory
        if (!docDir) throw new Error('Document directory not available');
        const pivDir = `${docDir}PIV/`;
        const img1Path = `${pivDir}${pairId}_img1.jpg`;
        const img2Path = `${pivDir}${pairId}_img2.jpg`;

        await FileSystemAPI.moveAsync({
          from: photo1.uri,
          to: img1Path,
        });

        await FileSystemAPI.moveAsync({
          from: photo2.uri,
          to: img2Path,
        });

        pairs.push({
          id: pairId,
          timestamp,
          image1: img1Path,
          image2: img2Path,
          interval: settings.pairInterval,
        });

        // Brief pause between pairs if capturing multiple
        if (i < settings.pairCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setCapturedPairs([...capturedPairs, ...pairs]);
      Alert.alert('Success', `Captured ${pairs.length} image pair(s) for PIV analysis`);
    } catch (_error) {
      console.error('Capture error:', _error);
      Alert.alert('Error', 'Failed to capture image pairs');
    } finally {
      setIsCapturing(false);
    }
  };

  const exportMetadata = async () => {
    try {
      const metadata = {
        captureDate: new Date().toISOString(),
        device: 'Samsung S25 Ultra',
        settings: settings,
        imagePairs: capturedPairs.map(pair => ({
          id: pair.id,
          timestamp: new Date(pair.timestamp).toISOString(),
          interval_ms: pair.interval,
          image1: pair.image1.split('/').pop(),
          image2: pair.image2.split('/').pop(),
        })),
      };

      if (!docDir) throw new Error('Document directory not available');
      const metadataPath = `${docDir}PIV/metadata.json`;
      await FileSystemAPI.writeAsStringAsync(metadataPath, JSON.stringify(metadata, null, 2));
      
      Alert.alert('Success', `Metadata saved to ${metadataPath}`);
    } catch (error) {
      console.error('Metadata export error:', error);
      Alert.alert('Error', 'Failed to save metadata');
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>No access to camera</Text>
        <Text style={styles.subText}>Please enable camera permissions in settings</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera Preview */}
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={settings.flashMode === 'on'}
        ref={cameraRef}
      >
        {/* Overlay Grid for Alignment */}
        <View style={styles.gridOverlay}>
          <View style={styles.gridLine} />
          <View style={[styles.gridLine, styles.gridLineVertical]} />
        </View>

        {/* Status Banner */}
        <View style={styles.statusBanner}>
          <Text style={styles.statusText}>PIV Mode - Particle Capture</Text>
          <Text style={styles.statusSubText}>
            {capturedPairs.length} pair(s) captured
          </Text>
        </View>
      </CameraView>

      {/* Controls Panel */}
      <View style={styles.controlsContainer}>
        {!showSettings ? (
          <>
            {/* Main Controls */}
            <View style={styles.mainControls}>
              <TouchableOpacity
                style={[styles.button, styles.settingsButton]}
                onPress={() => setShowSettings(true)}
              >
                <Text style={styles.buttonText}>⚙️ Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.captureButton, isCapturing && styles.capturingButton]}
                onPress={captureImagePairs}
                disabled={isCapturing}
              >
                <Text style={styles.captureButtonText}>
                  {isCapturing ? '📸 Capturing...' : '📸 Capture Pairs'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.exportButton]}
                onPress={exportMetadata}
                disabled={capturedPairs.length === 0}
              >
                <Text style={styles.buttonText}>💾 Export</Text>
              </TouchableOpacity>
            </View>

            {/* Info Display */}
            <View style={styles.infoPanel}>
              <Text style={styles.infoText}>
                Interval: {settings.pairInterval}ms | Pairs: {settings.pairCount} | 
                Resolution: {settings.resolution.toUpperCase()}
              </Text>
            </View>
          </>
        ) : (
          /* Settings Panel */
          <ScrollView style={styles.settingsPanel}>
            <Text style={styles.settingsTitle}>PIV Capture Settings</Text>

            {/* Pair Interval */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Time Between Images (ms):</Text>
              <View style={styles.settingButtons}>
                {[50, 100, 200, 500, 1000].map(val => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.settingOption,
                      settings.pairInterval === val && styles.settingOptionActive,
                    ]}
                    onPress={() => setSettings({ ...settings, pairInterval: val })}
                  >
                    <Text style={styles.settingOptionText}>{val}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Pair Count */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Number of Pairs:</Text>
              <View style={styles.settingButtons}>
                {[1, 5, 10, 20, 50].map(val => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.settingOption,
                      settings.pairCount === val && styles.settingOptionActive,
                    ]}
                    onPress={() => setSettings({ ...settings, pairCount: val })}
                  >
                    <Text style={styles.settingOptionText}>{val}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Resolution */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Resolution:</Text>
              <View style={styles.settingButtons}>
                {(['high', 'medium', 'low'] as const).map(val => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.settingOption,
                      settings.resolution === val && styles.settingOptionActive,
                    ]}
                    onPress={() => setSettings({ ...settings, resolution: val })}
                  >
                    <Text style={styles.settingOptionText}>{val.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Flash Mode */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Flash:</Text>
              <View style={styles.settingButtons}>
                <TouchableOpacity
                  style={[
                    styles.settingOption,
                    settings.flashMode === 'off' && styles.settingOptionActive,
                  ]}
                  onPress={() => setSettings({ ...settings, flashMode: 'off' })}
                >
                  <Text style={styles.settingOptionText}>OFF</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.settingOption,
                    settings.flashMode === 'on' && styles.settingOptionActive,
                  ]}
                  onPress={() => setSettings({ ...settings, flashMode: 'on' })}
                >
                  <Text style={styles.settingOptionText}>ON</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.settingOption,
                    settings.flashMode === 'auto' && styles.settingOptionActive,
                  ]}
                  onPress={() => setSettings({ ...settings, flashMode: 'auto' })}
                >
                  <Text style={styles.settingOptionText}>AUTO</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.doneButton]}
              onPress={() => setShowSettings(false)}
            >
              <Text style={styles.buttonText}>✓ Done</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 10,
  },
  subText: {
    color: '#aaa',
    fontSize: 14,
  },
  gridOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  gridLineVertical: {
    width: 1,
    height: '100%',
  },
  statusBanner: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    alignItems: 'center',
  },
  statusText: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusSubText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
  },
  controlsContainer: {
    backgroundColor: '#1a1a1a',
    padding: 16,
  },
  mainControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  settingsButton: {
    backgroundColor: '#555',
  },
  exportButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  captureButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    flex: 2,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  capturingButton: {
    backgroundColor: '#FF9800',
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoPanel: {
    backgroundColor: '#2a2a2a',
    padding: 10,
    borderRadius: 8,
  },
  infoText: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'center',
  },
  settingsPanel: {
    maxHeight: 300,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
  },
  settingsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  settingRow: {
    marginBottom: 16,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  settingButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  settingOption: {
    backgroundColor: '#444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  settingOptionActive: {
    backgroundColor: '#2196F3',
  },
  settingOptionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#4CAF50',
    marginTop: 8,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
