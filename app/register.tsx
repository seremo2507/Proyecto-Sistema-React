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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, AnimatePresence } from 'moti';
import { Easing } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

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

  return (
    <LinearGradient colors={['#0140CD', '#0140CD']} style={styles.container}>
      {/* Entry form animation */}
      <MotiView
        key={reloadKey}
        from={{ opacity: 0, translateX: width }}
        animate={{ opacity: 1, translateX: 0 }}
        exit={{ opacity: 0, translateX: -width }}
        transition={{ type: 'timing', duration: 500, easing: Easing.inOut(Easing.cubic) }}
        style={styles.formWrapper}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
          {/* Logo pop */}
          <MotiView
            from={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 100, delay: 100 }}
            style={styles.logoContainer}
          >
            <Image source={require('../assets/logo.png')} style={styles.logo} />
          </MotiView>

          {/* Title slide-in */}
          <MotiView
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 200, easing: Easing.out(Easing.exp) }}
          >
            <Text style={styles.title}>Regístrate</Text>
          </MotiView>

          {/* Nombre input */}
          <MotiView
            from={{ opacity: 0, translateX: -width * 0.5 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 300, easing: Easing.out(Easing.exp) }}
            style={[styles.inputContainer, touched.nombre && nombre.trim() === '' && styles.inputError]}
          >
            <Feather name="user" size={20} color={focused === 'nombre' ? '#fff' : '#ccc'} />
            <TextInput
              placeholder="Nombre"
              placeholderTextColor="#aaa"
              style={styles.input}
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
            style={[styles.inputContainer, touched.apellido && apellido.trim() === '' && styles.inputError]}
          >
            <Feather name="user" size={20} color={focused === 'apellido' ? '#fff' : '#ccc'} />
            <TextInput
              placeholder="Apellido"
              placeholderTextColor="#aaa"
              style={styles.input}
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
            style={[styles.inputContainer, touched.correo && !isCorreoValid && styles.inputError]}
          >
            <Feather name="mail" size={20} color={focused === 'correo' ? '#fff' : '#ccc'} />
            <TextInput
              placeholder="Correo electrónico"
              placeholderTextColor="#aaa"
              keyboardType="email-address"
              style={styles.input}
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
            style={[styles.inputContainer, touched.contrasena && !isPasswordValid && styles.inputError]}
          >
            <Feather name="lock" size={20} color={focused === 'contrasena' ? '#fff' : '#ccc'} />
            <TextInput
              placeholder="Contraseña"
              placeholderTextColor="#aaa"
              secureTextEntry
              style={styles.input}
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
            style={styles.buttonWrapper}
          >
            <Pressable onPress={handleRegister} disabled={loading} style={styles.button}>
              {loading ? <ActivityIndicator color="#0140CD" /> : <Text style={styles.buttonText}>Registrarse</Text>}
            </Pressable>
          </MotiView>

          {/* Back to login link */}
          <Pressable onPress={() => router.replace('/login')} style={styles.registerLink}>
            <Text style={styles.registerText}>¿Ya tienes cuenta? Inicia sesión</Text>
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
            style={[styles.toast, { backgroundColor: '#d4edda' }]}
          >
            <Feather name="check-circle" size={20} color="#155724" />
            <Text style={[styles.toastText, { color: '#155724' }]}>Registro exitoso</Text>
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
            style={[styles.toast, { backgroundColor: '#fdecea' }]}
          >
            <Feather name="x-circle" size={20} color="#dc3545" />
            <Text style={[styles.toastText, { color: '#dc3545' }]}>{error}</Text>
          </MotiView>
        )}
      </AnimatePresence>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0140CD' },
  formWrapper: { flex:1, paddingHorizontal:24, paddingTop:80, justifyContent:'center' },
  inner: { flex:1, gap:16 },
  logoContainer: { alignItems:'center', marginBottom:16 },
  logo: { width:100, height:100 },
  title: { fontSize:28, color:'#fff', fontWeight:'700', textAlign:'center', marginBottom:16 },
  inputContainer: { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(255,255,255,0.15)', borderRadius:12, paddingHorizontal:12, height:48, marginBottom:4 },
  input: { flex:1, color:'#fff', marginLeft:8, fontSize:16 },
  inputError: { borderColor:'#ff6b6b', borderWidth:1 },
  buttonWrapper: { marginTop:12 },
  button: { backgroundColor:'#fff', borderWidth:2, borderColor:'#0140CD', paddingVertical:14, borderRadius:12, alignItems:'center' },
  buttonText: { color:'#0140CD', fontSize:16, fontWeight:'600' },
  registerLink: { marginTop:16, alignItems:'center' },
  registerText: { color:'#fff', textDecorationLine:'underline' },
  toast: { position:'absolute', bottom:32, left:24, right:24, flexDirection:'row', alignItems:'center', padding:12, borderRadius:12 },
  toastText: { marginLeft:8, fontSize:14, fontWeight:'500' },
});
