import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, MotiText, AnimatePresence } from 'moti';
import { Feather } from '@expo/vector-icons';

export default function LoginScreen() {
  const router = useRouter();
  const { width } = Dimensions.get('window');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({ email: false, password: false });
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Auto-dismiss toasts
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 3000);
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
      setTimeout(() => setShake(false), 500);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('https://api-4g7v.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Credenciales inválidas');
      await AsyncStorage.setItem('token', data.token);
      setSuccess(true);
      setTimeout(() => router.replace('/home'), 1200);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.flex}>
      <LinearGradient colors={['#2c5364', '#0f2027']} style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
          <MotiText from={{ opacity: 0, translateY: -20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'spring', duration: 800 }} style={styles.title}>
            ¡Bienvenido!
          </MotiText>

          {/* Email Field */}
          <MotiView from={{ opacity: 0, translateX: -width }} animate={{ opacity: 1, translateX: 0 }} transition={{ type: 'timing', duration: 800, delay: 200 }} style={styles.inputContainer}>
            <Feather name="mail" size={20} color={focused === 'email' ? '#fff' : '#ccc'} style={styles.icon} />
            <TextInput
              placeholder="Correo electrónico"
              placeholderTextColor="#aaa"
              style={[styles.input, focused === 'email' && styles.inputFocus, touched.email && !isEmailValid && styles.inputError]}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocused('email')}
              onBlur={() => handleBlur('email')}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </MotiView>
          <AnimatePresence>
            {touched.email && !isEmailValid && (
              <MotiView
                from={{ opacity: 0, translateY: -5 }}
                animate={{ opacity: 1, translateY: 0 }}
                exit={{ opacity: 0, translateY: -5 }}
                transition={{ type: 'timing', duration: 300 }}
                style={styles.errorContainer}
              >
                <Feather name="alert-triangle" size={16} color="#ff6b6b" />
                <Text style={styles.errorText}>Ingresa un correo válido</Text>
              </MotiView>
            )}
          </AnimatePresence>

          {/* Password Field */}
          <MotiView from={{ opacity: 0, translateX: width }} animate={{ opacity: 1, translateX: 0 }} transition={{ type: 'timing', duration: 800, delay: 400 }} style={styles.inputContainer}>
            <Feather name="lock" size={20} color={focused === 'password' ? '#fff' : '#ccc'} style={styles.icon} />
            <TextInput
              placeholder="Contraseña"
              placeholderTextColor="#aaa"
              style={[styles.input, focused === 'password' && styles.inputFocus, touched.password && !isPasswordValid && styles.inputError]}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocused('password')}
              onBlur={() => handleBlur('password')}
              secureTextEntry
              editable={!loading}
            />
          </MotiView>
          <AnimatePresence>
            {touched.password && !isPasswordValid && (
              <MotiView
                from={{ opacity: 0, translateY: -5 }}
                animate={{ opacity: 1, translateY: 0 }}
                exit={{ opacity: 0, translateY: -5 }}
                transition={{ type: 'timing', duration: 300 }}
                style={styles.errorContainer}
              >
                <Feather name="alert-triangle" size={16} color="#ff6b6b" />
                <Text style={styles.errorText}>La contraseña debe tener al menos 6 caracteres</Text>
              </MotiView>
            )}
          </AnimatePresence>

          {/* Login Button */}
          <MotiView from={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1, translateX: shake ? [-20, 20, -20, 20, 0] : 0 }} transition={{ type: 'timing', duration: 500 }} style={{ width: '100%' }}>
            <Pressable onPress={handleLogin} disabled={loading} style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }, !isFormValid && touched.email && touched.password && styles.buttonDisabled]}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Iniciar sesión</Text>}
            </Pressable>
          </MotiView>
        </KeyboardAvoidingView>
      </LinearGradient>

      {/* Toasts */}
      <AnimatePresence>
        {success && (
          <MotiView from={{ opacity: 0, translateY: 100 }} animate={{ opacity: 1, translateY: 0 }} exit={{ opacity: 0, translateY: 100 }} transition={{ type: 'timing', duration: 400 }} style={[styles.toast, { backgroundColor: '#d4edda' }]}>
            <Feather name="check-circle" size={20} color="#155724" />
            <Text style={[styles.toastText, { color: '#155724' }]}>Inicio de sesión exitoso</Text>
          </MotiView>
        )}
        {!!error && (
          <MotiView from={{ opacity: 0, translateY: 100 }} animate={{ opacity: 1, translateY: 0 }} exit={{ opacity: 0, translateY: 100 }} transition={{ type: 'timing', duration: 400 }} style={[styles.toast, { backgroundColor: '#f8d7da' }]}>
            <Feather name="x-circle" size={20} color="#721c24" />
            <Text style={[styles.toastText, { color: '#721c24' }]}>{error}</Text>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  inner: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 20 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 12, marginBottom: 12 },
  icon: { marginRight: 8 },
  input: { flex: 1, color: '#fff', height: 48, fontSize: 16 },
  inputFocus: { borderColor: '#fff', borderWidth: 1 },
  inputError: { borderColor: '#ff6b6b', borderWidth: 1 },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
    marginBottom: 12,
  },
  button: { backgroundColor: '#28a745', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  buttonDisabled: { backgroundColor: '#6c757d' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  toast: { position: 'absolute', bottom: 40, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, elevation: 8 },
  toastText: { marginLeft: 8, fontSize: 14, fontWeight: '500' },
});
