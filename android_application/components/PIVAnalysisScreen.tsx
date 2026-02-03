import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';

interface ProcessingResult {
  originsX: number[];
  originsY: number[];
  vectorsX: number[];
  vectorsY: number[];
  statistics: {
    totalVectors: number;
    validVectors: number;
    meanX: number;
    meanY: number;
    stdX: number;
    stdY: number;
    maxVelocity: number;
    avgVelocity: number;
    pixelsPerMM: number;
    maxVelocityMM: number;
    avgVelocityMM: number;
  };
}

interface ServerConfig {
  host: string;
  port: number;
}

export default function PIVAnalysisScreen() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult | null>(null);
  const [serverConfig, setServerConfig] = useState<ServerConfig>({
    host: 'localhost',
    port: 3000,
  });
  const [showConfig, setShowConfig] = useState(false);
  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const [allPairs, setAllPairs] = useState<string[]>([]);

  React.useEffect(() => {
    loadCapturedPairs();
  }, []);

  const loadCapturedPairs = async () => {
    try {
      const pivDir = `${FileSystem.documentDirectory}PIV/`;
      const files = await FileSystem.readDirectoryAsync(pivDir);
      
      // Extract unique pair IDs
      const pairIds = new Set<string>();
      files.forEach(file => {
        const match = file.match(/PIV_\d+_\d+/);
        if (match) {
          pairIds.add(match[0]);
        }
      });

      setAllPairs(Array.from(pairIds));
    } catch (error) {
      console.error('Error loading pairs:', error);
    }
  };

  const getServerUrl = () => {
    return `http://${serverConfig.host}:${serverConfig.port}`;
  };

  const uploadAndProcess = async (pairId: string) => {
    try {
      setIsProcessing(true);
      setSelectedPair(pairId);

      const pivDir = `${FileSystem.documentDirectory}PIV/`;
      const img1Path = `${pivDir}${pairId}_img1.jpg`;
      const img2Path = `${pivDir}${pairId}_img2.jpg`;

      // Check if files exist
      const img1Info = await FileSystem.getInfoAsync(img1Path);
      const img2Info = await FileSystem.getInfoAsync(img2Path);

      if (!img1Info.exists || !img2Info.exists) {
        Alert.alert('Error', 'Image files not found');
        setIsProcessing(false);
        return;
      }

      // Read calibration data if available
      let calibration = null;
      try {
        const calibrationPath = `${pivDir}calibration.json`;
        const calibrationInfo = await FileSystem.getInfoAsync(calibrationPath);
        if (calibrationInfo.exists) {
          const calibrationData = await FileSystem.readAsStringAsync(calibrationPath);
          calibration = JSON.parse(calibrationData);
        }
      } catch (e) {
        console.log('No calibration data found');
      }

      // Read image files as base64
      const img1Base64 = await FileSystem.readAsStringAsync(img1Path, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const img2Base64 = await FileSystem.readAsStringAsync(img2Path, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create form data
      const formData = new FormData();
      formData.append('image1', {
        uri: img1Path,
        name: `${pairId}_img1.jpg`,
        type: 'image/jpeg',
      } as any);
      formData.append('image2', {
        uri: img2Path,
        name: `${pairId}_img2.jpg`,
        type: 'image/jpeg',
      } as any);

      if (calibration) {
        formData.append('calibration', JSON.stringify(calibration));
      }

      // Send to server
      console.log(`Uploading to ${getServerUrl()}/process`);
      const response = await fetch(`${getServerUrl()}/process`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setResults(result);

      // Save results
      const resultsPath = `${pivDir}${pairId}_results.json`;
      await FileSystem.writeAsStringAsync(resultsPath, JSON.stringify(result, null, 2));

      Alert.alert(
        'Success',
        `Processed ${result.statistics.validVectors} velocity vectors\n` +
        `Avg Velocity: ${result.statistics.avgVelocity.toFixed(2)} pixels/frame\n` +
        `Max Velocity: ${result.statistics.maxVelocity.toFixed(2)} pixels/frame`
      );
    } catch (error) {
      console.error('Processing error:', error);
      Alert.alert('Processing Error', `${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>PIV Analysis</Text>
        
        <TouchableOpacity
          style={styles.configButton}
          onPress={() => setShowConfig(!showConfig)}
        >
          <Text style={styles.configButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {showConfig && (
        <View style={styles.configPanel}>
          <Text style={styles.configLabel}>Server: {serverConfig.host}:{serverConfig.port}</Text>
          <TouchableOpacity
            style={styles.testButton}
            onPress={async () => {
              try {
                const response = await fetch(`${getServerUrl()}/health`);
                if (response.ok) {
                  Alert.alert('Success', 'Server is reachable!');
                } else {
                  Alert.alert('Error', 'Server returned an error');
                }
              } catch (error) {
                Alert.alert('Error', `Cannot reach server: ${error}`);
              }
            }}
          >
            <Text style={styles.buttonText}>Test Connection</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {!results ? (
          <>
            <Text style={styles.instructionTitle}>📊 Available Image Pairs</Text>
            {allPairs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No image pairs found</Text>
                <Text style={styles.emptySubText}>
                  Go to PIV Camera to capture image pairs first
                </Text>
              </View>
            ) : (
              <>
                {allPairs.map(pairId => (
                  <TouchableOpacity
                    key={pairId}
                    style={[
                      styles.pairButton,
                      selectedPair === pairId && styles.pairButtonSelected,
                      isProcessing && selectedPair === pairId && styles.pairButtonProcessing,
                    ]}
                    onPress={() => uploadAndProcess(pairId)}
                    disabled={isProcessing}
                  >
                    {isProcessing && selectedPair === pairId ? (
                      <>
                        <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                        <Text style={styles.pairButtonText}>Processing...</Text>
                      </>
                    ) : (
                      <Text style={styles.pairButtonText}>📸 {pairId}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        ) : (
          <>
            <Text style={styles.resultTitle}>✓ Analysis Results</Text>
            
            <View style={styles.statsCard}>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Total Vectors:</Text>
                <Text style={styles.statsValue}>{results.statistics.totalVectors}</Text>
              </View>
              
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Valid Vectors:</Text>
                <Text style={styles.statsValue}>{results.statistics.validVectors}</Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Avg Velocity:</Text>
                <Text style={styles.statsValue}>
                  {results.statistics.avgVelocity.toFixed(2)} px/frame
                </Text>
              </View>
              
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Max Velocity:</Text>
                <Text style={styles.statsValue}>
                  {results.statistics.maxVelocity.toFixed(2)} px/frame
                </Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Mean Displacement X:</Text>
                <Text style={styles.statsValue}>{results.statistics.meanX.toFixed(2)} px</Text>
              </View>
              
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Mean Displacement Y:</Text>
                <Text style={styles.statsValue}>{results.statistics.meanY.toFixed(2)} px</Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Std Dev X:</Text>
                <Text style={styles.statsValue}>{results.statistics.stdX.toFixed(2)}</Text>
              </View>
              
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Std Dev Y:</Text>
                <Text style={styles.statsValue}>{results.statistics.stdY.toFixed(2)}</Text>
              </View>

              {results.statistics.pixelsPerMM > 0 && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.statsRow}>
                    <Text style={styles.statsLabel}>Avg Velocity (mm/frame):</Text>
                    <Text style={styles.statsValue}>
                      {(results.statistics.avgVelocity / results.statistics.pixelsPerMM).toFixed(4)} mm
                    </Text>
                  </View>
                  
                  <View style={styles.statsRow}>
                    <Text style={styles.statsLabel}>Max Velocity (mm/frame):</Text>
                    <Text style={styles.statsValue}>
                      {(results.statistics.maxVelocity / results.statistics.pixelsPerMM).toFixed(4)} mm
                    </Text>
                  </View>
                </>
              )}
            </View>

            <TouchableOpacity
              style={styles.analyzeButton}
              onPress={() => setResults(null)}
            >
              <Text style={styles.buttonText}>← Back to Pairs</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>💡 How It Works</Text>
          <Text style={styles.infoText}>
            1. Select an image pair to analyze{'\n'}
            2. Images are uploaded to the processing server{'\n'}
            3. Phase correlation calculates particle displacement{'\n'}
            4. Results show velocity field statistics{'\n'}
            5. Calibration data is used for real-world measurements
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#2a2a2a',
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
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  configButton: {
    padding: 8,
  },
  configButtonText: {
    fontSize: 18,
  },
  configPanel: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  configLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 12,
  },
  testButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  instructionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  resultTitle: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  emptySubText: {
    color: '#aaa',
    fontSize: 14,
  },
  pairButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pairButtonSelected: {
    backgroundColor: '#1976D2',
  },
  pairButtonProcessing: {
    backgroundColor: '#FF9800',
    opacity: 0.8,
  },
  pairButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'center',
  },
  statsLabel: {
    color: '#aaa',
    fontSize: 14,
  },
  statsValue: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 8,
  },
  analyzeButton: {
    backgroundColor: '#2196F3',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 22,
  },
});
