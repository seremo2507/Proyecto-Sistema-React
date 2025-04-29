import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, MotiText } from 'moti';

export default function WelcomeScreen() {
  const router = useRouter();
  const { width, height } = Dimensions.get('window');
  const LOGO_SIZE = width * 0.4;
  const centerY = (height - LOGO_SIZE) / 2;
  const topY = 120;

  // stages: 1 = moving to center, 2 = pause+pulse, 3 = move to top
  const [stage, setStage] = useState(1);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const toStage2 = setTimeout(() => setStage(2), 1000);    // after 1s at center start pulse
    const toStage3 = setTimeout(() => setStage(3), 3000);    // after 3s start move up
    const showTxt = setTimeout(() => setShowContent(true), 4000); // after 4s show text
    return () => {
      clearTimeout(toStage2);
      clearTimeout(toStage3);
      clearTimeout(showTxt);
    };
  }, []);

  return (
    <LinearGradient colors={['#0f2027', '#2c5364']} style={styles.container}>
      <MotiView
        from={{ translateY: height, scale: 1 }}
        animate={{
          translateY: stage < 3 ? centerY : topY,
          // pulse only until content is shown
          scale: showContent ? 1 : stage >= 2 ? 1.2 : 1,
        }}
        transition={{
          translateY: { type: 'timing', duration: 1000 },
          scale: {
            type: 'timing',
            duration: 500,
            loop: !showContent && stage >= 2,
            repeatReverse: true,
          },
        }}
        style={[
          styles.logoContainer,
          {
            width: LOGO_SIZE,
            height: LOGO_SIZE,
            borderRadius: LOGO_SIZE / 2,
            left: (width - LOGO_SIZE) / 2,
          },
        ]}
      >
        <Image
          source={require('../assets/logo.png')}
          style={{ width: LOGO_SIZE * 0.7, height: LOGO_SIZE * 0.7 }}
          resizeMode="contain"
        />
      </MotiView>

      {showContent && (
        <View
          style={{
            position: 'absolute',
            top: topY + LOGO_SIZE + 20,
            width,
            alignItems: 'center',
          }}
        >
          <MotiText
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600, delay: 0 }}
            style={styles.title}
          >
            Bienvenido a OrgaTrack
          </MotiText>

          <MotiText
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600, delay: 600 }}
            style={styles.subtitle}
          >
            Optimiza tu logística en cada envío
          </MotiText>

          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', duration: 600, delay: 1200 }}
          >
            <Pressable
              style={styles.button}
              onPress={() => router.replace('/login')}
            >
              <Text style={styles.buttonText}>Comenzar</Text>
            </Pressable>
          </MotiView>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f2027',
  },
  logoContainer: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ddd',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  button: {
    backgroundColor: '#28a745',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
