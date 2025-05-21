import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Animated,
  BackHandler,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline, Region } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import tw from 'twrnc';

// Decodifica polyline al array de coordenadas
function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  if (!encoded || encoded.length === 0) return [];
  
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
  const params = useLocalSearchParams();
  const mapViewRef = useRef<MapView | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);

  // Estado
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selected, setSelected] = useState<Ubicacion | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [origin, setOrigin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [dest, setDest] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nombreOrigen, setNombreOrigen] = useState('');
  const [nombreDestino, setNombreDestino] = useState('');
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const progress = useRef(new Animated.Value(0)).current;

  // Guarda API key
  useEffect(() => {
    AsyncStorage.setItem('google_maps_api_key', 'AIzaSyA2Qu981XT7unRjMZmA88OqwyMKQlGJsA8');
  }, []);

  // Detectar si estamos en modo edición por URL
  useEffect(() => {
    if (params.id) {
      const id = String(params.id);
      setCurrentId(id);
      fetchUbicacionDetalle(id);
      setEditMode(true);
      setShowMap(true);
    }
  }, [params]);

  // Reset all map related states
  const resetMapStates = () => {
    setOrigin(null);
    setDest(null);
    setRouteCoords([]);
    setStage(0);
    setLoadingRoute(false);
    setNombreOrigen('');
    setNombreDestino('');
    setShowCoordinates(false);
    setEditMode(false);
    setCurrentId(null);
    setSuccessMessage('');
    // Reset MapView reference if needed
    if (mapViewRef.current) {
      mapViewRef.current = null;
    }
  };

  // Botón atrás hardware
  useEffect(() => {
    const backAction = () => {
      if (selected) { 
        setSelected(null); 
        return true; 
      }
      if (showMap) { 
        setShowMap(false); 
        resetMapStates();
        return true; 
      }
      router.replace('/home');
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [selected, showMap, stage]);

  const initialRegion: Region = { latitude: -17.7833, longitude: -63.1821, latitudeDelta: 0.01, longitudeDelta: 0.01 };

  // Fetch lista de ubicaciones
  const fetchUbicaciones = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('https://api-4g7v.onrender.com/api/ubicaciones/', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json(); 
      setUbicaciones(data || []);
    } catch (error) { 
      console.error('Error fetching ubicaciones:', error);
      setUbicaciones([]); 
    }
    setLoading(false);
  };
  
  useEffect(() => { 
    fetchUbicaciones(); 
  }, []);
  
  const onRefresh = async () => { 
    setRefreshing(true); 
    await fetchUbicaciones(); 
    setRefreshing(false); 
  };

  // Fetch detalles de una ubicación específica
  const fetchUbicacionDetalle = async (id: string) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`https://api-4g7v.onrender.com/api/ubicaciones/${id}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      if (!res.ok) {
        throw new Error('Error al obtener datos de la ubicación');
      }
      
      const data = await res.json();
      
      // Establecer los valores para edición
      setNombreOrigen(data.nombreOrigen);
      setNombreDestino(data.nombreDestino);
      
      const origenCoord = { 
        latitude: data.coordenadasOrigen[0], 
        longitude: data.coordenadasOrigen[1] 
      };
      
      const destCoord = { 
        latitude: data.coordenadasDestino[0], 
        longitude: data.coordenadasDestino[1] 
      };
      
      setOrigin(origenCoord);
      setDest(destCoord);
      setStage(2); // Ya tenemos origen y destino
      
      // Si hay ruta, cargarla
      if (data.rutaGeoJSON && data.rutaGeoJSON.coordinates.length > 0) {
        const coords = data.rutaGeoJSON.coordinates.map(
          ([lng, lat]: [number, number]) => ({ latitude: lat, longitude: lng })
        );
        setRouteCoords(coords);
      }
      
    } catch (error) {
      console.error('Error al cargar detalles de la ubicación:', error);
      Alert.alert(
        'Error', 
        'No se pudieron cargar los datos de la ubicación',
        [{ text: 'OK', onPress: () => { resetMapStates(); setShowMap(false); } }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Decode ruta
  const fetchRouteCoords = async (orig: any, dst: any) => {
    try {
      const apiKey = await AsyncStorage.getItem('google_maps_api_key');
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${orig.latitude},${orig.longitude}&destination=${dst.latitude},${dst.longitude}&key=${apiKey}`;
      const res = await fetch(url);
      const json = await res.json();
      return json.routes?.length ? decodePolyline(json.routes[0].overview_polyline.points) : [];
    } catch (error) {
      console.error('Error fetching route:', error);
      return [];
    }
  };

  // Cargar ruta cuando se selecciona origen y destino
  useEffect(() => {
    let isMounted = true;
    
    if (origin && dest && stage === 2) {
      const loadRoute = async () => {
        if (!isMounted) return;
        setLoadingRoute(true);
        try {
          const coords = await fetchRouteCoords(origin, dest);
          if (isMounted) {
            setRouteCoords(coords);
          }
        } catch (error) {
          console.error('Error al cargar la ruta:', error);
        } finally {
          if (isMounted) {
            setLoadingRoute(false);
          }
        }
      };
      loadRoute();
    } else if (isMounted) {
      setRouteCoords([]);
    }
    
    return () => {
      isMounted = false;
    };
  }, [origin, dest, stage]);

  // Save (crear nueva ubicación)
  const guardarDireccion = async () => {
    if (origin && dest && nombreOrigen.trim() && nombreDestino.trim()) {
      try {
        Animated.timing(progress, { 
          toValue: 100, 
          duration: 2000, 
          useNativeDriver: false 
        }).start();
        
        const token = await AsyncStorage.getItem('token');
        const userId = Number(await AsyncStorage.getItem('userId'));
        
        // Usar la ruta ya cargada o cargarla si no existe
        let coords = routeCoords;
        if (coords.length === 0) {
          coords = await fetchRouteCoords(origin, dest);
        }
        
        const geoCoords = coords.map(c => [c.longitude, c.latitude] as [number, number]);
        const body = { 
          id_usuario: userId, 
          nombreOrigen: nombreOrigen.trim(), 
          coordenadasOrigen: [origin.latitude, origin.longitude], 
          nombreDestino: nombreDestino.trim(), 
          coordenadasDestino: [dest.latitude, dest.longitude], 
          segmentos: [{ type: 'LineString', coordinates: geoCoords }],
          rutaGeoJSON: { type: 'LineString', coordinates: geoCoords } 
        };
        
        await fetch('https://api-4g7v.onrender.com/api/ubicaciones/', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
          body: JSON.stringify(body) 
        });
        
        progress.setValue(0);
        resetMapStates();
        setShowMap(false);
        fetchUbicaciones();
      } catch (error) {
        console.error('Error al guardar la dirección:', error);
        Alert.alert('Error', 'No se pudo guardar la dirección');
      }
    }
  };

  // Update (actualizar ubicación existente)
  const actualizarDireccion = async () => {
    if (!currentId || !origin || !dest || !nombreOrigen.trim() || !nombreDestino.trim()) {
      Alert.alert('Error', 'Faltan datos para actualizar');
      return;
    }

    try {
      setLoadingRoute(true);
      Animated.timing(progress, { 
        toValue: 100, 
        duration: 2000, 
        useNativeDriver: false 
      }).start();
      
      const token = await AsyncStorage.getItem('token');
      
      // Asegurar que tenemos coordenadas de ruta
      let coords = routeCoords;
      if (coords.length === 0) {
        coords = await fetchRouteCoords(origin, dest);
      }
      
      const geoCoords = coords.map(c => [c.longitude, c.latitude] as [number, number]);
      const body = { 
        nombreOrigen: nombreOrigen.trim(), 
        nombreDestino: nombreDestino.trim(), 
        coordenadasOrigen: [origin.latitude, origin.longitude], 
        coordenadasDestino: [dest.latitude, dest.longitude], 
        rutaGeoJSON: { type: 'LineString', coordinates: geoCoords }
      };
      
      const res = await fetch(`https://api-4g7v.onrender.com/api/ubicaciones/${currentId}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, 
        body: JSON.stringify(body) 
      });
      
      if (!res.ok) {
        throw new Error('Error al actualizar la ubicación');
      }
      
      // Mostrar mensaje de éxito temporalmente
      setSuccessMessage('Ubicación actualizada correctamente');
      setTimeout(() => {
        progress.setValue(0);
        resetMapStates();
        setShowMap(false);
        fetchUbicaciones();
      }, 2000);
      
    } catch (error) {
      console.error('Error al actualizar la dirección:', error);
      Alert.alert('Error', 'No se pudo actualizar la dirección');
    } finally {
      setLoadingRoute(false);
    }
  };

  // Delete location con confirmación y manejo de errores
  const handleDelete = async (locationId: string) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar esta dirección?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const token = await AsyncStorage.getItem('token');
              const res = await fetch(`https://api-4g7v.onrender.com/api/ubicaciones/${locationId}`, { 
                method: 'DELETE', 
                headers: { Authorization: `Bearer ${token}` } 
              });
              
              const data = await res.json();
              
              if (res.ok) {
                await fetchUbicaciones();
                Alert.alert('Éxito', 'Dirección eliminada correctamente');
              } else {
                // Manejo específico para ubicaciones en uso
                if (res.status === 400 && data.error?.includes('en uso')) {
                  Alert.alert('Error', 'No se puede eliminar esta dirección porque está siendo utilizada en un envío activo.');
                } else {
                  Alert.alert('Error', data.error || 'No se pudo eliminar la dirección');
                }
              }
            } catch (error) {
              console.error('Error al eliminar ubicación:', error);
              Alert.alert('Error', 'Fallo al conectar con el servidor');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Detail
  if (selected) {
    const rawCoords: [number, number][] = selected.segmentos && selected.segmentos.length > 0
      ? selected.segmentos[0].coordinates
      : selected.rutaGeoJSON
        ? selected.rutaGeoJSON.coordinates
        : [];
    const seg = rawCoords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
    return (
      <View style={tw`flex-1`}>
        <View style={tw`flex-row items-center pt-10 px-4 pb-4 bg-white`}>
          <Pressable 
            style={tw`p-2`} 
            onPress={() => {
              setSelected(null);
              resetMapStates();
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#0140CD"/>
          </Pressable>
          <Text style={tw`text-gray-800 text-lg font-semibold ml-2`}>Detalles de dirección</Text>
        </View>
        <MapView
          ref={mapViewRef}
          provider={PROVIDER_GOOGLE}
          style={tw`flex-1`}
          initialRegion={seg?.[0] ? { ...seg[0], latitudeDelta: 0.01, longitudeDelta: 0.01 } : initialRegion}>
          {selected && (
            <>
              <Marker coordinate={{ latitude: selected.coordenadasOrigen[0], longitude: selected.coordenadasOrigen[1] }}/>
              <Marker coordinate={{ latitude: selected.coordenadasDestino[0], longitude: selected.coordenadasDestino[1] }}/>
              {seg && seg.length > 0 && <Polyline coordinates={seg} strokeWidth={4} strokeColor="#0077b6" />}
            </>
          )}
        </MapView>
      </View>
    );
  }

  // Create/Edit Screen
  if (showMap) {
    return (
      <KeyboardAvoidingView 
        style={tw`flex-1 bg-gray-100`} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            ref={scrollViewRef}
            style={tw`flex-1`}
            contentContainerStyle={tw`pb-6`}
            keyboardShouldPersistTaps="handled"
          >
            {/* White card container */}
            <View style={tw`m-4 bg-white rounded-lg shadow-md overflow-hidden`}>
              {/* Header */}
              <View style={tw`p-5`}>
                <Text style={tw`text-xl font-bold text-black`}>
                  {editMode ? 'Editar dirección' : 'Seleccionar Origen y Destino en el Mapa'}
                </Text>
                <Text style={tw`mt-2 text-gray-700`}>
                  {`Haz clic en el mapa para seleccionar el ${stage === 0 ? 'origen' : stage === 1 ? 'destino' : 'origen'}`}
                </Text>
              </View>
              
              {/* Status message */}
              <View style={tw`mx-5 my-2 bg-blue-50 p-3 rounded-md`}>
                <Text style={tw`text-center text-blue-600`}>
                  {successMessage ? successMessage : 
                    stage === 0 
                      ? 'Selecciona el punto de origen en el mapa' 
                      : stage === 1 
                        ? 'Selecciona el punto de destino en el mapa' 
                        : loadingRoute
                          ? 'Calculando ruta...'
                          : 'Puntos seleccionados correctamente'}
                </Text>
              </View>
              
              {/* Map */}
              <View style={tw`mx-5 h-60 rounded-md overflow-hidden mb-4`}>
                <MapView 
                  ref={mapViewRef}
                  provider={PROVIDER_GOOGLE}
                  style={tw`flex-1`} 
                  initialRegion={initialRegion} 
                  onPress={(e) => {
                    // Usar e.persist() para evitar que el evento sea reciclado
                    e.persist && e.persist();
                    
                    if (!e.nativeEvent || !e.nativeEvent.coordinate) {
                      console.error('Evento de mapa inválido');
                      return;
                    }
                    
                    const coordinate = e.nativeEvent.coordinate;
                    
                    // Simplificado: siempre seleccionar origen primero, luego destino
                    if (stage === 0 || (editMode && stage === 2)) {
                      setOrigin(coordinate);
                      setStage(1); // Ahora a seleccionar destino
                    } else if (stage === 1) {
                      setDest(coordinate);
                      setStage(2); // Completado
                    }
                  }}
                >
                  {origin && <Marker coordinate={origin} pinColor="green"/>}
                  {dest && <Marker coordinate={dest} pinColor="red"/>}
                  
                  {/* Mostrar solamente la ruta final cuando está disponible */}
                  {routeCoords.length > 0 && !loadingRoute && (
                    <Polyline 
                      coordinates={routeCoords} 
                      strokeWidth={3} 
                      strokeColor="#0140CD" 
                    />
                  )}
                </MapView>
                
                {/* Mostrar indicador de carga fuera del MapView para evitar problemas */}
                {loadingRoute && (
                  <View style={tw`absolute inset-0 items-center justify-center pointer-events-none`}>
                    <View style={tw`bg-white bg-opacity-70 p-2 rounded-full`}>
                      <ActivityIndicator size="small" color="#0140CD" />
                    </View>
                  </View>
                )}
              </View>
              
              {/* Input fields */}
              <View style={tw`px-5`}>
                <View style={tw`mb-4`}>
                  <Text style={tw`text-gray-700 mb-1`}>Nombre del lugar de origen:</Text>
                  <TextInput 
                    placeholder="Ej. Finca Orgánica La Esperanza" 
                    style={tw`border border-gray-300 rounded-lg p-3 text-gray-700`}
                    value={nombreOrigen}
                    onChangeText={setNombreOrigen}
                    onFocus={() => {
                      // Scroll to input cuando recibe foco
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 100);
                    }}
                  />
                </View>
                
                <View style={tw`mb-4`}>
                  <Text style={tw`text-gray-700 mb-1`}>Nombre del lugar de destino:</Text>
                  <TextInput 
                    placeholder="Ej. Planta Central de Procesamiento" 
                    style={tw`border border-gray-300 rounded-lg p-3 text-gray-700`}
                    value={nombreDestino}
                    onChangeText={setNombreDestino}
                    onFocus={() => {
                      // Scroll to input cuando recibe foco
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 100);
                    }}
                  />
                </View>
              </View>
              
              {/* Show coordinates toggle */}
              <View style={tw`px-5 mb-4`}>
                <Pressable 
                  style={tw`flex-row items-center justify-end`}
                  onPress={() => setShowCoordinates(!showCoordinates)}
                >
                  <Ionicons name="eye" size={16} color="#0140CD" />
                  <Text style={tw`ml-1 text-sm text-[#0140CD]`}>
                    MOSTRAR COORDENADAS
                  </Text>
                </Pressable>
                
                {showCoordinates && (
                  <View style={tw`mt-2 p-3 bg-gray-100 rounded-md`}>
                    <Text style={tw`text-xs text-gray-700`}>
                      Origen: {origin ? `${origin.latitude.toFixed(6)}, ${origin.longitude.toFixed(6)}` : 'No seleccionado'}
                    </Text>
                    <Text style={tw`text-xs text-gray-700 mt-1`}>
                      Destino: {dest ? `${dest.latitude.toFixed(6)}, ${dest.longitude.toFixed(6)}` : 'No seleccionado'}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Save/Update button */}
              <View style={tw`px-5 mb-5 items-center`}>
                <Pressable 
                  style={tw`${(origin && dest && nombreOrigen.trim() && nombreDestino.trim() && !loadingRoute) 
                    ? 'bg-[#0140CD]' 
                    : 'bg-gray-400'} py-3 px-4 rounded-lg w-56`}
                  onPress={editMode ? actualizarDireccion : guardarDireccion}
                  disabled={!(origin && dest && nombreOrigen.trim() && nombreDestino.trim()) || loadingRoute}
                >
                  <Text style={tw`text-white text-center font-semibold`}>
                    {loadingRoute ? 'Procesando...' : editMode ? 'Actualizar dirección' : 'Guardar dirección'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
        
        {/* Progress bar for animation */}
        <View style={tw`absolute top-0 left-0 right-0 h-1 bg-gray-200`}>
          <Animated.View 
            style={[
              tw`h-1 bg-green-500`,
              {
                width: progress.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%']
                })
              }
            ]} 
          />
        </View>
      </KeyboardAvoidingView>
    );
  }

  // List view
  return (
    <View style={tw`flex-1 bg-white`}>
      <View style={tw`px-5 pt-10 pb-4`}>
        <Text style={tw`text-2xl font-bold text-[#0140CD]`}>Direcciones Guardadas</Text>
      </View>
      
      <View style={tw`flex-row justify-between items-center px-5 py-4`}>
        <Text style={tw`text-base font-semibold text-gray-800`}>Lista de direcciones</Text>
        <Pressable 
          style={tw`flex-row items-center bg-[#0140CD] px-4 py-2 rounded`}
          onPress={() => {
            resetMapStates();
            setShowMap(true);
          }}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={tw`text-white ml-1 font-medium`}>Nueva dirección</Text>
        </Pressable>
      </View>
      
      {loading ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#0140CD" />
        </View>
      ) : (
        <ScrollView style={tw`flex-1 px-5`}>
          {ubicaciones.length === 0 ? (
            <Text style={tw`text-center text-gray-500 mt-10`}>No hay direcciones guardadas</Text>
          ) : (
            ubicaciones.map((item, index) => (
              <View key={item._id}>
                <View style={tw`py-4 flex-row justify-between items-center`}>
                  <Pressable style={tw`flex-1`} onPress={() => setSelected(item)}>
                    <Text style={tw`text-gray-800`}>
                      {item.nombreOrigen} → {item.nombreDestino}
                    </Text>
                  </Pressable>
                  <View style={tw`flex-row items-center`}>
                    <Pressable 
                      style={tw`bg-blue-50 px-3 py-1.5 rounded mr-2`}
                      onPress={() => {
                        resetMapStates();
                        setCurrentId(item._id);
                        setEditMode(true);
                        fetchUbicacionDetalle(item._id);
                        setShowMap(true);
                      }}
                    >
                      <Text style={tw`text-[#0140CD] text-xs`}>Editar</Text>
                    </Pressable>
                    <Pressable 
                      style={tw`bg-red-50 px-3 py-1.5 rounded`}
                      onPress={() => handleDelete(item._id)}
                    >
                      <Text style={tw`text-red-500 text-xs`}>Eliminar</Text>
                    </Pressable>
                  </View>
                </View>
                {index < ubicaciones.length - 1 && <View style={tw`h-px bg-gray-200`} />}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
