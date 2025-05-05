import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Image,
} from 'react-native';
import { DrawerContentScrollView, useDrawerStatus } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function CustomDrawer(props: any) {
  const [usuario, setUsuario] = useState<{ nombre: string; rol: string }>({ nombre: 'Usuario', rol: '' });
  const [showModal, setShowModal] = useState(false);
  const isDrawerOpen = useDrawerStatus();

  // Helper to load user
  const cargarUsuario = async () => {
    const raw = await AsyncStorage.getItem('usuario');
    const parsed = raw ? JSON.parse(raw) : {};
    setUsuario({
      nombre: parsed.nombre || 'Usuario',
      rol: parsed.rol || '',
    });
  };

  // Load user initially when mounted
  useEffect(() => {
    cargarUsuario();
  }, []);

  // Reload user each time drawer opens
  useEffect(() => {
    if (isDrawerOpen === 'open') {
      cargarUsuario();
    }
  }, [isDrawerOpen]);

  const cerrarSesion = async () => {
    await AsyncStorage.clear();
    setShowModal(false);
    router.replace('/login');
  };

  return (
    <LinearGradient colors={['#0140CD', '#0140CD']} style={styles.container}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Image source={require('../assets/logo.png')} style={styles.avatar} />
          <Text style={styles.welcome}>Bienvenido</Text>
          <Text style={styles.username}>{usuario.nombre}</Text>
        </View>

        <View style={styles.divider} />

        {/* Ubicaciones Guardadas solo para clientes */}
        {usuario.rol === 'cliente' && (
          <Pressable
            style={styles.drawerItem}
            onPress={() => router.push('/ubicaciones-guardadas')}
          >
            <Ionicons name="location-outline" size={22} color="#fff" />
            <Text style={styles.drawerText}>Ubicaciones Guardadas</Text>
          </Pressable>
        )}

        {/* Cerrar sesión */}
        <Pressable style={styles.logoutBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="log-out-outline" size={22} color="#0140CD" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
      </DrawerContentScrollView>

      <Modal transparent visible={showModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Ionicons name="alert-circle-outline" size={48} color="#dc3545" />
            <Text style={styles.modalTitle}>¿Cerrar sesión?</Text>
            <Text style={styles.modalMsg}>Perderás el acceso a tu cuenta.</Text>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalConfirm]}
                onPress={cerrarSesion}
              >
                <Text style={styles.modalConfirmText}>Sí, salir</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'space-between' },
  header: { alignItems: 'center', marginTop: 60, marginBottom: 30 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', marginBottom: 12, resizeMode: 'contain' },
  welcome: { fontSize: 16, color: '#ccc', marginBottom: 4 },
  username: { fontSize: 20, fontWeight: '700', color: '#fff' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 20, marginBottom: 20 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, marginBottom: 10 },
  drawerText: { color: '#fff', fontSize: 16, marginLeft: 12 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 2, borderColor: '#0140CD', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center', marginHorizontal: 20, marginVertical: 30, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 6 }, shadowRadius: 10, elevation: 6 },
  logoutText: { color: '#0140CD', fontSize: 16, fontWeight: '600', marginLeft: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '80%', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginTop: 10, color: '#111' },
  modalMsg: { fontSize: 14, color: '#555', marginVertical: 10, textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, alignItems: 'center' },
  modalCancel: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#0140CD' },
  modalCancelText: { color: '#0140CD', fontWeight: '600' },
  modalConfirm: { backgroundColor: '#dc3545' },
  modalConfirmText: { color: '#fff', fontWeight: '600' },
});
