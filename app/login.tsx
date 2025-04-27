import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const translateY = useSharedValue(0);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardWillShow', () => {
      translateY.value = withTiming(-100, { duration: 300 });
    });
    const hideSub = Keyboard.addListener('keyboardWillHide', () => {
      translateY.value = withTiming(0, { duration: 300 });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const handleLogin = async () => {
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('https://api-4g7v.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correo: correo.trim(),
          contrasena: contrasena.trim(),
        }),
      });

      const data = await res.json();

      if (res.status === 200) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('usuario', JSON.stringify(data.usuario));

        setSuccessMessage(true);
        setTimeout(() => {
          setSuccessMessage(false);
          router.replace('/home');
        }, 1500);
      } else {
        setErrorMessage(data.error || 'Credenciales inválidas');
      }
    } catch (err) {
      setErrorMessage('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Animated.View style={[styles.formWrapper, animatedStyle]}>
        <MotiView
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', duration: 800 }}
          style={styles.form}
        >
          <Image source={require('../assets/logo.png')} style={styles.logo} />
          <Text style={styles.title}>Bienvenido, Inicie Sesión</Text>

          <TextInput
            style={styles.input}
            placeholder="Correo"
            value={correo}
            onChangeText={setCorreo}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor="#777"
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Contraseña"
              value={contrasena}
              onChangeText={setContrasena}
              placeholderTextColor="#777"
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#666" />
            </Pressable>
          </View>

          <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Iniciar Sesión</Text>
            )}
          </Pressable>

          <Text style={styles.helperText}>¿Olvidó su contraseña?</Text>
        </MotiView>
      </Animated.View>

      <AnimatePresence>
        {successMessage && (
          <MotiView
            from={{ opacity: 0, translateY: 100 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: 100 }}
            transition={{ type: 'timing', duration: 500 }}
            style={[styles.toastBox, { backgroundColor: '#d1f3e0' }]}
          >
            <Ionicons name="checkmark-circle" size={24} color="#28a745" />
            <Text style={[styles.toastText, { color: '#28a745' }]}>
              Inicio de sesión correcto
            </Text>
          </MotiView>
        )}

        {errorMessage !== '' && (
          <MotiView
            from={{ opacity: 0, translateY: 100 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: 100 }}
            transition={{ type: 'timing', duration: 500 }}
            style={[styles.toastBox, { backgroundColor: '#fdecea' }]}
          >
            <Ionicons name="close-circle" size={24} color="#dc3545" />
            <Text style={[styles.toastText, { color: '#dc3545' }]}>{errorMessage}</Text>
          </MotiView>
        )}
      </AnimatePresence>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f2027',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  formWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
    alignItems: 'center',
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: 10,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2b3e50',
    marginBottom: 25,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d0d7e2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#f7f9fc',
    color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d0d7e2',
    borderRadius: 10,
    backgroundColor: '#f7f9fc',
    paddingHorizontal: 10,
    marginBottom: 20,
    width: '100%',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#28a745',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 50,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    marginTop: 18,
    fontSize: 14,
    color: '#999',
  },
  toastBox: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
