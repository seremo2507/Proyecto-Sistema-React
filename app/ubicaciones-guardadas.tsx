import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
  BackHandler,
  TextInput,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';

// Types
interface Ubicacion {
  _id: string;
  nombreOrigen: string;
  coordenadasOrigen: [number, number];
  nombreDestino: string;
  coordenadasDestino: [number, number];
}

export default function UbicacionesGuardadasScreen() {
  const navigation = useNavigation();
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [stage, setStage] = useState<0 | 1 | 2>(0); // 0 place origin,1 place dest,2 naming
  const [origin, setOrigin] = useState<{latitude:number;longitude:number} | null>(null);
  const [dest, setDest] = useState<{latitude:number;longitude:number} | null>(null);
  const [name, setName] = useState('');
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

  // Back button handling
  useEffect(() => {
    const backAction = () => {
      if (showMap) {
        if (stage > 0) {
          if (stage === 2) setStage(1);
          else setStage(0);
          return true;
        }
        setShowMap(false);
        return true;
      }
      router.replace('/home');
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => sub.remove();
  }, [showMap, stage]);

  // Save location sequence
  const startSave = () => {
    Animated.timing(progress, { toValue: 100, duration: 2000, useNativeDriver: false }).start(async () => {
      if (origin && dest && name.trim()) {
        const token = await AsyncStorage.getItem('token');
        await fetch('https://api-4g7v.onrender.com/api/ubicaciones/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            nombreOrigen: name.trim(),
            coordenadasOrigen: [origin.latitude, origin.longitude],
            nombreDestino: name.trim(),
            coordenadasDestino: [dest.latitude, dest.longitude],
          }),
        });
        progress.setValue(0);
        setShowMap(false);
        setStage(0);
        setOrigin(null);
        setDest(null);
        setName('');
        fetchUbicaciones();
      }
    });
  };

  // Map region
  const initialRegion: Region = {
    latitude: -17.7833,
    longitude: -63.1821,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  // Header
  const Header = () => (
    <View style={styles.header}>
      <Pressable onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
        <Ionicons name="menu" size={28} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>Mis Ubicaciones</Text>
    </View>
  );

  if (showMap) {
    return (
      <View style={styles.container}>
        <Header />
        <MapView
          style={styles.map}
          initialRegion={initialRegion}
          onPress={e => {
            if (stage === 0) { setOrigin(e.nativeEvent.coordinate); setStage(1); }
            else if (stage === 1) { setDest(e.nativeEvent.coordinate); setStage(2); }
          }}
        >
          {origin && <Marker coordinate={origin} pinColor="green" />}
          {dest && <Marker coordinate={dest} pinColor="red" />}
        </MapView>
        {stage === 2 && (
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Nombre de ruta"
              placeholderTextColor="#aaa"
              style={styles.input}
              value={name}
              onChangeText={setName}
            />
            <Pressable
              style={[styles.fab, { bottom: 80 }]}
              onPress={startSave}
              disabled={!name.trim()}
            >
              <Ionicons name="checkmark" size={24} color="#fff" />
            </Pressable>
          </View>
        )}
        <View style={styles.progressContainer}>
          <Animated.View
            style={[styles.progressBar, { width: progress.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
        </View>
      </View>
    );
  }

  // List view
  return (
    <View style={styles.container}>
      <Header />
      {loading ? (
        <ActivityIndicator style={styles.center} size="large" color="#fff" />
      ) : (
        <FlatList
          data={ubicaciones}
          keyExtractor={item => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#fff']} />}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 80 }}
          renderItem={({ item, index }) => (
            <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: index*100 }}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{item.nombreOrigen} → {item.nombreDestino}</Text>
              </View>
            </MotiView>
          )}
        />
      )}
      <Pressable style={[styles.fab, { backgroundColor: '#0140CD' }]} onPress={() => setShowMap(true)}>
        <Ionicons name="add" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0140CD' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 48, paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginLeft: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { flex: 1 },
  inputContainer: { position: 'absolute', bottom: 20, left: 16, right: 16, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 8, flexDirection: 'row', alignItems: 'center', padding: 8 },
  input: { flex: 1, color: '#000', backgroundColor: '#fff', borderRadius: 4, paddingHorizontal: 8, height: 40 },
  noData: { color: '#fff', fontSize: 16 },
  card: { margin: 16, padding: 16, backgroundColor: '#fff', borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#0140CD' },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  progressContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: '#eee' },
  progressBar: { height: 4, backgroundColor: '#28a745' },
});