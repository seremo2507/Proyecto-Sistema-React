import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerActions, useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import tw from 'twrnc';

type Envio = {
  id_asignacion: number;
  id_envio: number;
  estado_envio: string;
  cargas?: { tipo: string }[];
  recogidaEntrega?: { fecha_recogida: string };
  [key: string]: any;
};

export default function HomeScreen() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usuario, setUsuario] = useState<{ nombre: string; rol: string }>({ nombre: 'Transportista', rol: 'transportista' });

  const navigation = useNavigation();

  // Fetch shipments for transportista
  const fetchEnvios = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) { setEnvios([]); return; }
      const res = await fetch('https://api-4g7v.onrender.com/api/envios/mis-envios-transportista', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setEnvios(data || []);
    } catch (err) {
      console.error('Error al obtener envíos:', err);
      setEnvios([]);
    } finally {
      setLoading(false);
    }
  };

  // Load user and shipments on focus
  useFocusEffect(
    useCallback(() => {
      const cargar = async () => {
        const raw = await AsyncStorage.getItem('usuario');
        const parsed = raw ? JSON.parse(raw) : {};
        const rol = parsed.rol || 'transportista';
        setUsuario({ nombre: parsed.nombre || 'Usuario', rol });
        if (rol === 'transportista') {
          await fetchEnvios();
        }
      };
      cargar();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (usuario.rol === 'transportista') {
      await fetchEnvios();
    }
    setRefreshing(false);
  };

  // Status color helper
  const estadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'entregado': return '#28a745';
      case 'en ruta':
      case 'en curso': return '#fd7e14';
      case 'asignado': return '#007bff';
      case 'pendiente': return '#6c757d';
      default: return '#adb5bd';
    }
  };

  // Render shipment
  const renderEnvio = ({ item, index }: { item: Envio; index: number }) => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ delay: index * 100 }}
      style={tw`mb-4`}
    >
      <TouchableOpacity
        style={[
          tw`bg-white mx-4 rounded-xl p-4 shadow`,
          { 
            borderLeftWidth: 4, 
            borderLeftColor: estadoColor(item.estado_envio),
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 4,
            elevation: 3
          }
        ]}
        onPress={() =>
          router.replace({
            pathname: '/detalle-envio',
            params: { id_asignacion: item.id_asignacion.toString() },
          })
        }
      >
        <View style={tw`flex-row items-center mb-2`}>
          <Ionicons name="cube-outline" size={24} color={estadoColor(item.estado_envio)} />
          <Text style={tw`text-gray-800 text-lg font-semibold ml-2`}>
            Envío N.º {item.id_envio}
          </Text>
        </View>
        <Text style={tw`text-gray-500 text-sm mb-3`}>
          {item.cargas?.[0]?.tipo || '—'} ▪︎ {item.recogidaEntrega?.fecha_recogida?.split('T')[0] || '—'}
        </Text>
        <View style={tw`self-start rounded-xl overflow-hidden`}>
          <Text style={[
            tw`text-white py-1 px-3 text-xs`,
            { backgroundColor: estadoColor(item.estado_envio) }
          ]}>
            {item.estado_envio}
          </Text>
        </View>
      </TouchableOpacity>
    </MotiView>
  );

  return (
    <View style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" />
      <View style={tw`flex-row items-center pt-12 px-4 pb-4`}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={28} color="#0140CD" />
        </TouchableOpacity>
        <View style={tw`flex-1 ml-3`}>
          <Text style={tw`text-gray-500 text-base`}>Hola,</Text>
          <Text style={tw`text-gray-800 text-xl font-bold`}>{usuario.nombre}</Text>
        </View>
        <View style={tw`w-10 h-10 rounded-full bg-[#0140CD] justify-center items-center`}>
          <Image source={require('../assets/logo.png')} style={tw`w-8 h-8`} />
        </View>
      </View>

      {(usuario.rol === 'admin' || usuario.rol === 'cliente') ? (
        <View style={tw`flex-1 justify-center items-center p-4`}>
          <Text style={tw`text-gray-800 text-xl font-bold mb-5`}>Panel de Administrador</Text>
          <TouchableOpacity 
            style={[
              tw`flex-row items-center bg-white border-2 border-[#0140CD] py-3.5 px-6 rounded-xl`,
              { 
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 6,
                elevation: 4
              }
            ]} 
            onPress={() => router.push('/crear-envio/CrearEnvio')}
          >
            <Ionicons name="add-circle-outline" size={24} color="#0140CD" style={tw`mr-2`} />
            <Text style={tw`text-[#0140CD] text-base font-semibold`}>Crear Envío</Text>
          </TouchableOpacity>
        </View>
      ) : usuario.rol === 'transportista' && (
        loading ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <ActivityIndicator size="large" color="#0140CD" />
          </View>
        ) : envios.length === 0 ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <Text style={tw`text-gray-600 text-base`}>No tienes envíos asignados.</Text>
          </View>
        ) : (
          <FlatList
            data={envios}
            keyExtractor={item => item.id_asignacion.toString()}
            renderItem={renderEnvio}
            contentContainerStyle={tw`pt-2 pb-6`}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                colors={['#0140CD']} 
              />
            }
          />
        )
      )}
    </View>
  );
}