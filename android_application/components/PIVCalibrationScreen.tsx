import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';

interface CalibrationData {
  pixelsPerMM: number;
  focalLength: number;
  workingDistance: number;
  fieldOfViewWidth: number;
  fieldOfViewHeight: number;
  notes: string;
}

export default function PIVCalibrationScreen() {
  const router = useRouter();
  const [calibration, setCalibration] = useState<CalibrationData>({
    pixelsPerMM: 0,
    focalLength: 0,
    workingDistance: 0,
    fieldOfViewWidth: 0,
    fieldOfViewHeight: 0,
    notes: '',
  });

  const [knownDistance, setKnownDistance] = useState('');
  const [measuredPixels, setMeasuredPixels] = useState('');

  const calculatePixelsPerMM = () => {
    const distance = parseFloat(knownDistance);
    const pixels = parseFloat(measuredPixels);

    if (isNaN(distance) || isNaN(pixels) || distance <= 0 || pixels <= 0) {
      Alert.alert('Error', 'Please enter valid positive numbers');
      return;
    }

    const ratio = pixels / distance;
    setCalibration({ ...calibration, pixelsPerMM: ratio });
    Alert.alert('Success', `Calibration: ${ratio.toFixed(2)} pixels/mm`);
  };

  const saveCalibration = async () => {
    try {
      if (calibration.pixelsPerMM <= 0) {
        Alert.alert('Error', 'Please calibrate pixels per mm first');
        return;
      }

      const calibrationData = {
        ...calibration,
        timestamp: new Date().toISOString(),
        device: 'Samsung S25 Ultra',
      };

      const calibrationPath = `${FileSystem.documentDirectory}PIV/calibration.json`;
      await FileSystem.writeAsStringAsync(calibrationPath, JSON.stringify(calibrationData, null, 2));
      
      Alert.alert('Success', 'Calibration data saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save calibration data');
    }
  };

  const loadCalibration = async () => {
    try {
      const calibrationPath = `${FileSystem.documentDirectory}PIV/calibration.json`;
      const fileInfo = await FileSystem.getInfoAsync(calibrationPath);
      
      if (!fileInfo.exists) {
        Alert.alert('Info', 'No saved calibration found');
        return;
      }

      const data = await FileSystem.readAsStringAsync(calibrationPath);
      const savedCalibration = JSON.parse(data);
      setCalibration(savedCalibration);
      
      Alert.alert('Success', 'Calibration data loaded');
    } catch (error) {
      Alert.alert('Error', 'Failed to load calibration data');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>PIV Calibration</Text>
        
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Spatial Calibration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📏 Spatial Calibration</Text>
          <Text style={styles.sectionDescription}>
            Place a ruler or known reference object in the field of view and measure
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Known Distance (mm):</Text>
            <TextInput
              style={styles.input}
              value={knownDistance}
              onChangeText={setKnownDistance}
              keyboardType="decimal-pad"
              placeholder="e.g., 10"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Measured Distance (pixels):</Text>
            <TextInput
              style={styles.input}
              value={measuredPixels}
              onChangeText={setMeasuredPixels}
              keyboardType="decimal-pad"
              placeholder="e.g., 250"
              placeholderTextColor="#666"
            />
          </View>

          <TouchableOpacity
            style={styles.calculateButton}
            onPress={calculatePixelsPerMM}
          >
            <Text style={styles.buttonText}>Calculate Calibration</Text>
          </TouchableOpacity>

          {calibration.pixelsPerMM > 0 && (
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>
                Calibration: {calibration.pixelsPerMM.toFixed(3)} pixels/mm
              </Text>
              <Text style={styles.resultSubText}>
                1 pixel = {(1 / calibration.pixelsPerMM).toFixed(4)} mm
              </Text>
            </View>
          )}
        </View>

        {/* Camera Parameters */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📷 Camera Parameters</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Focal Length (mm):</Text>
            <TextInput
              style={styles.input}
              value={calibration.focalLength.toString()}
              onChangeText={text => setCalibration({ ...calibration, focalLength: parseFloat(text) || 0 })}
              keyboardType="decimal-pad"
              placeholder="e.g., 24"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Working Distance (mm):</Text>
            <TextInput
              style={styles.input}
              value={calibration.workingDistance.toString()}
              onChangeText={text => setCalibration({ ...calibration, workingDistance: parseFloat(text) || 0 })}
              keyboardType="decimal-pad"
              placeholder="e.g., 300"
              placeholderTextColor="#666"
            />
          </View>
        </View>

        {/* Field of View */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Field of View</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>FOV Width (mm):</Text>
            <TextInput
              style={styles.input}
              value={calibration.fieldOfViewWidth.toString()}
              onChangeText={text => setCalibration({ ...calibration, fieldOfViewWidth: parseFloat(text) || 0 })}
              keyboardType="decimal-pad"
              placeholder="e.g., 50"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>FOV Height (mm):</Text>
            <TextInput
              style={styles.input}
              value={calibration.fieldOfViewHeight.toString()}
              onChangeText={text => setCalibration({ ...calibration, fieldOfViewHeight: parseFloat(text) || 0 })}
              keyboardType="decimal-pad"
              placeholder="e.g., 40"
              placeholderTextColor="#666"
            />
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={calibration.notes}
            onChangeText={text => setCalibration({ ...calibration, notes: text })}
            multiline
            numberOfLines={4}
            placeholder="Add notes about your calibration setup..."
            placeholderTextColor="#666"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={saveCalibration}
          >
            <Text style={styles.buttonText}>💾 Save Calibration</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.loadButton]}
            onPress={loadCalibration}
          >
            <Text style={styles.buttonText}>📂 Load Saved</Text>
          </TouchableOpacity>
        </View>

        {/* PIV Guidelines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 PIV Best Practices</Text>
          <View style={styles.guidelinesList}>
            <Text style={styles.guidelineItem}>
              • Ensure uniform illumination of the measurement plane
            </Text>
            <Text style={styles.guidelineItem}>
              • Use appropriate seeding particles (10-100 μm)
            </Text>
            <Text style={styles.guidelineItem}>
              • Minimize out-of-plane motion
            </Text>
            <Text style={styles.guidelineItem}>
              • Set Δt to capture 5-10 pixel displacement
            </Text>
            <Text style={styles.guidelineItem}>
              • Calibrate with reference object at measurement plane
            </Text>
          </View>
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
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionDescription: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  calculateButton: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  saveButton: {
    backgroundColor: '#2196F3',
  },
  loadButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultBox: {
    backgroundColor: '#1a4d1a',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  resultText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultSubText: {
    color: '#81C784',
    fontSize: 14,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  guidelinesList: {
    marginTop: 8,
  },
  guidelineItem: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
});
