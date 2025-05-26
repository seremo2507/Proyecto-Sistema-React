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
import tw from 'twrnc';

type Envio = {
  id_asignacion: number;
  id_envio: number;
  estado_envio: string;
  cargas?: { tipo: string }[];
  recogidaEntrega?: { fecha_recogida: string };
  cliente?: string;
  origen?: string;
  destino?: string;
  [key: string]: any;
};

type EnvioCliente = {
  id: number;
  estado: string;
  fecha_recogida?: string;
  hora_recogida?: string;
  hora_entrega?: string;
  nombre_origen?: string;
  nombre_destino?: string;
  [key: string]: any;
};

export default function HomeScreen() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [enviosCliente, setEnviosCliente] = useState<EnvioCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usuario, setUsuario] = useState<{ nombre: string; rol: string }>({ nombre: 'Juan', rol: 'transportista' });
  const [filtroActual, setFiltroActual] = useState<string>('asignado');

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

  // Fetch shipments for cliente (igual que en el JS original)
  const fetchEnviosCliente = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) { setEnviosCliente([]); return; }
      
      const res = await fetch('https://api-4g7v.onrender.com/api/envios/mis-envios', {
        method: 'GET',
        headers: { 
          Authorization: `Bearer ${token}` 
        },
      });

      if (!res.ok) {
        throw new Error('No se pudo obtener los envíos');
      }

      const data = await res.json();
      setEnviosCliente(data || []);
    } catch (err) {
      console.error('❌ Error al obtener los envíos:', err);
      setEnviosCliente([]);
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
        setUsuario({ nombre: parsed.nombre || 'Juan', rol });
        
        if (rol === 'transportista') {
          // Transportista inicia en "asignado"
          setFiltroActual('asignado');
          await fetchEnvios();
        } else if (rol === 'cliente') {
          // Cliente inicia en "curso"
          setFiltroActual('curso');
          await fetchEnviosCliente();
        }
      };
      cargar();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (usuario.rol === 'transportista') {
      await fetchEnvios();
    } else if (usuario.rol === 'cliente') {
      await fetchEnviosCliente();
    }
    setRefreshing(false);
  };

  // Filtrar envíos según el estado seleccionado para transportista
  const enviosFiltrados = envios.filter(envio => {
    const estado = envio.estado_envio.toLowerCase();
    switch (filtroActual) {
      case 'en curso':
        return estado === 'en ruta' || estado === 'en curso';
      case 'completados':
        return estado === 'entregado';
      case 'asignado':
        return estado === 'asignado';
      default:
        return true;
    }
  });

  // Filtrar envíos para cliente (igual lógica que el JS original)
  const enviosClienteFiltrados = enviosCliente.filter(envio => {
    switch (filtroActual) {
      case 'anteriores':
        return envio.estado === 'Entregado';
      case 'curso':
        return envio.estado === 'En curso';
      case 'pendientes':
        return envio.estado === 'Pendiente' || envio.estado === 'Asignado';
      default:
        return true;
    }
  });

  // Formatear fecha (igual que en el JS original)
  const formatearFecha = (fecha: string | undefined) => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString();
  };

  // Formatear hora (igual que en el JS original)
  const formatearHora = (hora: string | undefined) => {
    if (!hora || hora === '00:00:00.000Z') return '—';
    return hora.substring(0, 5);
  };

  // Obtener color de estado para cliente
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Pendiente':
        return '#EAB308'; // yellow
      case 'Asignado':
        return '#8B5CF6'; // purple
      case 'En curso':
        return '#3B82F6'; // blue
      case 'Entregado':
        return '#10B981'; // green
      default:
        return '#6B7280'; // gray
    }
  };

  // Render shipment para transportista
  const renderEnvio = ({ item }: { item: Envio }) => (
    <View style={tw`mb-4`}>
      <TouchableOpacity
        style={[
          tw`bg-white mx-4 rounded-xl p-4 shadow`,
          { 
            borderLeftWidth: 4, 
            borderLeftColor: '#0140CD',
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
          <Ionicons name="cube-outline" size={24} color="#0140CD" />
          <Text style={tw`text-gray-800 text-lg font-semibold ml-2`}>
            Envío N.º {item.id_envio}
          </Text>
        </View>
        <Text style={tw`text-gray-500 text-sm mb-3`}>
          {item.cargas?.[0]?.tipo || '—'} ▪︎ {item.recogidaEntrega?.fecha_recogida?.split('T')[0] || '—'}
        </Text>
        <View style={tw`self-start rounded-xl overflow-hidden`}>
          <Text style={tw`text-white py-1 px-3 text-xs bg-[#0140CD]`}>
            {item.estado_envio}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  // Render shipment para cliente (exactamente igual diseño que transportista)
  const renderEnvioCliente = ({ item }: { item: EnvioCliente }) => (
    <View style={tw`mb-4`}>
      <TouchableOpacity
        style={[
          tw`bg-white mx-4 rounded-xl p-4 shadow`,
          { 
            borderLeftWidth: 4, 
            borderLeftColor: '#0140CD',
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 4,
            elevation: 3
          }
        ]}
        onPress={() => {
          // Igual que en el JS original
          AsyncStorage.setItem('envioEnSeguimiento', item.id.toString());
          // Aquí implementarías la navegación a seguimiento
          console.log(`Navegando a seguimiento del envío: ${item.id}`);
        }}
      >
        <View style={tw`flex-row items-center mb-2`}>
          <Ionicons name="cube-outline" size={24} color="#0140CD" />
          <Text style={tw`text-gray-800 text-lg font-semibold ml-2`}>
            Envío N.º {item.id}
          </Text>
        </View>
        <Text style={tw`text-gray-500 text-sm mb-3`}>
          {item.nombre_origen || 'Origen'} → {item.nombre_destino || 'Destino'} ▪︎ {formatearFecha(item.fecha_recogida)}
        </Text>
        <View style={tw`self-start rounded-xl overflow-hidden`}>
          <Text style={tw`text-white py-1 px-3 text-xs bg-[#0140CD]`}>
            {item.estado}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={tw`flex-1 bg-gray-100`}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header con el logo original */}
      <View style={tw`flex-row items-center pt-10 px-4 pb-4 bg-white`}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={28} color="#0140CD" />
        </TouchableOpacity>
        <View style={tw`flex-1 ml-3`}>
          <Text style={tw`text-gray-500 text-base`}>Hola,</Text>
          <Text style={tw`text-gray-800 text-2xl font-bold`}>{usuario.nombre}</Text>
        </View>
        <View style={tw`w-10 h-10 rounded-full bg-[#0140CD] justify-center items-center`}>
          <Image source={require('../assets/logo.png')} style={tw`w-8 h-8`} />
        </View>
      </View>

      {/* Filtros para transportistas */}
      {usuario.rol === 'transportista' && (
        <View style={tw`flex-row justify-center py-3 bg-white mb-px`}>
          <TouchableOpacity
            style={tw`px-3 py-1.5 mx-1 ${filtroActual === 'en curso' ? 'border border-[#0140CD] rounded-full' : ''}`}
            onPress={() => setFiltroActual('en curso')}
          >
            <Text style={tw`${filtroActual === 'en curso' ? 'text-[#0140CD]' : 'text-gray-600'}`}>En Curso</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={tw`px-3 py-1.5 mx-1 ${filtroActual === 'completados' ? 'border border-[#0140CD] rounded-full' : ''}`}
            onPress={() => setFiltroActual('completados')}
          >
            <Text style={tw`${filtroActual === 'completados' ? 'text-[#0140CD]' : 'text-gray-600'}`}>Completados</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={tw`px-3 py-1.5 mx-1 ${filtroActual === 'asignado' ? 'border border-[#0140CD] rounded-full' : ''}`}
            onPress={() => setFiltroActual('asignado')}
          >
            <Text style={tw`${filtroActual === 'asignado' ? 'text-[#0140CD]' : 'text-gray-600'}`}>Asignados</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filtros para clientes (sin números) */}
      {usuario.rol === 'cliente' && (
        <View style={tw`flex-row justify-center py-3 bg-white mb-px`}>
          <TouchableOpacity
            style={tw`px-3 py-1.5 mx-1 ${filtroActual === 'curso' ? 'border border-[#0140CD] rounded-full' : ''}`}
            onPress={() => setFiltroActual('curso')}
          >
            <Text style={tw`${filtroActual === 'curso' ? 'text-[#0140CD]' : 'text-gray-600'}`}>
              En Curso
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={tw`px-3 py-1.5 mx-1 ${filtroActual === 'anteriores' ? 'border border-[#0140CD] rounded-full' : ''}`}
            onPress={() => setFiltroActual('anteriores')}
          >
            <Text style={tw`${filtroActual === 'anteriores' ? 'text-[#0140CD]' : 'text-gray-600'}`}>
              Anteriores
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={tw`px-3 py-1.5 mx-1 ${filtroActual === 'pendientes' ? 'border border-[#0140CD] rounded-full' : ''}`}
            onPress={() => setFiltroActual('pendientes')}
          >
            <Text style={tw`${filtroActual === 'pendientes' ? 'text-[#0140CD]' : 'text-gray-600'}`}>
              Pendientes
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Contenido principal */}
      {usuario.rol === 'admin' ? (
        // Panel de admin (sin cambios)
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
      ) : usuario.rol === 'transportista' ? (
        // Lista de envíos para transportista (sin cambios)
        loading ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <ActivityIndicator size="large" color="#0140CD" />
          </View>
        ) : enviosFiltrados.length === 0 ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <Text style={tw`text-gray-600 text-lg`}>No hay envíos para mostrar</Text>
          </View>
        ) : (
          <FlatList
            data={enviosFiltrados}
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
      ) : usuario.rol === 'cliente' ? (
        // Lista de envíos para cliente (nueva implementación)
        loading ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <ActivityIndicator size="large" color="#0140CD" />
          </View>
        ) : enviosClienteFiltrados.length === 0 ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <Text style={tw`text-gray-600 text-lg`}>No hay envíos para mostrar</Text>
          </View>
        ) : (
          <FlatList
            data={enviosClienteFiltrados}
            keyExtractor={item => item.id.toString()}
            renderItem={renderEnvioCliente}
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
      ) : null}
    </View>
  );
}
