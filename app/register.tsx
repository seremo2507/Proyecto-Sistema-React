import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MotiView, AnimatePresence } from 'moti';
import { Easing } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import tw from 'twrnc';

export default function RegisterScreen() {
  const router = useRouter();
  const { width } = Dimensions.get('window');

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [focused, setFocused] = useState<'nombre'|'apellido'|'correo'|'contrasena'|null>(null);
  const [touched, setTouched] = useState({
    nombre: false,
    apellido: false,
    correo: false,
    contrasena: false,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Replay entry animations on focus
  useFocusEffect(
    useCallback(() => {
      setReloadKey(k => k + 1);
    }, [])
  );

  // Auto-dismiss toasts after 2s
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(false), 2000);
      return () => clearTimeout(t);
    }
  }, [success]);
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 2000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const emailRegex = /^[\w.-]+@[\w-]+\.[a-z]{2,}$/i;
  const isCorreoValid = emailRegex.test(correo);
  const isPasswordValid = contrasena.length >= 6;
  const isFormValid =
    nombre.trim() !== '' &&
    apellido.trim() !== '' &&
    isCorreoValid &&
    isPasswordValid;

  const handleBlur = (field: keyof typeof touched) => {
    setFocused(null);
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleRegister = async () => {
    setTouched({ nombre: true, apellido: true, correo: true, contrasena: true });
    if (!isFormValid) return;
    setLoading(true);
    try {
      const res = await fetch('https://api-4g7v.onrender.com/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), apellido: apellido.trim(), correo: correo.trim(), contrasena }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error en registro');
      setSuccess(true);
      setTimeout(() => router.replace('/login'), 2400);
    } catch (e: any) {
      setError(e.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Obtener las clases de estilo para inputs basadas en el estado
  const getInputStyles = (field: keyof typeof touched) => {
    const baseStyles = tw`flex-1 text-gray-800 ml-2 text-base`;
    if (focused === field) {
      return [baseStyles, tw`border border-[#0140CD]`];
    }
    if (touched[field]) {
      if (
        (field === 'nombre' && nombre.trim() === '') ||
        (field === 'apellido' && apellido.trim() === '') ||
        (field === 'correo' && !isCorreoValid) ||
        (field === 'contrasena' && !isPasswordValid)
      ) {
        return [baseStyles, tw`border border-red-400`];
      }
    }
    return baseStyles;
  };

  return (
    <View style={tw`flex-1 bg-white`}>
      {/* Entry form animation */}
      <MotiView
        key={reloadKey}
        from={{ opacity: 0, translateX: width }}
        animate={{ opacity: 1, translateX: 0 }}
        exit={{ opacity: 0, translateX: -width }}
        transition={{ type: 'timing', duration: 500, easing: Easing.inOut(Easing.cubic) }}
        style={tw`flex-1 px-6 pt-20 justify-center`}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={tw`flex-1 gap-4`}>
          {/* Logo pop */}
          <MotiView
            from={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 100, delay: 100 }}
            style={tw`items-center mb-4`}
          >
            <View style={tw`w-28 h-28 rounded-full bg-[#0140CD] justify-center items-center`}>
              <Image source={require('../assets/logo.png')} style={tw`w-20 h-20`} />
            </View>
          </MotiView>

          {/* Title slide-in */}
          <MotiView
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 200, easing: Easing.out(Easing.exp) }}
          >
            <Text style={tw`text-2xl text-[#0140CD] font-bold text-center mb-4`}>Regístrate</Text>
          </MotiView>

          {/* Nombre input */}
          <MotiView
            from={{ opacity: 0, translateX: -width * 0.5 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 300, easing: Easing.out(Easing.exp) }}
            style={tw`flex-row items-center bg-gray-100 rounded-xl px-3 h-12 mb-1 border border-gray-200 ${touched.nombre && nombre.trim() === '' ? 'border-red-400' : ''}`}
          >
            <Feather
              name="user"
              size={20}
              color={focused === 'nombre' ? '#0140CD' : '#999'}
            />
            <TextInput
              placeholder="Nombre"
              placeholderTextColor="#999"
              style={getInputStyles('nombre')}
              value={nombre}
              onChangeText={setNombre}
              onFocus={() => setFocused('nombre')}
              onBlur={() => handleBlur('nombre')}
              editable={!loading}
            />
          </MotiView>

          {/* Apellido input */}
          <MotiView
            from={{ opacity: 0, translateX: width * 0.5 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 400, easing: Easing.out(Easing.exp) }}
            style={tw`flex-row items-center bg-gray-100 rounded-xl px-3 h-12 mb-1 border border-gray-200 ${touched.apellido && apellido.trim() === '' ? 'border-red-400' : ''}`}
          >
            <Feather
              name="user"
              size={20}
              color={focused === 'apellido' ? '#0140CD' : '#999'}
            />
            <TextInput
              placeholder="Apellido"
              placeholderTextColor="#999"
              style={getInputStyles('apellido')}
              value={apellido}
              onChangeText={setApellido}
              onFocus={() => setFocused('apellido')}
              onBlur={() => handleBlur('apellido')}
              editable={!loading}
            />
          </MotiView>

          {/* Correo input */}
          <MotiView
            from={{ opacity: 0, translateX: -width * 0.5 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 500, easing: Easing.out(Easing.exp) }}
            style={tw`flex-row items-center bg-gray-100 rounded-xl px-3 h-12 mb-1 border border-gray-200 ${touched.correo && !isCorreoValid ? 'border-red-400' : ''}`}
          >
            <Feather
              name="mail"
              size={20}
              color={focused === 'correo' ? '#0140CD' : '#999'}
            />
            <TextInput
              placeholder="Correo electrónico"
              placeholderTextColor="#999"
              keyboardType="email-address"
              style={getInputStyles('correo')}
              value={correo}
              onChangeText={setCorreo}
              onFocus={() => setFocused('correo')}
              onBlur={() => handleBlur('correo')}
              editable={!loading}
            />
          </MotiView>

          {/* Contraseña input */}
          <MotiView
            from={{ opacity: 0, translateX: width * 0.5 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 600, easing: Easing.out(Easing.exp) }}
            style={tw`flex-row items-center bg-gray-100 rounded-xl px-3 h-12 mb-1 border border-gray-200 ${touched.contrasena && !isPasswordValid ? 'border-red-400' : ''}`}
          >
            <Feather
              name="lock"
              size={20}
              color={focused === 'contrasena' ? '#0140CD' : '#999'}
            />
            <TextInput
              placeholder="Contraseña"
              placeholderTextColor="#999"
              secureTextEntry
              style={getInputStyles('contrasena')}
              value={contrasena}
              onChangeText={setContrasena}
              onFocus={() => setFocused('contrasena')}
              onBlur={() => handleBlur('contrasena')}
              editable={!loading}
            />
          </MotiView>

          {/* Register button */}
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 400, delay: 700 }}
            style={tw`mt-3`}
          >
            <Pressable
              onPress={handleRegister}
              disabled={loading}
              style={({ pressed }) => tw`bg-[#0140CD] border-2 border-[#0140CD] py-3.5 rounded-xl items-center ${pressed ? 'opacity-90' : ''}`}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={tw`text-white text-base font-semibold`}>Registrarse</Text>
              )}
            </Pressable>
          </MotiView>

          {/* Back to login link */}
          <Pressable
            onPress={() => router.replace('/login')}
            style={({ pressed }) => tw`mt-4 items-center ${pressed ? 'opacity-70' : ''}`}
          >
            <Text style={tw`text-[#0140CD] underline`}>¿Ya tienes cuenta? Inicia sesión</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </MotiView>

      {/* Toasts */}
      <AnimatePresence>
        {success && (
          <MotiView
            from={{ opacity: 0, translateY: 80 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: 80 }}
            transition={{ type: 'timing', duration: 300 }}
            style={tw`absolute bottom-8 left-6 right-6 flex-row items-center p-3 rounded-xl bg-green-100`}
          >
            <Feather name="check-circle" size={20} color="#155724" />
            <Text style={tw`ml-2 text-sm font-medium text-green-800`}>Registro exitoso</Text>
          </MotiView>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {!!error && (
          <MotiView
            from={{ opacity: 0, translateY: 80 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: 80 }}
            transition={{ type: 'timing', duration: 300 }}
            style={tw`absolute bottom-8 left-6 right-6 flex-row items-center p-3 rounded-xl bg-red-100`}
          >
            <Feather name="x-circle" size={20} color="#dc3545" />
            <Text style={tw`ml-2 text-sm font-medium text-red-700`}>{error}</Text>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}