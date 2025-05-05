import React, { useState, useEffect, useCallback } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, AnimatePresence } from 'moti';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

export default function RegisterScreen() {
  const router = useRouter();
  const { width } = Dimensions.get('window');

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [focused, setFocused] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({ nombre: false, apellido: false, correo: false, contrasena: false });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(true);

  useFocusEffect(
    useCallback(() => { setShowForm(true); }, [])
  );

  // On registration success: slide form out then navigate
  useEffect(() => {
    if (success) {
      // trigger exit animation
      setShowForm(false);
      // navigate after exit (~800ms)
      const nav = setTimeout(() => router.replace('/login'), 800);
      return () => clearTimeout(nav);
    }
  }, [success]);

  // Auto-dismiss error
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 3000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const emailRegex = /^[\w-.]+@[\w-]+\.[a-z]{2,}$/i;
  const isCorreoValid = emailRegex.test(correo);
  const isPasswordValid = contrasena.length >= 5;
  const isFormValid = nombre.trim() && apellido.trim() && isCorreoValid && isPasswordValid;

  const handleBlur = (field: string) => {
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
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AnimatePresence>
        {showForm && (
          <MotiView
            from={{ opacity: 0, translateX: width }}
            animate={{ opacity: 1, translateX: 0 }}
            exit={{ opacity: 0, translateX: -width }}
            transition={{ type: 'timing', duration: 800 }}
            style={{ flex: 1 }}
          >
            <LinearGradient colors={['#0140CD', '#0140CD']} style={styles.gradient}>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
                <MotiView
                  from={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', duration: 800, delay: 100 }}
                  style={styles.logoContainer}
                >
                  <Image source={require('../assets/logo.png')} style={styles.logo} />
                </MotiView>
                <Text style={styles.title}>Regístrate</Text>

                {/* Nombre */}
                <View style={[styles.inputContainer, touched.nombre && !nombre.trim() && styles.inputError]}>
                  <Feather name="user" size={20} color={focused === 'nombre' ? '#fff' : '#ccc'} style={styles.icon} />
                  <TextInput
                    value={nombre}
                    onChangeText={setNombre}
                    placeholder="Nombre"
                    placeholderTextColor="#aaa"
                    style={styles.input}
                    onFocus={() => setFocused('nombre')}
                    onBlur={() => handleBlur('nombre')}
                    editable={!loading}
                  />
                </View>

                {/* Apellido */}
                <View style={[styles.inputContainer, touched.apellido && !apellido.trim() && styles.inputError]}>
                  <Feather name="user" size={20} color={focused === 'apellido' ? '#fff' : '#ccc'} style={styles.icon} />
                  <TextInput
                    value={apellido}
                    onChangeText={setApellido}
                    placeholder="Apellido"
                    placeholderTextColor="#aaa"
                    style={styles.input}
                    onFocus={() => setFocused('apellido')}
                    onBlur={() => handleBlur('apellido')}
                    editable={!loading}
                  />
                </View>

                {/* Correo */}
                <View style={[styles.inputContainer, touched.correo && !isCorreoValid && styles.inputError]}>
                  <Feather name="mail" size={20} color={focused === 'correo' ? '#fff' : '#ccc'} style={styles.icon} />
                  <TextInput
                    value={correo}
                    onChangeText={setCorreo}
                    placeholder="Correo electrónico"
                    placeholderTextColor="#aaa"
                    keyboardType="email-address"
                    style={styles.input}
                    onFocus={() => setFocused('correo')}
                    onBlur={() => handleBlur('correo')}
                    editable={!loading}
                  />
                </View>

                {/* Contraseña */}
                <View style={[styles.inputContainer, touched.contrasena && !isPasswordValid && styles.inputError]}>
                  <Feather name="lock" size={20} color={focused === 'contrasena' ? '#fff' : '#ccc'} style={styles.icon} />
                  <TextInput
                    value={contrasena}
                    onChangeText={setContrasena}
                    placeholder="Contraseña"
                    placeholderTextColor="#aaa"
                    secureTextEntry
                    style={styles.input}
                    onFocus={() => setFocused('contrasena')}
                    onBlur={() => handleBlur('contrasena')}
                    editable={!loading}
                  />
                </View>

                {error ? <Text style={styles.errorMsg}>{error}</Text> : null}

                <Pressable onPress={handleRegister} disabled={loading} style={styles.button}>
                  {loading ? <ActivityIndicator color="#0140CD" /> : <Text style={styles.buttonText}>Registrarse</Text>}
                </Pressable>

                <Pressable onPress={() => router.replace('/login')} style={styles.registerLink}>
                  <Text style={styles.registerText}>¿Ya tienes cuenta? Inicia sesión</Text>
                </Pressable>
              </KeyboardAvoidingView>
            </LinearGradient>
          </MotiView>
        )}
      </AnimatePresence>

      {success && (
        <MotiView
          from={{ opacity: 0, translateY: 100 }}
          animate={{ opacity: 1, translateY: 0 }}
          exit={{ opacity: 0, translateY: 100 }}
          transition={{ type: 'timing', duration: 400 }}
          style={[styles.toast, { backgroundColor: '#d1f3e0' }]}
        >
          <Feather name="check-circle" size={20} color="#155724" />
          <Text style={[styles.toastText, { color: '#155724' }]}>Registro exitoso</Text>
        </MotiView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0140CD' },
  gradient: { flex: 1 },
  inner: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  logoContainer: { alignItems: 'center', marginBottom: 16 },
  logo: { width: 120, height: 120 },
  title: { fontSize: 28, color: '#fff', fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 12, marginBottom: 12 },
  icon: { marginRight: 8 },
  input: { flex: 1, color: '#fff', height: 48, fontSize: 16 },
  inputFocus: { borderColor: '#fff', borderWidth: 1 },
  inputError: { borderColor: '#ff6b6b', borderWidth: 1 },
  errorMsg: { color: '#ff6b6b', textAlign: 'center', marginBottom: 8 },
  button: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#0140CD', paddingVertical: 14, paddingHorizontal: 48, borderRadius: 12, alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 6 }, shadowRadius: 10, elevation: 6 },
  buttonText: { color: '#0140CD', fontSize: 16, fontWeight: '600' },
  registerLink: { marginTop: 16, alignItems: 'center' },
  registerText: { color: '#fff', textDecorationLine: 'underline' },
  toast: { position: 'absolute', bottom: 40, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, elevation: 8 },
  toastText: { marginLeft: 8, fontSize: 14, fontWeight: '500' },
});
