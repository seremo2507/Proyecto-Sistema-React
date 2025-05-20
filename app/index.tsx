import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  Pressable,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, MotiText } from 'moti';
import tw from 'twrnc';

export default function WelcomeScreen() {
  const router = useRouter();
  const { width, height } = Dimensions.get('window');
  const LOGO_SIZE = width * 0.4;
  
  // Restauramos los cálculos originales para el logo
  const centerY = (height - LOGO_SIZE) / 2;
  const topY = 200; // Ajustado para que no suba tanto (original: 120)
  
  // Estados para controlar cada fase de la animación
  const [animationStage, setAnimationStage] = useState(1);
  const [showOrgaTrack, setShowOrgaTrack] = useState(false);
  const [textIndex, setTextIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);  // true = escribiendo, false = borrando
  const [showFinalContent, setShowFinalContent] = useState(false);
  
  const orgaTrackText = "OrgaTrack";
  // Definimos explícitamente que el ref puede contener un temporizador o null
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingSpeedWrite = 150; // ms por letra cuando escribe
  const typingSpeedErase = 100; // ms por letra cuando borra

  useEffect(() => {
    // Secuencia de animación principal
    const timeline = {
      stage1: 1000,    // Logo aparece en el centro
      stage2: 3000,    // Logo se desliza a la izquierda
      stage3: 3500,    // Comienza a escribir "OrgaTrack"
      stage4: 6500,    // Logo vuelve al centro y comienza a borrar
      stage5: 9000,    // Logo sube arriba
      stage6: 10000    // Aparece contenido final
    };

    const stage1 = setTimeout(() => setAnimationStage(2), timeline.stage1);
    const stage2 = setTimeout(() => setAnimationStage(3), timeline.stage2);
    const showText = setTimeout(() => setShowOrgaTrack(true), timeline.stage3);
    const stage3 = setTimeout(() => {
      setAnimationStage(4);
      setIsTyping(false); // Cambiar a modo de borrado
      setTextIndex(0); // Reiniciamos el índice para el borrado de izquierda a derecha
    }, timeline.stage4);
    const stage4 = setTimeout(() => setAnimationStage(5), timeline.stage5);
    const showContent = setTimeout(() => setShowFinalContent(true), timeline.stage6);

    return () => {
      clearTimeout(stage1);
      clearTimeout(stage2);
      clearTimeout(showText);
      clearTimeout(stage3);
      clearTimeout(stage4);
      clearTimeout(showContent);
      if (typingRef.current) {
        clearInterval(typingRef.current);
      }
    };
  }, []);

  // Efecto para manejar la animación de escribir/borrar
  useEffect(() => {
    if (showOrgaTrack) {
      const interval = setInterval(() => {
        setTextIndex(prevIndex => {
          // Si estamos escribiendo y no hemos terminado
          if (isTyping && prevIndex < orgaTrackText.length) {
            return prevIndex + 1;
          }
          // Si estamos borrando y no hemos terminado
          else if (!isTyping && prevIndex < orgaTrackText.length) {
            return prevIndex + 1;
          }
          // Si estamos borrando y hemos terminado
          else if (!isTyping && prevIndex >= orgaTrackText.length) {
            setShowOrgaTrack(false);
            if (typingRef.current) {
              clearInterval(typingRef.current);
            }
          }
          return prevIndex;
        });
      }, isTyping ? typingSpeedWrite : typingSpeedErase);
      
      // Guardamos el ID del intervalo en el ref
      typingRef.current = interval;

      return () => {
        if (typingRef.current) {
          clearInterval(typingRef.current);
          typingRef.current = null;
        }
      };
    }
  }, [showOrgaTrack, isTyping]);

  // Determinar la posición X del logo según la etapa de animación
  const getLogoX = () => {
    if (animationStage === 3) {
      return (width / 4) - (LOGO_SIZE / 2); // A la izquierda
    }
    return (width - LOGO_SIZE) / 2; // Centrado
  };

  // Determinar la posición Y del logo según la etapa de animación
  const getLogoY = () => {
    if (animationStage >= 5) {
      return topY; // Arriba
    }
    return centerY; // Centro
  };
  
  // Función para renderizar el texto según el modo (escribiendo o borrando)
  const renderText = () => {
    if (isTyping) {
      // Cuando estamos escribiendo, mostramos desde el principio hasta el índice actual
      return orgaTrackText.substring(0, textIndex);
    } else {
      // Cuando estamos borrando, ocultamos caracteres desde el principio
      return orgaTrackText.substring(textIndex);
    }
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#FFFFFF']} style={tw`flex-1 bg-white`}>
      {/* Logo animado - restaurado como en el original */}
      <MotiView
        from={{ translateY: height, translateX: (width - LOGO_SIZE) / 2 }}
        animate={{ 
          translateY: getLogoY(), 
          translateX: getLogoX() 
        }}
        transition={{ type: 'timing', duration: 1000 }}
        style={[
          tw`absolute justify-center items-center shadow-lg z-10`,
          {
            width: LOGO_SIZE,
            height: LOGO_SIZE,
            borderRadius: LOGO_SIZE / 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 5,
            elevation: 5,
          },
        ]}
      >
        <View style={tw`w-full h-full rounded-full bg-[#0140CD] justify-center items-center`}>
          <Image
            source={require('../assets/logo.png')}
            style={{ width: LOGO_SIZE * 0.7, height: LOGO_SIZE * 0.7 }}
            resizeMode="contain"
            tintColor="#FFFFFF"
          />
        </View>
      </MotiView>

      {/* Texto OrgaTrack que se escribe/borra letra por letra */}
      {showOrgaTrack && (
        <View
          style={{
            position: 'absolute',
            left: animationStage === 3 ? width / 2 : width / 2 + 20,
            top: centerY + (LOGO_SIZE / 4),
            zIndex: 5,
          }}
        >
          <Text style={tw`text-3xl font-bold text-[#0140CD]`}>
            {renderText()}
            <Text style={tw`text-3xl font-bold text-[#0140CD] opacity-70`}>|</Text>
          </Text>
        </View>
      )}

      {/* Contenido final (título, subtítulo y botón) - ahora centrado */}
      {showFinalContent && (
        <View
          style={[
            tw`absolute w-full items-center`,
            {
              top: topY + LOGO_SIZE + 40, // Ajustado para mejor posición con el logo más bajo
            }
          ]}
        >
          <MotiText
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600 }}
            style={tw`text-2xl text-[#0140CD] font-bold mb-2 text-center`}
          >
            Bienvenido a OrgaTrack
          </MotiText>

          <MotiText
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600, delay: 600 }}
            style={tw`text-base text-gray-600 text-center mb-8 px-6 max-w-xs mx-auto`}
          >
            Optimiza tu logística en cada envío
          </MotiText>

          {/* Botón con animación más rápida */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ 
              type: 'timing', 
              duration: 400,
              delay: 900
            }}
            style={tw`overflow-hidden`}
          >
            <Pressable
              style={({ pressed }) => [
                tw`bg-[#0140CD] py-3.5 px-12 rounded-3xl`,
                {
                  opacity: pressed ? 0.9 : 1,
                }
              ]}
              onPress={() => router.replace('/login')}
            >
              <Text style={tw`text-white text-base font-semibold`}>Comenzar</Text>
            </Pressable>
          </MotiView>
        </View>
      )}
    </LinearGradient>
  );
}