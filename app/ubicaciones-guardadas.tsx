import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Image,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';

// Types
interface Ubicacion {
  _id: string;
  nombreOrigen: string;
  coordenadasOrigen: [number, number];
}

export default function UbicacionesGuardadasScreen() {
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [marker, setMarker] = useState<{ latitude: number; longitude: number } | null>(null);
  const progress = useRef(new Animated.Value(0)).current;

  // Fetch saved locations
  const fetchUbicaciones = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('https://api-4g7v.onrender.com/api/ubicaciones/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUbicaciones(data || []);
    } catch (err) {
      console.error(err);
      setUbicaciones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUbicaciones(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUbicaciones();
    setRefreshing(false);
  };

  // Save new location
  const startSave = () => {
    Animated.timing(progress, {
      toValue: 100,
      duration: 2000,
      useNativeDriver: false,
    }).start(async () => {
      if (marker) {
        const token = await AsyncStorage.getItem('token');
        await fetch('https://api-4g7v.onrender.com/api/ubicaciones/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            nombreOrigen: 'Ubicación guardada',
            coordenadasOrigen: [marker.latitude, marker.longitude],
          }),
        });
        progress.setValue(0);
        setShowMap(false);
        fetchUbicaciones();
      }
    });
  };

  // Default map region
  const { width, height } = Dimensions.get('window');
  const initialRegion: Region = {
    latitude: -17.7833,
    longitude: -63.1821,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  // Map view for adding address
  if (showMap) {
    return (
      <View style={styles.flex}>
        <MapView
          style={styles.map}
          initialRegion={initialRegion}
          onPress={e => setMarker(e.nativeEvent.coordinate)}
        >
          {marker && (
            <Marker
              coordinate={marker}
              draggable
              onDragEnd={e => setMarker(e.nativeEvent.coordinate)}
            />
          )}
        </MapView>

        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              { width: progress.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) },
            ]}
          />
        </View>

        <Pressable
          style={[styles.fab, { bottom: 30 }]}
          onPress={startSave}
          disabled={!marker}
        >
          <Text style={styles.fabText}>Guardar</Text>
        </Pressable>
      </View>
    );
  }

  // List view of saved addresses
  return (
    <View style={styles.flex}>
      {loading ? (
        <ActivityIndicator style={styles.center} size="large" color="#0140CD" />
      ) : ubicaciones.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.noData}>No tienes ubicaciones guardadas.</Text>
        </View>
      ) : (
        <FlatList
          data={ubicaciones}
          keyExtractor={item => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0140CD']} />
          }
          renderItem={({ item, index }) => (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: index * 100 }}
            >
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{item.nombreOrigen}</Text>
                <Text style={styles.cardSub}>
                  Lat: {item.coordenadasOrigen[0].toFixed(5)}, Lon: {item.coordenadasOrigen[1].toFixed(5)}
                </Text>
              </View>
            </MotiView>
          )}
        />
      )}

      <Pressable style={styles.fab} onPress={() => setShowMap(true)}>
        <Ionicons name="add" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { flex: 1 },
  noData: { color: '#555', fontSize: 16 },
  card: { margin: 16, padding: 16, backgroundColor: '#fff', borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSub: { fontSize: 14, color: '#666', marginTop: 4 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#0140CD', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  fabText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  progressContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: '#eee' },
  progressBar: { height: 4, backgroundColor: '#28a745' },
});
