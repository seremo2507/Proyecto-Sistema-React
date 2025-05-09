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
  BackHandler,
  TextInput,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline, Region } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { router } from 'expo-router';

// Decodifica polyline al array de coordenadas
function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  let index = 0, len = encoded.length, lat = 0, lng = 0;
  const coords: { latitude: number; longitude: number }[] = [];
  while (index < len) {
    let b: number, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1 ? ~(result >> 1) : result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1 ? ~(result >> 1) : result >> 1);
    coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return coords;
}

type Segmento = { type: 'LineString'; coordinates: [number, number][] };
interface Ubicacion {
  _id: string;
  id_usuario: number;
  nombreOrigen: string;
  coordenadasOrigen: [number, number];
  nombreDestino: string;
  coordenadasDestino: [number, number];
  segmentos?: Segmento[];
  rutaGeoJSON?: Segmento;
}

export default function UbicacionesGuardadasScreen() {
  const navigation = useNavigation();

  // Estado
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selected, setSelected] = useState<Ubicacion | null>(null);
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [origin, setOrigin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [dest, setDest] = useState<{ latitude: number; longitude: number } | null>(null);
  const [name, setName] = useState('');
  const progress = useRef(new Animated.Value(0)).current;

  // Guarda API key
  useEffect(() => {
    AsyncStorage.setItem('google_maps_api_key', 'AIzaSyA2Qu981XT7unRjMZmA88OqwyMKQlGJsA8');
  }, []);

  // Botón atrás hardware
  useEffect(() => {
    const backAction = () => {
      if (selected) { setSelected(null); return true; }
      if (showMap) { setShowMap(false); setStage(0); return true; }
      router.replace('/home');
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [selected, showMap, stage]);

  const initialRegion: Region = { latitude: -17.7833, longitude: -63.1821, latitudeDelta: 0.01, longitudeDelta: 0.01 };

  // Fetch
  const fetchUbicaciones = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('https://api-4g7v.onrender.com/api/ubicaciones/', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json(); setUbicaciones(data || []);
    } catch { setUbicaciones([]); }
    setLoading(false);
  };
  useEffect(() => { fetchUbicaciones(); }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchUbicaciones(); setRefreshing(false); };

  // Decode ruta
  const fetchRouteCoords = async (orig: any, dst: any) => {
    console.log('fetchRouteCoords called with', orig, dst);
    const apiKey = await AsyncStorage.getItem('google_maps_api_key');
    console.log('Using API Key:', apiKey);
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${orig.latitude},${orig.longitude}&destination=${dst.latitude},${dst.longitude}&key=${apiKey}`;
    console.log('Directions URL:', url);
    const res = await fetch(url);
    const json = await res.json();
    console.log('Directions response:', json);
    return json.routes?.length ? decodePolyline(json.routes[0].overview_polyline.points) : [];
  };

  // Save
  const startSave = () => {
    Animated.timing(progress, { toValue: 100, duration: 2000, useNativeDriver: false }).start(async () => {
      if (origin && dest && name.trim()) {
        const token = await AsyncStorage.getItem('token');
        const userId = Number(await AsyncStorage.getItem('userId'));
        const coords = await fetchRouteCoords(origin, dest);
        const geoCoords = coords.map(c => [c.longitude, c.latitude] as [number, number]);
        const body = { id_usuario: userId, nombreOrigen: name.trim(), coordenadasOrigen: [origin.latitude, origin.longitude], nombreDestino: name.trim(), coordenadasDestino: [dest.latitude, dest.longitude], segmentos: [{ type: 'LineString', coordinates: geoCoords }],
          rutaGeoJSON: { type: 'LineString', coordinates: geoCoords } };
        await fetch('https://api-4g7v.onrender.com/api/ubicaciones/', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
        progress.setValue(0); setShowMap(false); setStage(0); setOrigin(null); setDest(null); setName(''); fetchUbicaciones();
      }
    });
  };

  // Header
  const Header = () => (
    <View style={styles.header}>
      <Pressable onPress={() => navigation.dispatch(DrawerActions.openDrawer())}><Ionicons name="menu" size={28} color="#fff"/></Pressable>
      <Text style={styles.headerTitle}>Mis Ubicaciones</Text>
    </View>
  );

  // Detail
  if (selected) {
        const rawCoords: [number, number][] = selected.segmentos && selected.segmentos.length > 0
      ? selected.segmentos[0].coordinates
      : selected.rutaGeoJSON
      ? selected.rutaGeoJSON.coordinates
      : [];
    const seg = rawCoords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
    return (
      <View style={styles.container}>
        <Header />
        <Pressable onPress={() => setSelected(null)} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color="#fff"/></Pressable>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={seg?.[0] ? { ...seg[0], latitudeDelta: 0.01, longitudeDelta: 0.01 } : initialRegion}>
          <Marker coordinate={{ latitude: selected.coordenadasOrigen[0], longitude: selected.coordenadasOrigen[1] }}/>
          <Marker coordinate={{ latitude: selected.coordenadasDestino[0], longitude: selected.coordenadasDestino[1] }}/>
          {seg && <Polyline coordinates={seg} strokeWidth={4} strokeColor="#0077b6" />}
        </MapView>
      </View>
    );
  }

  // Create
  if (showMap) {
    return (
      <View style={styles.container}>
        <Header />
        <MapView style={styles.map} initialRegion={initialRegion} onPress={e => { if(stage===0){setOrigin(e.nativeEvent.coordinate);setStage(1);}else if(stage===1){setDest(e.nativeEvent.coordinate);setStage(2);} }}>
          {origin&&<Marker coordinate={origin} pinColor="green"/>}
          {dest&&<Marker coordinate={dest} pinColor="red"/>}
        </MapView>
        {stage===2&&(
          <View style={styles.inputContainer}><TextInput placeholder="Nombre de ruta" placeholderTextColor="#aaa" style={styles.input} value={name} onChangeText={setName}/><Pressable style={[styles.fab,{bottom:80}]} onPress={startSave} disabled={!name.trim()}><Ionicons name="checkmark" size={24} color="#fff"/></Pressable></View>
        )}
        <View style={styles.progressContainer}><Animated.View style={[styles.progressBar,{width:progress.interpolate({inputRange:[0,100],outputRange:['0%','100%']})}]} /></View>
      </View>
    );
  }

  // List
  return (
    <View style={styles.container}>
      <Header />
      {loading?
        <ActivityIndicator style={styles.center} size="large" color="#fff" />:
        <FlatList data={ubicaciones} keyExtractor={item=>item._id} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#fff']}/>} contentContainerStyle={{paddingTop:8,paddingBottom:80}} renderItem={({item,index})=>(<MotiView from={{opacity:0,translateY:10}} animate={{opacity:1,translateY:0}} transition={{delay:index*100}}><Pressable onPress={()=>setSelected(item)}><View style={styles.card}><Text style={styles.cardTitle}>{item.nombreOrigen} → {item.nombreDestino}</Text></View></Pressable></MotiView>)} />
      }
      <Pressable style={[styles.fab,{backgroundColor:'#0140CD'}]} onPress={()=>setShowMap(true)}><Ionicons name="add" size={24} color="#fff"/></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0140CD' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 48, paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginLeft: 16 },
  backBtn: { position: 'absolute', top: 56, left: 16, zIndex: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { flex: 1 },
  inputContainer: { position: 'absolute', bottom: 20, left: 16, right: 16, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 8, flexDirection: 'row', alignItems: 'center', padding: 8 },
  input: { flex: 1, color: '#000', backgroundColor: '#fff', borderRadius: 4, paddingHorizontal: 8, height: 40 },
  card: { margin: 16, padding: 16, backgroundColor: '#fff', borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#0140CD' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  progressContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: '#eee' },
  progressBar: { height: 4, backgroundColor: '#28a745' }
});
