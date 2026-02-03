import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';

interface ImagePair {
  id: string;
  timestamp: number;
  image1: string;
  image2: string;
}

export default function PIVGalleryScreen() {
  const router = useRouter();
  const [imagePairs, setImagePairs] = useState<ImagePair[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadImagePairs();
  }, []);

  const loadImagePairs = async () => {
    try {
      const pivDir = `${FileSystem.documentDirectory}PIV/`;
      const dirInfo = await FileSystem.getInfoAsync(pivDir);
      
      if (!dirInfo.exists) {
        setLoading(false);
        return;
      }

      const files = await FileSystem.readDirectoryAsync(pivDir);
      
      // Group files into pairs
      const pairs: ImagePair[] = [];
      const pairMap = new Map<string, { img1?: string; img2?: string }>();

      files.forEach(file => {
        if (file.endsWith('.jpg')) {
          const match = file.match(/PIV_(\d+)_(\d+)_img([12])\.jpg/);
          if (match) {
            const pairId = `PIV_${match[1]}_${match[2]}`;
            const imgNum = match[3];
            
            if (!pairMap.has(pairId)) {
              pairMap.set(pairId, {});
            }
            
            const pairData = pairMap.get(pairId)!;
            if (imgNum === '1') {
              pairData.img1 = `${pivDir}${file}`;
            } else {
              pairData.img2 = `${pivDir}${file}`;
            }
          }
        }
      });

      // Convert to array
      pairMap.forEach((data, id) => {
        if (data.img1 && data.img2) {
          const timestamp = parseInt(id.split('_')[1]);
          pairs.push({
            id,
            timestamp,
            image1: data.img1,
            image2: data.img2,
          });
        }
      });

      // Sort by timestamp (newest first)
      pairs.sort((a, b) => b.timestamp - a.timestamp);
      setImagePairs(pairs);
    } catch (error) {
      console.error('Error loading image pairs:', error);
      Alert.alert('Error', 'Failed to load image gallery');
    } finally {
      setLoading(false);
    }
  };

  const deletePair = async (pair: ImagePair) => {
    Alert.alert(
      'Delete Pair',
      'Are you sure you want to delete this image pair?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await FileSystem.deleteAsync(pair.image1);
              await FileSystem.deleteAsync(pair.image2);
              setImagePairs(imagePairs.filter(p => p.id !== pair.id));
              Alert.alert('Success', 'Image pair deleted');
            } catch (error) {
              console.error('Error deleting image pair:', error);
              Alert.alert('Error', 'Failed to delete image pair');
            }
          },
        },
      ]
    );
  };

  const clearAll = async () => {
    Alert.alert(
      'Clear All',
      'Are you sure you want to delete all captured image pairs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              const pivDir = `${FileSystem.documentDirectory}PIV/`;
              await FileSystem.deleteAsync(pivDir, { idempotent: true });
              await FileSystem.makeDirectoryAsync(pivDir, { intermediates: true });
              setImagePairs([]);
              Alert.alert('Success', 'All image pairs deleted');
            } catch {
              Alert.alert('Error', 'Failed to clear gallery');
            }
          },
        },
      ]
    );
  };

  const renderPair = ({ item }: { item: ImagePair }) => {
    const date = new Date(item.timestamp);
    return (
      <View style={styles.pairContainer}>
        <View style={styles.pairHeader}>
          <Text style={styles.pairId}>{item.id}</Text>
          <Text style={styles.pairDate}>
            {date.toLocaleDateString()} {date.toLocaleTimeString()}
          </Text>
        </View>
        
        <View style={styles.imagesRow}>
          <View style={styles.imageContainer}>
            <Text style={styles.imageLabel}>Image 1</Text>
            <Image source={{ uri: item.image1 }} style={styles.thumbnail} />
          </View>
          
          <View style={styles.imageContainer}>
            <Text style={styles.imageLabel}>Image 2</Text>
            <Image source={{ uri: item.image2 }} style={styles.thumbnail} />
          </View>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deletePair(item)}
        >
          <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading gallery...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>PIV Image Gallery</Text>
        
        {imagePairs.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {imagePairs.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No image pairs captured yet</Text>
          <Text style={styles.emptySubText}>
            Use the PIV Camera to capture particle images
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.statsBar}>
            <Text style={styles.statsText}>
              Total Pairs: {imagePairs.length}
            </Text>
          </View>
          
          <FlatList
            data={imagePairs}
            renderItem={renderPair}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: '#f44336',
    fontSize: 14,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 8,
  },
  emptySubText: {
    color: '#aaa',
    fontSize: 14,
  },
  statsBar: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  statsText: {
    color: '#4CAF50',
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  pairContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  pairHeader: {
    marginBottom: 12,
  },
  pairId: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  pairDate: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 4,
  },
  imagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  imageContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  imageLabel: {
    color: '#4CAF50',
    fontSize: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  thumbnail: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
