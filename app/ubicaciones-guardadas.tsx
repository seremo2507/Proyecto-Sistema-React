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
import { MotiView, AnimatePresence } from 'moti';
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

type Stage = 0 | 1 | 2 | 3;

export default function UbicacionesGuardadasScreen() {
  const navigation = useNavigation();
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [stage, setStage] = useState<Stage>(0);
  const [origin, setOrigin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [dest, setDest] = useState<{ latitude: number; longitude: number } | null>(null);
  const [originName, setOriginName] = useState('');
  const [destName, setDestName] = useState('');
  const [showToast, setShowToast] = useState(false);
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
    } catch {
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

  // Back button
  useEffect(() => {
    const backAction = () => {
      if (showMap) {
        if (stage > 0) setStage((prev) => (prev - 1) as Stage);
        else setShowMap(false);
        return true;
      }
      router.replace('/home');
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => sub.remove();
  }, [showMap, stage]);

  // Save location
  const saveUbicacion = async () => {
    Animated.timing(progress, {
      toValue: 100,
      duration: 1200,
      useNativeDriver: false,
    }).start(async () => {
      if (origin && dest && originName && destName) {
        const token = await AsyncStorage.getItem('token');
        await fetch('https://api-4g7v.onrender.com/api/ubicaciones/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            nombreOrigen: originName,
            coordenadasOrigen: [origin.latitude, origin.longitude],
            nombreDestino: destName,
            coordenadasDestino: [dest.latitude, dest.longitude],
            rutaGeoJSON: null,
            segmentos: [],
          }),
        });
        progress.setValue(0);
        setShowMap(false);
        setStage(0);
        setOrigin(null);
        setDest(null);
        setOriginName('');
        setDestName('');
        fetchUbicaciones();
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      }
    });
  };

  const initialRegion: Region = {
    latitude: -17.7833,
    longitude: -63.1821,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  const Header = () => (
    <View style={styles.header}>
      <Pressable onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
        <Ionicons name="menu" size={28} color="#fff" />
      </Pressable>
      <Text style={styles.headerTitle}>Mis Ubicaciones</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header />

      {showMap ? (
        <>
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 500 }}
            style={styles.mapContainer}
          >
            <MapView
              style={styles.map}
              initialRegion={initialRegion}
              onPress={(e) => {
                if (stage === 0) setStage(1), setOrigin(e.nativeEvent.coordinate);
                else if (stage === 2) setStage(3), setDest(e.nativeEvent.coordinate);
              }}
            >
              {origin && <Marker coordinate={origin} pinColor="green" />}
              {dest && <Marker coordinate={dest} pinColor="red" />}
            </MapView>
            {(stage === 0 || stage === 2) && (
              <View style={styles.instructionContainer}>
                <Text style={styles.instruction}>
                  {stage === 0
                    ? 'Selecciona punto de origen'
                    : 'Selecciona punto de destino'}
                </Text>
              </View>
            )}
          </MotiView>

          {stage === 1 && (
            <View style={styles.formContainer}>
              <Text style={styles.label}>Nombre del Origen</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Casa"
                placeholderTextColor="#888"
                value={originName}
                onChangeText={setOriginName}
              />
              <Pressable
                style={[
                  styles.nextBtn,
                  { backgroundColor: originName ? '#28a745' : '#aaa' },
                ]}
                disabled={!originName}
                onPress={() => setStage(2)}
              >
                <Text style={styles.nextText}>Siguiente</Text>
              </Pressable>
            </View>
          )}

          {stage === 3 && (
            <View style={styles.formContainer}>
              <Text style={styles.label}>Nombre del Destino</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Oficina"
                placeholderTextColor="#888"
                value={destName}
                onChangeText={setDestName}
              />
              <Pressable
                style={[
                  styles.nextBtn,
                  { backgroundColor: destName ? '#28a745' : '#aaa' },
                ]}
                disabled={!destName}
                onPress={saveUbicacion}
              >
                <Text style={styles.nextText}>Guardar</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.progressContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                { width: progress.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) },
              ]}
            />
          </View>

          <AnimatePresence>
            {showToast && (
              <MotiView
                from={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'timing', duration: 300 }}
                style={styles.toast}
              >
                <Ionicons name="checkmark-circle" size={40} color="#fff" />
                <Text style={styles.toastText}>¡Guardado!</Text>
              </MotiView>
            )}
          </AnimatePresence>
        </>
      ) : (
        loading ? (
          <ActivityIndicator style={styles.center} size="large" color="#fff" />
        ) : (
          <FlatList
            data={ubicaciones}
            keyExtractor={(item) => item._id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#fff']} />
            }
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 80 }}
            renderItem={({ item, index }) => (
              <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: index * 100 }}
                style={styles.card}
              >
                <Text style={styles.cardTitle}>{item.nombreOrigen} → {item.nombreDestino}</Text>
              </MotiView>
            )}
          />
        )
      )}

      <Pressable style={styles.fab} onPress={() => setShowMap(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0140CD' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 48, paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginLeft: 16 },
  mapContainer: { height: Dimensions.get('window').height * 0.4, margin: 16, borderRadius: 12, overflow: 'hidden' },
  map: { flex: 1 },
  instructionContainer: { position: 'absolute', bottom: 16, left: 0, right: 0, alignItems: 'center' },
  instruction: { backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, fontSize: 14 },
  formContainer: { padding: 20, backgroundColor: '#fff', margin: 16, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 6, elevation: 4 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 10, color: '#333' },
  input: { backgroundColor: '#f0f4f7', borderWidth: 1, borderColor: '#0140CD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16, fontSize: 16, color: '#000' },
  nextBtn: { paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  noData: { color: '#fff', fontSize: 16, textAlign: 'center', marginTop: 40 },
  card: { margin: 16, padding: 16, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#0140CD' },
  fab: { position: 'absolute', right: 24, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#28a745', justifyContent: 'center', alignItems: 'center', elevation: 6 },
  progressContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: '#eee' },
  progressBar: { height: 4, backgroundColor: '#28a745' },
  toast: { position: 'absolute', top: '45%', left: '15%', right: '15%', backgroundColor: '#28a745', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 6 },
  toastText: { color: '#fff', marginLeft: 10, fontSize: 18, fontWeight: '600' },
});
