import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  Image,
} from 'react-native';
import { DrawerContentScrollView, useDrawerStatus } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import tw from 'twrnc';

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
    <View style={tw`flex-1 bg-white`}>
      <DrawerContentScrollView {...props} contentContainerStyle={tw`flex-grow justify-between`}>
        <View style={tw`items-center mt-14 mb-0`}>
          <View style={tw`w-20 h-20 rounded-full bg-[#0140CD] justify-center items-center mb-3`}>
            <Image source={require('../assets/logo.png')} style={tw`w-16 h-16`} />
          </View>
          <Text style={tw`text-base text-gray-500 mb-1`}>Bienvenido</Text>
          <Text style={tw`text-xl font-bold text-gray-800 mb-0`}>{usuario.nombre}</Text>
        </View>

        {/* Ubicaciones Guardadas solo para clientes - SÚPER SUPERPUESTO */}
        {usuario.rol === 'cliente' && (
          <Pressable
            style={tw`flex-row items-center py-3 px-5 mb-4 -mt-35`}
            onPress={() => router.push('/ubicaciones-guardadas')}
          >
            <Ionicons name="location-outline" size={22} color="#0140CD" />
            <Text style={tw`text-gray-700 text-base ml-3`}>Ubicaciones Guardadas</Text>
          </Pressable>
        )}

        <View style={tw`h-px bg-gray-200 mx-5 mb-5`} />

        {/* Cerrar sesión */}
        <Pressable 
          style={[
            tw`flex-row items-center bg-[#0140CD] py-3.5 px-4 rounded-xl justify-center mx-5 my-8`,
            {
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowOffset: { width: 0, height: 3 },
              shadowRadius: 6,
              elevation: 4
            }
          ]} 
          onPress={() => setShowModal(true)}
        >
          <Ionicons name="log-out-outline" size={22} color="#fff" />
          <Text style={tw`text-white text-base font-semibold ml-2.5`}>Cerrar sesión</Text>
        </Pressable>
      </DrawerContentScrollView>

      <Modal transparent visible={showModal} animationType="fade">
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center`}>
          <View style={tw`bg-white rounded-2xl p-6 w-4/5 items-center`}>
            <Ionicons name="alert-circle-outline" size={48} color="#dc3545" />
            <Text style={tw`text-xl font-bold mt-2.5 text-gray-800`}>¿Cerrar sesión?</Text>
            <Text style={tw`text-sm text-gray-600 my-2.5 text-center`}>Perderás el acceso a tu cuenta.</Text>
            <View style={tw`flex-row gap-3 mt-5`}>
              <Pressable
                style={tw`flex-1 py-2.5 px-4.5 rounded-xl items-center bg-white border-2 border-[#0140CD]`}
                onPress={() => setShowModal(false)}
              >
                <Text style={tw`text-[#0140CD] font-semibold`}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={tw`flex-1 py-2.5 px-4.5 rounded-xl items-center bg-red-600`}
                onPress={cerrarSesion}
              >
                <Text style={tw`text-white font-semibold`}>Sí, salir</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
