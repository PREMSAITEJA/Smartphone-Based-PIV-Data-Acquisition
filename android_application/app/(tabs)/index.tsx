import { Image } from 'expo-image';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  const router = useRouter();
  
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">PIV Camera</ThemedText>
        <HelloWave />
      </ThemedView>
      
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Particle Image Velocimetry</ThemedText>
        <ThemedText>
          Advanced mobile application for capturing and analyzing fluid flow using particle tracking.
          Optimized for Samsung S25 Ultra high-performance camera.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">🎯 Quick Start</ThemedText>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => router.push('/camera')}
          >
            <ThemedText style={styles.buttonText}>📸 Start PIV Capture</ThemedText>
          </TouchableOpacity>
        </View>
        <ThemedText style={styles.description}>
          Capture sequential image pairs for particle velocity analysis
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">✨ Features</ThemedText>
        <ThemedText>• High-speed image pair capture (50-1000ms intervals)</ThemedText>
        <ThemedText>• Batch capture mode (1-50 pairs)</ThemedText>
        <ThemedText>• Spatial calibration tools</ThemedText>
        <ThemedText>• Image gallery with metadata</ThemedText>
        <ThemedText>• Export-ready data format</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">📊 Recommended Settings</ThemedText>
        <ThemedText>• Time interval (Δt): 100-500ms for most flows</ThemedText>
        <ThemedText>• Resolution: High for best accuracy</ThemedText>
        <ThemedText>• Calibrate using known reference object</ThemedText>
        <ThemedText>• Ensure uniform illumination</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">🔬 PIV Process</ThemedText>
        <ThemedText>1. Calibrate camera with reference object</ThemedText>
        <ThemedText>2. Set up flow with seeding particles</ThemedText>
        <ThemedText>3. Configure capture settings (Δt, pairs)</ThemedText>
        <ThemedText>4. Capture image pairs</ThemedText>
        <ThemedText>5. Export for post-processing</ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  buttonContainer: {
    marginVertical: 12,
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 6,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    opacity: 0.8,
    marginTop: 4,
  },
});
