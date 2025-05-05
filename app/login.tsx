import React, { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { Easing } from 'react-native-reanimated';

export default function LoginScreen() {
  const router = useRouter();
  const { width } = Dimensions.get('window');

  // estado de formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // clave de recarga para el <MotiView>
  const [reloadKey, setReloadKey] = useState(0);

  // cuando la pantalla gana foco, incrementamos reloadKey
  useFocusEffect(
    useCallback(() => {
      setReloadKey(k => k + 1);
    }, [])
  );

  // validaciones
  const emailRegex = /^[\w-.]+@[\w-]+\.[a-z]{2,}$/i;
  const isEmailValid = emailRegex.test(email);
  const isPasswordValid = password.length >= 6;
  const isFormValid = isEmailValid && isPasswordValid;

  const handleBlur = (field: 'email' | 'password') => {
    setFocused(null);
    setTouched(p => ({ ...p, [field]: true }));
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
    <LinearGradient colors={['#0140CD', '#0140CD']} style={styles.container}>
      {/* Aquí montamos el MotiView con key=reloadKey */}
      <MotiView
        key={reloadKey}
        from={{ opacity: 0, translateX: width }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{
          type: 'timing',
          duration: 500,
          easing: Easing.inOut(Easing.cubic),
        }}
        style={styles.formWrapper}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inner}
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
            style={styles.logoContainer}
          >
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
            />
          </MotiView>

          {/* Título */}
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
            <Text style={styles.title}>¡Bienvenido!</Text>
          </MotiView>

          {/* Input Correo */}
          <MotiView
            from={{ opacity: 0, translateX: -width * 0.5 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{
              type: 'timing',
              duration: 400,
              delay: 300,
              easing: Easing.out(Easing.exp),
            }}
            style={styles.inputContainer}
          >
            <Feather
              name="mail"
              size={20}
              color={focused === 'email' ? '#fff' : '#ccc'}
            />
            <TextInput
              placeholder="Correo electrónico"
              placeholderTextColor="#aaa"
              style={[
                styles.input,
                focused === 'email' && styles.inputFocus,
                touched.email && !isEmailValid && styles.inputError,
              ]}
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
            <Text style={styles.errorText}>Correo inválido</Text>
          )}

          {/* Input Contraseña */}
          <MotiView
            from={{ opacity: 0, translateX: width * 0.5 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{
              type: 'timing',
              duration: 400,
              delay: 400,
              easing: Easing.out(Easing.exp),
            }}
            style={styles.inputContainer}
          >
            <Feather
              name="lock"
              size={20}
              color={focused === 'password' ? '#fff' : '#ccc'}
            />
            <TextInput
              placeholder="Contraseña"
              placeholderTextColor="#aaa"
              secureTextEntry
              style={[
                styles.input,
                focused === 'password' && styles.inputFocus,
                touched.password && !isPasswordValid && styles.inputError,
              ]}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocused('password')}
              onBlur={() => handleBlur('password')}
              editable={!loading}
            />
          </MotiView>
          {touched.password && !isPasswordValid && (
            <Text style={styles.errorText}>
              La contraseña debe tener al menos 6 caracteres
            </Text>
          )}

          {/* Botón Iniciar Sesión */}
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: 1,
              translateX: shake ? [-15, 15, -15, 15, 0] : 0,
            }}
            transition={{ type: 'timing', duration: 400 }}
            style={styles.buttonWrapper}
          >
            <Pressable onPress={handleLogin} disabled={loading} style={styles.button}>
              {loading ? (
                <ActivityIndicator color="#0140CD" />
              ) : (
                <Text style={styles.buttonText}>Iniciar sesión</Text>
              )}
            </Pressable>
          </MotiView>

          {/* Link a Registro */}
          <Pressable
            onPress={() => router.push('/register')}
            style={styles.registerLink}
          >
            <Text style={styles.registerText}>
              ¿No tienes cuenta? Regístrate
            </Text>
          </Pressable>
        </KeyboardAvoidingView>
      </MotiView>

      {/* Toasts */}
      {success && (
        <MotiView
          from={{ opacity: 0, translateY: 80 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
          style={[styles.toast, { backgroundColor: '#d4edda' }]}
        >
          <Feather name="check-circle" size={20} color="#155724" />
          <Text style={[styles.toastText, { color: '#155724' }]}>
            Inicio de sesión exitoso
          </Text>
        </MotiView>
      )}
      {!!error && (
        <MotiView
          from={{ opacity: 0, translateY: 80 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
          style={[styles.toast, { backgroundColor: '#fdecea' }]}
        >
          <Feather name="x-circle" size={20} color="#dc3545" />
          <Text style={[styles.toastText, { color: '#dc3545' }]}>
            {error}
          </Text>
        </MotiView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0140CD' },
  gradient: { flex: 1 },
  formWrapper: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingTop: 120,      // <— aquí ajustas cuánto lo bajas
    },
  inner: { flex: 1, gap: 16 },
  logoContainer: { alignItems: 'center', marginBottom: 16 },
  logo: { width: 120, height: 120 },
  title: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 4,
  },
  input: { flex: 1, color: '#fff', marginLeft: 8 },
  inputFocus: { borderColor: '#fff', borderWidth: 1 },
  inputError: { borderColor: '#ff6b6b', borderWidth: 1 },
  errorText: { color: '#ff6b6b', marginLeft: 8, marginBottom: 8 },
  buttonWrapper: { marginTop: 12 },
  button: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#0140CD',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#0140CD', fontSize: 16, fontWeight: '600' },
  registerLink: { marginTop: 16, alignItems: 'center' },
  registerText: { color: '#fff', textDecorationLine: 'underline' },
  toast: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  toastText: { marginLeft: 8, fontSize: 14, fontWeight: '500' },
});
