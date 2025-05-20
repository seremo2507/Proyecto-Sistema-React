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
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MotiView, AnimatePresence } from 'moti';
import { Easing } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import tw from 'twrnc'; // Importamos twrnc

export default function Login() {
  const router = useRouter();
  const { width } = Dimensions.get('window');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Replay animations on screen focus
  useFocusEffect(
    useCallback(() => {
      setReloadKey(k => k + 1);
    }, [])
  );

  // Auto-dismiss success toast after 2s
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(false), 2000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // Auto-dismiss error toast after 2s
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 2000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const emailRegex = /^[\w-.]+@[\w-]+\.[a-z]{2,}$/i;
  const isEmailValid = emailRegex.test(email);
  const isPasswordValid = password.length >= 6;
  const isFormValid = isEmailValid && isPasswordValid;

  const handleBlur = (field: 'email' | 'password') => {
    setFocused(null);
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleLogin = async () => {
    setTouched({ email: true, password: true });
    if (!isFormValid) {
      setShake(true);
      setTimeout(() => setShake(false), 300);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('https://api-4g7v.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: email.trim(), contrasena: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Credenciales inválidas');
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('usuario', JSON.stringify(data.usuario));
      setSuccess(true);
      setTimeout(() => router.replace('/home'), 2400);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={tw`flex-1 bg-white`}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <MotiView
        key={reloadKey}
        from={{ opacity: 0, translateX: width }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{
          type: 'timing',
          duration: 500,
          easing: Easing.inOut(Easing.cubic),
        }}
        style={tw`flex-1 px-6 pt-32 justify-center`}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw`flex-1`}
        >
          {/* Logo */}
          <MotiView
            from={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: 'spring',
              damping: 15,
              stiffness: 100,
              delay: 100,
            }}
            style={tw`items-center mb-6`}
          >
            <View style={tw`w-36 h-36 rounded-full bg-[#0140CD] justify-center items-center`}>
              <Image source={require('../assets/logo.png')} style={tw`w-24 h-24`} />
            </View>
          </MotiView>

          {/* Title */}
          <MotiView
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: 'timing',
              duration: 400,
              delay: 200,
              easing: Easing.out(Easing.exp),
            }}
          >
            <Text style={tw`text-2xl text-[#0140CD] font-bold text-center mb-6`}>
              ¡Bienvenido!
            </Text>
          </MotiView>

          {/* Email Input */}
          <MotiView
            from={{ opacity: 0, translateX: -width * 0.5 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{
              type: 'timing',
              duration: 400,
              delay: 300,
              easing: Easing.out(Easing.exp),
            }}
            style={tw`flex-row items-center bg-gray-100 rounded-xl px-3 h-12 mb-1 border border-gray-200`}
          >
            <Feather
              name="mail"
              size={20}
              color={focused === 'email' ? '#0140CD' : '#999'}
            />
            <TextInput
              placeholder="Correo electrónico"
              placeholderTextColor="#999"
              style={tw`flex-1 text-gray-800 ml-2 ${focused === 'email' ? 'border border-[#0140CD]' : ''} ${touched.email && !isEmailValid ? 'border border-red-400' : ''}`}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocused('email')}
              onBlur={() => handleBlur('email')}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </MotiView>
          {touched.email && !isEmailValid && (
            <Text style={tw`text-red-500 ml-2 mb-2 text-xs`}>
              Correo inválido
            </Text>
          )}

          {/* Password Input */}
          <MotiView
            from={{ opacity: 0, translateX: width * 0.5 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{
              type: 'timing',
              duration: 400,
              delay: 400,
              easing: Easing.out(Easing.exp),
            }}
            style={tw`flex-row items-center bg-gray-100 rounded-xl px-3 h-12 mb-1 mt-3 border border-gray-200`}
          >
            <Feather
              name="lock"
              size={20}
              color={focused === 'password' ? '#0140CD' : '#999'}
            />
            <TextInput
              placeholder="Contraseña"
              placeholderTextColor="#999"
              secureTextEntry
              style={tw`flex-1 text-gray-800 ml-2 ${focused === 'password' ? 'border border-[#0140CD]' : ''} ${touched.password && !isPasswordValid ? 'border border-red-400' : ''}`}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocused('password')}
              onBlur={() => handleBlur('password')}
              editable={!loading}
            />
          </MotiView>
          {touched.password && !isPasswordValid && (
            <Text style={tw`text-red-500 ml-2 mb-2 text-xs`}>
              La contraseña debe tener al menos 6 caracteres
            </Text>
          )}

          {/* Login Button */}
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: 1,
              translateX: shake ? [-15, 15, -15, 15, 0] : 0,
            }}
            transition={{ type: 'timing', duration: 400 }}
            style={tw`mt-6`}
          >
            <Pressable 
              onPress={handleLogin} 
              disabled={loading} 
              style={({ pressed }) => tw`bg-[#0140CD] border-2 border-[#0140CD] py-3.5 rounded-xl items-center ${pressed ? 'opacity-90' : ''}`}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={tw`text-white text-base font-semibold`}>
                  Iniciar sesión
                </Text>
              )}
            </Pressable>
          </MotiView>

          {/* Register Link */}
          <Pressable 
            onPress={() => router.push('/register')} 
            style={({ pressed }) => tw`mt-5 items-center ${pressed ? 'opacity-70' : ''}`}
          >
            <Text style={tw`text-[#0140CD] underline`}>
              ¿No tienes cuenta? Regístrate
            </Text>
          </Pressable>
        </KeyboardAvoidingView>
      </MotiView>

      {/* Success Toast */}
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
            <Text style={tw`ml-2 text-sm font-medium text-green-800`}>
              Inicio de sesión exitoso
            </Text>
          </MotiView>
        )}
      </AnimatePresence>

      {/* Error Toast */}
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
            <Text style={tw`ml-2 text-sm font-medium text-red-700`}>
              {error}
            </Text>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}