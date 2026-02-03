import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Canvas, Path, Circle, Line, Skia } from '@shopify/react-native-skia';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH - 32;
const PREVIEW_HEIGHT = PREVIEW_WIDTH * 0.75;

interface Vector {
  x: number;
  y: number;
  u: number;
  v: number;
  magnitude: number;
}

export default function RealTimePIVVisualization() {
  const router = useRouter();
  const [isActive, setIsActive] = useState(false);
  const [vectors, setVectors] = useState<Vector[]>([]);
  const [fps, setFps] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);
  
  // Grid configuration
  const [gridSize, setGridSize] = useState(64); // 64x64 interrogation windows
  const [skipFrames, setSkipFrames] = useState(24); // Process every 24th frame for ~10Hz at 240fps
  
  const frameCountRef = useRef(0);
  const lastProcessTimeRef = useRef(Date.now());
  
  useEffect(() => {
    if (isActive) {
      startRealTimeProcessing();
    }
    
    return () => {
      stopRealTimeProcessing();
    };
  }, [isActive]);
  
  const startRealTimeProcessing = () => {
    // In a real implementation, this would:
    // 1. Subscribe to camera frame callbacks
    // 2. Skip frames to achieve ~10Hz processing
    // 3. Extract consecutive frames (T and T+1)
    // 4. Compute PIV on coarse grid (64x64 windows)
    // 5. Update vector overlay
    
    Alert.alert(
      'Real-Time Processing',
      'This component demonstrates the real-time PIV visualization architecture.\n\n' +
      'In production:\n' +
      '• Processes at ~10Hz while capturing at 240fps\n' +
      '• Uses 64x64 pixel interrogation windows\n' +
      '• Computes vectors via OpenCV DCC or FFT\n' +
      '• Overlays arrows on live preview'
    );
    
    // Simulate processing with demo data
    simulateVectorField();
  };
  
  const stopRealTimeProcessing = () => {
    setVectors([]);
  };
  
  const simulateVectorField = () => {
    // Generate demo vector field for visualization
    const cols = Math.floor(PREVIEW_WIDTH / gridSize);
    const rows = Math.floor(PREVIEW_HEIGHT / gridSize);
    const newVectors: Vector[] = [];
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * gridSize + gridSize / 2;
        const y = row * gridSize + gridSize / 2;
        
        // Simulate flow pattern (vortex)
        const centerX = PREVIEW_WIDTH / 2;
        const centerY = PREVIEW_HEIGHT / 2;
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const u = -dy / distance * 20;
        const v = dx / distance * 20;
        const magnitude = Math.sqrt(u * u + v * v);
        
        newVectors.push({ x, y, u, v, magnitude });
      }
    }
    
    setVectors(newVectors);
    setProcessingTime(8.5); // Simulated processing time
    setFps(10); // Target visualization rate
  };
  
  const renderVectorField = () => {
    const paint = Skia.Paint();
    paint.setStyle(1); // Stroke
    paint.setStrokeWidth(2);
    
    return vectors.map((vector, index) => {
      // Color based on magnitude
      const normalizedMag = Math.min(vector.magnitude / 30, 1);
      const hue = (1 - normalizedMag) * 120; // Green to red
      paint.setColor(Skia.Color(`hsl(${hue}, 100%, 50%)`));
      
      // Calculate arrow end point
      const scale = 2; // Scale factor for visibility
      const endX = vector.x + vector.u * scale;
      const endY = vector.y + vector.v * scale;
      
      // Arrow head
      const angle = Math.atan2(vector.v, vector.u);
      const arrowSize = 5;
      const arrowAngle = Math.PI / 6;
      
      const arrowX1 = endX - arrowSize * Math.cos(angle - arrowAngle);
      const arrowY1 = endY - arrowSize * Math.sin(angle - arrowAngle);
      const arrowX2 = endX - arrowSize * Math.cos(angle + arrowAngle);
      const arrowY2 = endY - arrowSize * Math.sin(angle + arrowAngle);
      
      return (
        <React.Fragment key={index}>
          {/* Vector line */}
          <Line
            p1={{ x: vector.x, y: vector.y }}
            p2={{ x: endX, y: endY }}
            color={`hsl(${hue}, 100%, 50%)`}
            style="stroke"
            strokeWidth={2}
          />
          
          {/* Arrow head */}
          <Path
            path={`M ${endX} ${endY} L ${arrowX1} ${arrowY1} L ${arrowX2} ${arrowY2} Z`}
            color={`hsl(${hue}, 100%, 50%)`}
            style="fill"
          />
        </React.Fragment>
      );
    });
  };
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Real-Time PIV</Text>
        <View style={{ width: 60 }} />
      </View>
      
      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Display Rate</Text>
          <Text style={styles.statValue}>{fps} Hz</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Grid Size</Text>
          <Text style={styles.statValue}>{gridSize}px</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Process Time</Text>
          <Text style={styles.statValue}>{processingTime.toFixed(1)}ms</Text>
        </View>
      </View>
      
      {/* Preview with Vector Overlay */}
      <View style={styles.previewContainer}>
        <View style={styles.previewPlaceholder}>
          <Text style={styles.placeholderText}>Camera Preview (240fps)</Text>
          <Text style={styles.placeholderSubtext}>
            Live camera feed would appear here
          </Text>
        </View>
        
        {/* Vector Field Overlay */}
        {isActive && vectors.length > 0 && (
          <Canvas style={styles.vectorOverlay}>
            {renderVectorField()}
          </Canvas>
        )}
        
        {/* Grid Overlay */}
        {isActive && (
          <View style={styles.gridOverlay}>
            {Array.from({ length: Math.ceil(PREVIEW_HEIGHT / gridSize) }).map((_, row) => (
              <View
                key={`h-${row}`}
                style={[styles.gridLine, { top: row * gridSize }]}
              />
            ))}
            {Array.from({ length: Math.ceil(PREVIEW_WIDTH / gridSize) }).map((_, col) => (
              <View
                key={`v-${col}`}
                style={[styles.gridLineVertical, { left: col * gridSize }]}
              />
            ))}
          </View>
        )}
      </View>
      
      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Grid Configuration</Text>
          <View style={styles.gridButtons}>
            <TouchableOpacity
              style={[styles.gridButton, gridSize === 32 && styles.gridButtonActive]}
              onPress={() => setGridSize(32)}
            >
              <Text style={styles.gridButtonText}>32px</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.gridButton, gridSize === 64 && styles.gridButtonActive]}
              onPress={() => setGridSize(64)}
            >
              <Text style={styles.gridButtonText}>64px</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.gridButton, gridSize === 128 && styles.gridButtonActive]}
              onPress={() => setGridSize(128)}
            >
              <Text style={styles.gridButtonText}>128px</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.toggleButton, isActive && styles.toggleButtonActive]}
          onPress={() => setIsActive(!isActive)}
        >
          <Text style={styles.toggleButtonText}>
            {isActive ? '⏸ Stop Visualization' : '▶ Start Visualization'}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Processing Strategy</Text>
          <Text style={styles.infoText}>
            • Capture: 240fps continuous{'\n'}
            • Display: ~10Hz (every {skipFrames}th frame){'\n'}
            • Coarse PIV: {gridSize}×{gridSize}px windows{'\n'}
            • Method: Normalized Cross-Correlation (DCC){'\n'}
            • Overlay: Vector arrows on live preview
          </Text>
        </View>
      </View>
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
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#666',
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewContainer: {
    margin: 16,
    height: PREVIEW_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  previewPlaceholder: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  placeholderSubtext: {
    color: '#555',
    fontSize: 12,
    marginTop: 8,
  },
  vectorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    pointerEvents: 'none',
  },
  gridLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  gridLineVertical: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  controls: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  gridButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  gridButton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  gridButtonActive: {
    backgroundColor: '#2196F3',
  },
  gridButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleButtonActive: {
    backgroundColor: '#f44336',
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 22,
  },
});
