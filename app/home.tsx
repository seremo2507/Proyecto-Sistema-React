import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { MotiView } from 'moti';

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

  const fetchEnvios = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return setEnvios([]);

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

  useFocusEffect(
    useCallback(() => {
      const cargarUsuario = async () => {
        const raw = await AsyncStorage.getItem('usuario');
        const parsed = raw ? JSON.parse(raw) : {};
        setUsuario({
          nombre: parsed.nombre || 'Transportista',
          rol: parsed.rol || 'transportista',
        });
      };
      cargarUsuario();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      if (usuario.rol === 'transportista') {
        fetchEnvios();
      }
    }, [usuario])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEnvios();
    setRefreshing(false);
  };

  const estadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'entregado':
        return '#28a745';
      case 'en ruta':
      case 'en curso':
        return '#fd7e14';
      case 'asignado':
        return '#007bff';
      case 'pendiente':
        return '#6c757d';
      default:
        return '#adb5bd';
    }
  };

  const renderEnvio = ({ item, index }: { item: Envio; index: number }) => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ delay: index * 100, type: 'timing' }}
      style={{ marginBottom: 16 }}
    >
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: estadoColor(item.estado_envio) }]}
        onPress={() =>
          router.replace({
            pathname: '/detalle-envio',
            params: {
              id_asignacion: item.id_asignacion.toString(),
              refresh: Date.now().toString(),
            },
          })
        }
      >
        <View style={styles.cardHeader}>
          <Ionicons name="cube-outline" size={24} color={estadoColor(item.estado_envio)} />
          <Text style={styles.cardTitle}>Envío N.º {item.id_envio}</Text>
        </View>
        <Text style={styles.cardSub}>
          {item.cargas?.[0]?.tipo || '—'} ▪︎ {item.recogidaEntrega?.fecha_recogida?.split('T')[0] || '—'}
        </Text>
        <View style={styles.estadoBadge}>
          <Text style={[styles.estadoText, { backgroundColor: estadoColor(item.estado_envio) }]}>
            {item.estado_envio}
          </Text>
        </View>
      </TouchableOpacity>
    </MotiView>
  );

  return (
    <LinearGradient colors={['#0f2027', '#2c5364']} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Ionicons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>Hola,</Text>
          <Text style={styles.greetingName}>{usuario.nombre}</Text>
        </View>
        <Image
          source={require('../assets/logo.png')}
          style={styles.avatar}
        />
      </View>

      {usuario.rol === 'admin' ? (
        <View style={styles.adminContainer}>
          <Text style={styles.subtitle}>Panel de Administrador</Text>
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => router.push('/crear-envio')}
          >
            <Ionicons name="add-circle-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.adminButtonText}>Crear Envío</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : envios.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.noData}>No tienes envíos asignados.</Text>
        </View>
      ) : (
        <FlatList
          data={envios}
          keyExtractor={(item) => item.id_asignacion.toString()}
          renderItem={renderEnvio}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#28a745']} />
          }
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  greeting: { flex: 1, marginLeft: 12 },
  greetingText: { color: '#ccc', fontSize: 16 },
  greetingName: { color: '#fff', fontSize: 22, fontWeight: '700' },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noData: { color: '#eee', fontSize: 16 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginLeft: 8 },
  cardSub: { color: '#ccc', fontSize: 14, marginBottom: 12 },
  estadoBadge: { alignSelf: 'flex-start', borderRadius: 12, overflow: 'hidden' },
  estadoText: { color: '#fff', paddingVertical: 4, paddingHorizontal: 12, fontSize: 12 },
  adminContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  subtitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  adminButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
