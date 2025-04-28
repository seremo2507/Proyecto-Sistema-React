import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CrearEnvio() {
  const [tipo, setTipo] = useState('');
  const [nombreOrigen, setNombreOrigen] = useState('');
  const [nombreDestino, setNombreDestino] = useState('');
  const [coordenadasOrigen, setCoordenadasOrigen] = useState('');
  const [coordenadasDestino, setCoordenadasDestino] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCrearEnvio = async () => {
    if (!tipo || !nombreOrigen || !nombreDestino || !coordenadasOrigen || !coordenadasDestino) {
      return Alert.alert('Error', 'Por favor completa todos los campos.');
    }

    const [latO, lonO] = coordenadasOrigen.split(',').map(Number);
    const [latD, lonD] = coordenadasDestino.split(',').map(Number);

    if ([latO, lonO, latD, lonD].some(coord => isNaN(coord))) {
      return Alert.alert('Error', 'Coordenadas inválidas. Usa formato: latitud,longitud');
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('https://api-4g7v.onrender.com/api/envios/crear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tipo,
          nombre_origen: nombreOrigen,
          nombre_destino: nombreDestino,
          coordenadas_origen: [latO, lonO],
          coordenadas_destino: [latD, lonD],
        }),
      });

      if (!res.ok) throw new Error('Error al crear el envío');

      Alert.alert('Éxito', 'Envío creado correctamente');
      router.replace('/home');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0f2027', '#2c5364']} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600 }}
        >
          <TouchableOpacity onPress={() => router.replace('/home')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Crear Nuevo Envío</Text>

          <TextInput
            placeholder="Tipo de carga (Frutas, Verduras, etc)"
            placeholderTextColor="#888"
            style={styles.input}
            value={tipo}
            onChangeText={setTipo}
          />
          <TextInput
            placeholder="Nombre del Origen"
            placeholderTextColor="#888"
            style={styles.input}
            value={nombreOrigen}
            onChangeText={setNombreOrigen}
          />
          <TextInput
            placeholder="Nombre del Destino"
            placeholderTextColor="#888"
            style={styles.input}
            value={nombreDestino}
            onChangeText={setNombreDestino}
          />
          <TextInput
            placeholder="Coordenadas Origen (lat,long)"
            placeholderTextColor="#888"
            style={styles.input}
            value={coordenadasOrigen}
            onChangeText={setCoordenadasOrigen}
          />
          <TextInput
            placeholder="Coordenadas Destino (lat,long)"
            placeholderTextColor="#888"
            style={styles.input}
            value={coordenadasDestino}
            onChangeText={setCoordenadasDestino}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.disabled]}
            onPress={handleCrearEnvio}
            disabled={loading}
          >
            <Ionicons name="cloud-upload-outline" size={22} color="#fff" />
            <Text style={styles.buttonText}>
              {loading ? 'Creando...' : 'Crear Envío'}
            </Text>
          </TouchableOpacity>
        </MotiView>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1e2a38',
    color: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  disabled: { backgroundColor: '#555' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backButton: { marginBottom: 16 },
});
