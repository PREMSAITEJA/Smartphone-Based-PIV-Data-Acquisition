import { useRouter } from 'expo-router';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

import { Collapsible } from '@/components/ui/collapsible';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';

export default function TabTwoScreen() {
  const router = useRouter();
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}>
          PIV Tools
        </ThemedText>
      </ThemedView>
      
      <ThemedText>Access all PIV measurement and calibration tools</ThemedText>

      {/* Advanced 240fps Camera */}
      <View style={styles.toolSection}>
        <TouchableOpacity
          style={[styles.toolButton, styles.advancedCameraButton]}
          onPress={() => router.push('/advanced-camera')}
        >
          <Text style={styles.toolIcon}>🎥</Text>
          <Text style={styles.toolTitle}>240fps High-Speed Camera</Text>
          <Text style={styles.toolDescription}>Advanced Camera2 API • Manual Controls</Text>
        </TouchableOpacity>
      </View>

      {/* Real-Time PIV */}
      <View style={styles.toolSection}>
        <TouchableOpacity
          style={[styles.toolButton, styles.realtimeButton]}
          onPress={() => router.push('/realtime-piv')}
        >
          <Text style={styles.toolIcon}>⚡</Text>
          <Text style={styles.toolTitle}>Real-Time PIV Visualization</Text>
          <Text style={styles.toolDescription}>Live vector field overlay @ 10Hz</Text>
        </TouchableOpacity>
      </View>

      {/* PIV Camera (Basic) */}
      <View style={styles.toolSection}>
        <TouchableOpacity
          style={[styles.toolButton, styles.cameraButton]}
          onPress={() => router.push('/camera')}
        >
          <Text style={styles.toolIcon}>📸</Text>
          <Text style={styles.toolTitle}>PIV Camera (Basic)</Text>
          <Text style={styles.toolDescription}>Standard capture mode</Text>
        </TouchableOpacity>
      </View>

      {/* Gallery */}
      <View style={styles.toolSection}>
        <TouchableOpacity
          style={[styles.toolButton, styles.galleryButton]}
          onPress={() => router.push('/gallery')}
        >
          <Text style={styles.toolIcon}>🖼️</Text>
          <Text style={styles.toolTitle}>Image Gallery</Text>
          <Text style={styles.toolDescription}>View and manage captured pairs</Text>
        </TouchableOpacity>
      </View>

      {/* Calibration */}
      <View style={styles.toolSection}>
        <TouchableOpacity
          style={[styles.toolButton, styles.calibrationButton]}
          onPress={() => router.push('/calibration')}
        >
          <Text style={styles.toolIcon}>📏</Text>
          <Text style={styles.toolTitle}>Calibration</Text>
          <Text style={styles.toolDescription}>Spatial and camera calibration</Text>
        </TouchableOpacity>
      </View>

      {/* Analysis */}
      <View style={styles.toolSection}>
        <TouchableOpacity
          style={[styles.toolButton, styles.analysisButton]}
          onPress={() => router.push('/analysis')}
        >
          <Text style={styles.toolIcon}>📊</Text>
          <Text style={styles.toolTitle}>Analysis</Text>
          <Text style={styles.toolDescription}>Process and analyze velocity fields</Text>
        </TouchableOpacity>
      </View>

      <Collapsible title="About PIV">
        <ThemedText>
          Particle Image Velocimetry (PIV) is an optical method used to visualize and measure 
          fluid flow patterns by tracking seeding particles.
        </ThemedText>
        <ThemedText style={{ marginTop: 8 }}>
          This app captures sequential image pairs that can be processed to determine velocity fields.
        </ThemedText>
      </Collapsible>

      <Collapsible title="Image Capture Guidelines">
        <ThemedText>
          • Use appropriate seeding particles (10-100 μm diameter)
        </ThemedText>
        <ThemedText>
          • Ensure uniform illumination of the measurement plane
        </ThemedText>
        <ThemedText>
          • Set time interval (Δt) for 5-10 pixel displacement
        </ThemedText>
        <ThemedText>
          • Minimize out-of-plane motion
        </ThemedText>
        <ThemedText>
          • Calibrate with reference object at flow plane
        </ThemedText>
      </Collapsible>

      <Collapsible title="Data Export">
        <ThemedText>
          Captured image pairs are stored in the PIV directory with metadata including:
        </ThemedText>
        <ThemedText>
          • Timestamp and capture settings
        </ThemedText>
        <ThemedText>
          • Time interval between images
        </ThemedText>
        <ThemedText>
          • Calibration data (if available)
        </ThemedText>
        <ThemedText style={{ marginTop: 8 }}>
          Export metadata for use with PIV processing software like PIVlab or OpenPIV.
        </ThemedText>
      </Collapsible>

      <Collapsible title="Samsung S25 Ultra Optimization">
        <ThemedText>
          This app is optimized for Samsung S25 Ultra&apos;s advanced camera system:
        </ThemedText>
        <ThemedText>
          • High-resolution sensor for detailed particle tracking
        </ThemedText>
        <ThemedText>
          • Fast capture rates for precise time intervals
        </ThemedText>
        <ThemedText>
          • Excellent low-light performance
        </ThemedText>
        <ThemedText>
          • Manual controls for exposure and focus
        </ThemedText>
      </Collapsible>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  toolSection: {
    marginVertical: 8,
  },
  toolButton: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 4,
  },
  cameraButton: {
    backgroundColor: '#2196F3',
  },
  advancedCameraButton: {
    backgroundColor: '#E91E63',
  },
  realtimeButton: {
    backgroundColor: '#FF5722',
  },
  galleryButton: {
    backgroundColor: '#4CAF50',
  },
  calibrationButton: {
    backgroundColor: '#FF9800',
  },
  analysisButton: {
    backgroundColor: '#9C27B0',
  },
  toolIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  toolTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  toolDescription: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
});
