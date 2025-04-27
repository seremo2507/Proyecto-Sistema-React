import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Modal,
    Image,
  } from 'react-native';
  import { DrawerContentScrollView } from '@react-navigation/drawer';
  import { Ionicons } from '@expo/vector-icons';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  import { router } from 'expo-router';
  import { useEffect, useState } from 'react';
  import { LinearGradient } from 'expo-linear-gradient';
  
  export default function CustomDrawer(props: any) {
    const [usuario, setUsuario] = useState('Transportista');
    const [showModal, setShowModal] = useState(false);
  
    useEffect(() => {
      const cargar = async () => {
        const raw = await AsyncStorage.getItem('usuario');
        const parsed = raw ? JSON.parse(raw) : {};
        setUsuario(parsed.nombre || 'Transportista');
      };
      cargar();
    }, []);
  
    const cerrarSesion = async () => {
      await AsyncStorage.clear();
      setShowModal(false);
      router.replace('/login');
    };
  
    return (
      <LinearGradient colors={['#0f2027', '#203a43', '#2c5364']} style={{ flex: 1 }}>
        <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
          <View style={styles.header}>
            <Image source={require('../assets/logo.png')} style={styles.avatar} />
            <Text style={styles.welcome}>Bienvenido</Text>
            <Text style={styles.username}>{usuario}</Text>
          </View>
  
          <View style={styles.divider} />
  
          <Pressable style={styles.logoutBtn} onPress={() => setShowModal(true)}>
            <Ionicons name="log-out-outline" size={22} color="#fff" />
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </Pressable>
        </DrawerContentScrollView>
  
        {/* ✅ Modal personalizado */}
        <Modal transparent visible={showModal} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Ionicons name="alert-circle-outline" size={48} color="#dc3545" />
              <Text style={styles.modalTitle}>¿Cerrar sesión?</Text>
              <Text style={styles.modalMsg}>Perderás el acceso a tu cuenta.</Text>
              <View style={styles.modalActions}>
                <Pressable style={styles.modalCancel} onPress={() => setShowModal(false)}>
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </Pressable>
                <Pressable style={styles.modalConfirm} onPress={cerrarSesion}>
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
    header: {
      alignItems: 'center',
      marginTop: 60,
      marginBottom: 30,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 50,
      backgroundColor: '#fff',
      marginBottom: 12,
      resizeMode: 'contain',
    },
    welcome: {
      fontSize: 16,
      color: '#ccc',
      marginBottom: 4,
    },
    username: {
      fontSize: 20,
      fontWeight: '700',
      color: '#fff',
    },
    divider: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.1)',
      marginHorizontal: 20,
      marginBottom: 20,
    },
    logoutBtn: {
      marginTop: 'auto',
      marginHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: '#dc3545',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      justifyContent: 'center',
    },
    logoutText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalBox: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 24,
      width: '80%',
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginTop: 10,
      color: '#111',
    },
    modalMsg: {
      fontSize: 14,
      color: '#555',
      marginVertical: 10,
      textAlign: 'center',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    modalCancel: {
      backgroundColor: '#ccc',
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 10,
    },
    modalCancelText: {
      color: '#000',
      fontWeight: '600',
    },
    modalConfirm: {
      backgroundColor: '#dc3545',
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 10,
    },
    modalConfirmText: {
      color: '#fff',
      fontWeight: '600',
    },
  });
  