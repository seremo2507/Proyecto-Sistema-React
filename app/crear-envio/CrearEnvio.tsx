import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  Alert, 
  Modal, 
  ActivityIndicator, 
  TextInput, 
  Platform, 
  BackHandler 
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import tw from 'twrnc';

import * as api from './api';
import {
  tiposCarga,
  variedadOptions,
  empaquetadoOptions,
  tiposTransporte,
} from './constants';

type Coordenada = { latitude: number; longitude: number };
type Carga = { 
  tipo: string; 
  variedad: string; 
  empaquetado: string; 
  cantidad: number; 
  peso: number;
};

type Particion = {
  fecha: string;
  horaRecogida: string;
  horaEntrega: string;
  instruccionesRecogida: string;
  instruccionesEntrega: string;
  cargas: Carga[];
  tipoTransporteLabel: string;
  tipoTransporteId: number | null;
};

type FormularioEnvio = {
  origen: Coordenada;
  destino: Coordenada;
  particiones: Particion[];
};

export default function CrearEnvio() {
  const navigation = useNavigation();
  
  // Form state
  const [form, setForm] = useState<FormularioEnvio>({
    origen: { latitude: 0, longitude: 0 },
    destino: { latitude: 0, longitude: 0 },
    particiones: [{
      fecha: '',
      horaRecogida: '',
      horaEntrega: '',
      instruccionesRecogida: '',
      instruccionesEntrega: '',
      cargas: [{ tipo: '', variedad: '', empaquetado: '', cantidad: 0, peso: 0 }],
      tipoTransporteLabel: '',
      tipoTransporteId: null
    }]
  });

  // Labels y errores
  const [origenLabel, setOrigenLabel] = useState('');
  const [destinoLabel, setDestinoLabel] = useState('');
  const [errores, setErrores] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);

  // Data
  const [ubicaciones, setUbicaciones] = useState<any[]>([]);

  // UI flags
  const [showOrigenModal, setShowOrigenModal] = useState(false);
  const [showDestinoModal, setShowDestinoModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerIndex, setDatePickerIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerData, setTimePickerData] = useState<{particionIndex: number, tipo: 'recogida' | 'entrega'}>({particionIndex: 0, tipo: 'recogida'});
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showCargaModal, setShowCargaModal] = useState(false);
  const [cargaModalData, setCargaModalData] = useState<{particionIndex: number, cargaIndex: number, tipo: 'tipo' | 'variedad' | 'empaquetado'}>({particionIndex: 0, cargaIndex: 0, tipo: 'tipo'});
  const [showConfirmacion, setShowConfirmacion] = useState(false);

  // Configurar el manejador del botón de retroceso
  useEffect(() => {
    const backAction = () => {
      const hasChanges = origenLabel || destinoLabel || 
        form.particiones.some(p => 
          p.fecha || p.horaRecogida || p.horaEntrega || 
          p.tipoTransporteLabel || p.instruccionesEntrega || 
          p.instruccionesRecogida ||
          p.cargas.some(c => c.tipo || c.variedad || c.peso || c.cantidad)
        );

      if (hasChanges) {
        Alert.alert(
          '¿Salir sin guardar?',
          'Tienes cambios sin guardar. ¿Seguro que deseas salir?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Sí, salir', onPress: () => {
              resetForm();
              router.replace('../home');
            }}
          ]
        );
        return true;
      } else {
        resetForm();
        router.replace('../home');
        return true;
      }
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [form, origenLabel, destinoLabel]);

  // Fetch ubicaciones
  useEffect(() => {
    api.getUbicaciones()
      .then(data => setUbicaciones(data))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        Alert.alert('Error', msg);
      });
  }, []);

  // Handlers optimizados con useCallback
  const limpiarError = useCallback((campo: string) => {
    setErrores(prev => {
      const nuevos = { ...prev };
      delete nuevos[campo];
      return nuevos;
    });
  }, []);

  const marcarError = useCallback((campo: string, mensaje: string) => {
    setErrores(prev => ({ ...prev, [campo]: mensaje }));
  }, []);

  const updateParticion = useCallback((index: number, field: keyof Particion, value: any) => {
    setForm(f => {
      const particiones = [...f.particiones];
      particiones[index] = { ...particiones[index], [field]: value };
      return { ...f, particiones };
    });
    limpiarError(`particion_${index}_${field}`);
  }, [limpiarError]);

  const updateCarga = useCallback((particionIndex: number, cargaIndex: number, field: keyof Carga, value: any) => {
    setForm(f => {
      const particiones = [...f.particiones];
      const cargas = [...particiones[particionIndex].cargas];
      cargas[cargaIndex] = { ...cargas[cargaIndex], [field]: value };
      particiones[particionIndex] = { ...particiones[particionIndex], cargas };
      return { ...f, particiones };
    });
    limpiarError(`particion_${particionIndex}_carga_${cargaIndex}_${field}`);
  }, [limpiarError]);
  
  const agregarCarga = useCallback((particionIndex: number) => {
    setForm(f => {
      const particiones = [...f.particiones];
      particiones[particionIndex].cargas.push({ tipo: '', variedad: '', empaquetado: '', cantidad: 0, peso: 0 });
      return { ...f, particiones };
    });
  }, []);

  const eliminarCarga = useCallback((particionIndex: number, cargaIndex: number) => {
    setForm(f => {
      const particiones = [...f.particiones];
      if (particiones[particionIndex].cargas.length > 1) {
        particiones[particionIndex].cargas.splice(cargaIndex, 1);
      }
      return { ...f, particiones };
    });
  }, []);

  const agregarParticion = useCallback(() => {
    setForm(f => ({
      ...f,
      particiones: [...f.particiones, {
        fecha: '',
        horaRecogida: '',
        horaEntrega: '',
        instruccionesRecogida: '',
        instruccionesEntrega: '',
        cargas: [{ tipo: '', variedad: '', empaquetado: '', cantidad: 0, peso: 0 }],
        tipoTransporteLabel: '',
        tipoTransporteId: null
      }]
    }));
  }, []);

  const eliminarParticion = useCallback((index: number) => {
    if (form.particiones.length > 1) {
      setForm(f => {
        const particiones = [...f.particiones];
        particiones.splice(index, 1);
        return { ...f, particiones };
      });
    }
  }, [form.particiones.length]);

  const resetForm = () => {
    setForm({
      origen: { latitude: 0, longitude: 0 },
      destino: { latitude: 0, longitude: 0 },
      particiones: [{
        fecha: '',
        horaRecogida: '',
        horaEntrega: '',
        instruccionesRecogida: '',
        instruccionesEntrega: '',
        cargas: [{ tipo: '', variedad: '', empaquetado: '', cantidad: 0, peso: 0 }],
        tipoTransporteLabel: '',
        tipoTransporteId: null
      }]
    });
    setOrigenLabel('');
    setDestinoLabel('');
    setErrores({});
    setShowConfirmacion(false);
  };

  const validarFormulario = () => {
    let esValido = true;
    const nuevosErrores: {[key: string]: string} = {};

    // Validar origen y destino
    if (!origenLabel || !destinoLabel) {
      nuevosErrores.ubicacion = 'Selecciona origen y destino';
      esValido = false;
    }

    // Validar cada partición
    form.particiones.forEach((particion, pIndex) => {
      // Validar fecha
      const fechaHoy = new Date().toISOString().split('T')[0];
      if (!particion.fecha) {
        nuevosErrores[`particion_${pIndex}_fecha`] = 'Selecciona fecha de recogida';
        esValido = false;
      } else if (particion.fecha < fechaHoy) {
        nuevosErrores[`particion_${pIndex}_fecha`] = 'La fecha no puede ser anterior a hoy';
        esValido = false;
      }

      // Validar horas
      if (!particion.horaRecogida) {
        nuevosErrores[`particion_${pIndex}_horaRecogida`] = 'Selecciona hora de recogida';
        esValido = false;
      }
      if (!particion.horaEntrega) {
        nuevosErrores[`particion_${pIndex}_horaEntrega`] = 'Selecciona hora de entrega';
        esValido = false;
      }

      // Validar tipo de transporte
      if (!particion.tipoTransporteId) {
        nuevosErrores[`particion_${pIndex}_transporte`] = 'Selecciona tipo de transporte';
        esValido = false;
      }

      // Validar cargas
      particion.cargas.forEach((carga, cIndex) => {
        if (!carga.tipo) {
          nuevosErrores[`particion_${pIndex}_carga_${cIndex}_tipo`] = 'Selecciona tipo de carga';
          esValido = false;
        }
        if (carga.cantidad <= 0) {
          nuevosErrores[`particion_${pIndex}_carga_${cIndex}_cantidad`] = 'Cantidad debe ser mayor a 0';
          esValido = false;
        }
        if (!carga.empaquetado) {
          nuevosErrores[`particion_${pIndex}_carga_${cIndex}_empaquetado`] = 'Selecciona empaquetado';
          esValido = false;
        }
        if (carga.peso <= 0) {
          nuevosErrores[`particion_${pIndex}_carga_${cIndex}_peso`] = 'Peso debe ser mayor a 0';
          esValido = false;
        }
      });
    });

    setErrores(nuevosErrores);
    return esValido;
  };

  // FUNCIÓN CORREGIDA - Ahora obtiene la ruta antes de crear el envío
  const crearEnvio = async () => {
    if (!validarFormulario()) {
      Alert.alert('Error', 'Por favor corrige los errores marcados');
      return;
    }

    setLoading(true);

    try {
      // 1. Obtener la ruta entre origen y destino
      const origenCoords = `${form.origen.longitude},${form.origen.latitude}`;
      const destinoCoords = `${form.destino.longitude},${form.destino.latitude}`;
      
      console.log('Obteniendo ruta de:', origenCoords, 'a:', destinoCoords);
      
      const ruta = await api.getRuta(origenCoords, destinoCoords);
      
      // 2. Validar que se obtuvo una ruta válida
      if (!ruta.coordinates || ruta.coordinates.length === 0) {
        Alert.alert(
          'Error de Ruta', 
          'No se pudo calcular la ruta entre el origen y destino seleccionados. Verifica que las ubicaciones sean válidas.'
        );
        return;
      }

      console.log(`Ruta obtenida con ${ruta.coordinates.length} puntos`);
      console.log(`Distancia: ${ruta.distance ? (ruta.distance / 1000).toFixed(1) + ' km' : 'No disponible'}`);
      console.log(`Duración estimada: ${ruta.duration ? Math.round(ruta.duration / 60) + ' minutos' : 'No disponible'}`);

      // 3. Crear envíos para cada partición
      for (let i = 0; i < form.particiones.length; i++) {
        const particion = form.particiones[i];
        
        // Mostrar progreso
        if (form.particiones.length > 1) {
          console.log(`Creando partición ${i + 1} de ${form.particiones.length}`);
        }

        const payload = {
          loc: {
            nombreOrigen: origenLabel,
            coordenadasOrigen: [form.origen.latitude, form.origen.longitude],
            nombreDestino: destinoLabel,
            coordenadasDestino: [form.destino.latitude, form.destino.longitude],
            segmentos: ruta.coordinates, // ← AQUÍ SE INCLUYE LA RUTA
            // Metadatos adicionales de la ruta
            ...(ruta.distance && { distancia: ruta.distance }),
            ...(ruta.duration && { duracion: ruta.duration })
          },
          part: {
            id_tipo_transporte: particion.tipoTransporteId,
            recogidaEntrega: {
              fecha_recogida: particion.fecha,
              hora_recogida: particion.horaRecogida,
              hora_entrega: particion.horaEntrega,
              instrucciones_recogida: particion.instruccionesRecogida,
              instrucciones_entrega: particion.instruccionesEntrega
            },
            cargas: particion.cargas.map(carga => ({
              tipo: carga.tipo,
              variedad: carga.variedad,
              empaquetado: carga.empaquetado,
              cantidad: carga.cantidad,
              peso: carga.peso
            }))
          }
        };

        console.log(`Creando envío para partición ${i + 1}:`, payload);
        await api.crearEnvio(payload);
      }

      // 4. Éxito
      console.log('Todos los envíos creados exitosamente');
      setShowConfirmacion(true);

    } catch (e: unknown) {
      console.error("Error al crear el envío:", e);
      
      // Manejo de errores específicos
      let mensaje = 'Error desconocido al crear el envío';
      
      if (e instanceof Error) {
        if (e.message.includes('Google Maps API')) {
          mensaje = 'Error al calcular la ruta. Verifica tu conexión a internet e intenta nuevamente.';
        } else if (e.message.includes('Error ubicacion')) {
          mensaje = 'Error al registrar la ubicación en el servidor.';
        } else if (e.message.includes('Error envío')) {
          mensaje = 'Error al registrar el envío en el servidor.';
        } else {
          mensaje = e.message;
        }
      }
      
      Alert.alert('Error', mensaje);
    } finally {
      setLoading(false);
    }
  };

  // Vista de confirmación
  const VistaConfirmacion = () => (
    <View style={tw`flex-1 justify-center items-center p-6 bg-gray-50`}>
      <View style={tw`bg-white rounded-lg p-8 items-center shadow-lg w-full max-w-sm`}>
        <Ionicons name="checkmark-circle" size={80} color="#10B981" />
        <Text style={tw`text-gray-800 text-2xl font-bold mt-4 mb-2 text-center`}>
          ¡Envío Creado!
        </Text>
        <Text style={tw`text-gray-600 text-lg mb-6 text-center`}>
          Tu envío ha sido registrado exitosamente
        </Text>
        
        <View style={tw`mb-6 w-full`}>
          <Text style={tw`text-gray-700 text-center mb-1`}>
            Recogida en {origenLabel}
          </Text>
          <Text style={tw`text-gray-700 text-center`}>
            Entrega en {destinoLabel}
          </Text>
        </View>
        
        <View style={tw`flex-row w-full`}>
          <Pressable 
            style={tw`bg-gray-100 rounded-lg px-4 py-3 mr-2 flex-1`}
            onPress={() => {
              resetForm();
              router.replace('../home');
            }}
          >
            <Text style={tw`text-gray-700 font-semibold text-center`}>Volver al Inicio</Text>
          </Pressable>
          
          <Pressable 
            style={tw`bg-blue-600 rounded-lg px-4 py-3 ml-2 flex-1`}
            onPress={() => {
              resetForm();
            }}
          >
            <Text style={tw`text-white font-semibold text-center`}>Nuevo Envío</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  if (showConfirmacion) {
    return <VistaConfirmacion />;
  }

  return (
    <View style={tw`flex-1 bg-gray-50 pt-${Platform.OS === 'ios' ? '12' : '8'}`}>
      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
        <View style={tw`p-4`}>
          
          {/* Origen y destino del envío */}
          <View style={tw`bg-white rounded-lg p-4 mb-4 shadow-sm`}>
            <Text style={tw`text-lg font-semibold text-gray-800 mb-4`}>
              Origen y destino del envío
            </Text>
            
            <View style={tw`mb-4`}>
              <Text style={tw`text-gray-700 mb-2`}>Origen</Text>
              <Pressable 
                style={tw`border bg-white border-l-4 border-l-blue-500 rounded-lg p-4 flex-row items-center ${errores.ubicacion ? 'border-red-500' : ''}`}
                onPress={() => {
                  setShowOrigenModal(true);
                  limpiarError('ubicacion');
                }}
              >
                <Ionicons name="location-outline" size={20} color="#9CA3AF" />
                <Text style={tw`${origenLabel ? 'text-gray-800' : 'text-gray-400'} flex-1 ml-3 text-base`}>
                  {origenLabel || 'Seleccionar origen'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
              </Pressable>
            </View>

            <View style={tw`mb-4`}>
              <Text style={tw`text-gray-700 mb-2`}>Destino</Text>
              <Pressable 
                style={tw`border bg-white border-l-4 border-l-blue-500 rounded-lg p-4 flex-row items-center`}
                onPress={() => setShowDestinoModal(true)}
              >
                <Ionicons name="location-outline" size={20} color="#9CA3AF" />
                <Text style={tw`${destinoLabel ? 'text-gray-800' : 'text-gray-400'} flex-1 ml-3 text-base`}>
                  {destinoLabel || 'Seleccionar destino'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
              </Pressable>
            </View>

            <View style={tw`bg-blue-50 p-3 rounded-lg flex-row items-center`}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <Text style={tw`text-blue-700 ml-2 text-sm flex-1`}>
                Añadir punto de recogida o entrega
              </Text>
            </View>
          </View>

          {/* Particiones */}
          {form.particiones.map((particion, pIndex) => (
            <View key={pIndex}>
              {/* Partición de envío */}
              <View style={tw`bg-white rounded-lg p-4 mb-4 shadow-sm`}>
                <Text style={tw`text-lg font-semibold text-gray-800 mb-4`}>
                  Partición de envío
                </Text>
                
                {/* Recogida y entrega */}
                <Text style={tw`text-gray-700 font-medium mb-3`}>Recogida y entrega</Text>
                
                <View style={tw`mb-4`}>
                  <Text style={tw`text-gray-700 mb-2`}>Día</Text>
                  <Pressable 
                    style={tw`border bg-white border-l-4 border-l-blue-500 rounded-lg p-4 flex-row items-center ${errores[`particion_${pIndex}_fecha`] ? 'border-red-500' : ''}`}
                    onPress={() => {
                      setDatePickerIndex(pIndex);
                      setShowDatePicker(true);
                      limpiarError(`particion_${pIndex}_fecha`);
                    }}
                  >
                    <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
                    <Text style={tw`${particion.fecha ? 'text-gray-800' : 'text-gray-400'} flex-1 ml-3 text-base`}>
                      {particion.fecha || 'DD/MM/AAAA'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                  </Pressable>
                </View>

                <View style={tw`flex-row mb-4`}>
                  <View style={tw`flex-1 mr-2`}>
                    <Text style={tw`text-gray-700 mb-2`}>Hora de recogida</Text>
                    <Pressable 
                      style={tw`border bg-white border-l-4 border-l-blue-500 rounded-lg p-4 flex-row items-center ${errores[`particion_${pIndex}_horaRecogida`] ? 'border-red-500' : ''}`}
                      onPress={() => {
                        setTimePickerData({ particionIndex: pIndex, tipo: 'recogida' });
                        setShowTimePicker(true);
                        limpiarError(`particion_${pIndex}_horaRecogida`);
                      }}
                    >
                      <Ionicons name="time-outline" size={20} color="#9CA3AF" />
                      <Text style={tw`${particion.horaRecogida ? 'text-gray-800' : 'text-gray-400'} flex-1 ml-3 text-base`}>
                        {particion.horaRecogida || 'Seleccionar hora'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                    </Pressable>
                  </View>
                  
                  <View style={tw`flex-1 ml-2`}>
                    <Text style={tw`text-gray-700 mb-2`}>Hora de entrega</Text>
                    <Pressable 
                      style={tw`border bg-white border-l-4 border-l-blue-500 rounded-lg p-4 flex-row items-center ${errores[`particion_${pIndex}_horaEntrega`] ? 'border-red-500' : ''}`}
                      onPress={() => {
                        setTimePickerData({ particionIndex: pIndex, tipo: 'entrega' });
                        setShowTimePicker(true);
                        limpiarError(`particion_${pIndex}_horaEntrega`);
                      }}
                    >
                      <Ionicons name="time-outline" size={20} color="#9CA3AF" />
                      <Text style={tw`${particion.horaEntrega ? 'text-gray-800' : 'text-gray-400'} flex-1 ml-3 text-base`}>
                        {particion.horaEntrega || 'Seleccionar hora'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                    </Pressable>
                  </View>
                </View>

                <View style={tw`mb-4`}>
                  <Text style={tw`text-gray-700 mb-2`}>Información (Opcional)</Text>
                  <TextInput
                    style={tw`border border-blue-300 bg-white border-l-4 border-l-blue-500 rounded-lg p-4 text-gray-700 min-h-20`}
                    placeholder="Añadir nota corporativa responsable para el transportista"
                    placeholderTextColor="#9CA3AF"
                    value={particion.instruccionesRecogida}
                    onChangeText={(text) => {
                      setForm(prevForm => {
                        const newParticiones = [...prevForm.particiones];
                        newParticiones[pIndex] = { ...newParticiones[pIndex], instruccionesRecogida: text };
                        return { ...prevForm, particiones: newParticiones };
                      });
                    }}
                    multiline
                    textAlignVertical="top"
                    numberOfLines={3}
                    blurOnSubmit={false}
                    returnKeyType="default"
                  />
                </View>

                <View style={tw`mb-4`}>
                  <Text style={tw`text-gray-700 mb-2`}>Instrucciones de punto de entrega</Text>
                  <TextInput
                    style={tw`border border-gray-300 bg-white border-l-4 border-l-blue-500 rounded-lg p-4 text-gray-700 min-h-20`}
                    placeholder="Añadir instrucciones especiales para la entrega"
                    placeholderTextColor="#9CA3AF"
                    value={particion.instruccionesEntrega}
                    onChangeText={(text) => {
                      setForm(prevForm => {
                        const newParticiones = [...prevForm.particiones];
                        newParticiones[pIndex] = { ...newParticiones[pIndex], instruccionesEntrega: text };
                        return { ...prevForm, particiones: newParticiones };
                      });
                    }}
                    multiline
                    textAlignVertical="top"
                    numberOfLines={3}
                    blurOnSubmit={false}
                    returnKeyType="default"
                  />
                </View>
              </View>

              {/* Detalles de la carga */}
              <View style={tw`bg-white rounded-lg p-4 mb-4 shadow-sm`}>
                <Text style={tw`text-lg font-semibold text-gray-800 mb-4`}>
                  Detalles de la carga
                </Text>
                
                {particion.cargas.map((carga, cIndex) => (
                  <View key={cIndex} style={tw`${cIndex > 0 ? 'mt-4 pt-4 border-t border-gray-200' : ''}`}>
                    <View style={tw`mb-4`}>
                      <Text style={tw`text-gray-700 mb-2`}>Tipo de carga</Text>
                      <Pressable 
                        style={tw`border bg-white border-l-4 border-l-blue-500 rounded-lg p-4 flex-row items-center ${errores[`particion_${pIndex}_carga_${cIndex}_tipo`] ? 'border-red-500' : ''}`}
                        onPress={() => {
                          setCargaModalData({ particionIndex: pIndex, cargaIndex: cIndex, tipo: 'tipo' });
                          setShowCargaModal(true);
                          limpiarError(`particion_${pIndex}_carga_${cIndex}_tipo`);
                        }}
                      >
                        <Ionicons name="layers-outline" size={20} color="#9CA3AF" />
                        <Text style={tw`${carga.tipo ? 'text-gray-800' : 'text-gray-400'} flex-1 ml-3 text-base`}>
                          {carga.tipo || 'Seleccionar tipo de carga'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                      </Pressable>
                    </View>

                    <View style={tw`flex-row mb-4`}>
                      <View style={tw`flex-1 mr-2`}>
                        <Text style={tw`text-gray-700 mb-2`}>Cantidad</Text>
                        <View style={tw`border bg-white border-l-4 border-l-blue-500 rounded-lg flex-row items-center ${errores[`particion_${pIndex}_carga_${cIndex}_cantidad`] ? 'border-red-500' : ''}`}>
                          <Pressable 
                            onPress={() => updateCarga(pIndex, cIndex, 'cantidad', Math.max(0, carga.cantidad - 1))} 
                            style={tw`p-3 bg-gray-100 rounded-lg mx-1`}
                          >
                            <Text style={tw`text-gray-600 text-lg font-bold`}>−</Text>
                          </Pressable>
                          
                          <View style={tw`flex-1 items-center`}>
                            <Text style={tw`text-gray-800 text-lg font-semibold`}>{carga.cantidad}</Text>
                          </View>
                          
                          <Pressable 
                            onPress={() => updateCarga(pIndex, cIndex, 'cantidad', carga.cantidad + 1)} 
                            style={tw`p-3 bg-gray-100 rounded-lg mx-1`}
                          >
                            <Text style={tw`text-gray-600 text-lg font-bold`}>+</Text>
                          </Pressable>
                        </View>
                      </View>
                      
                      <View style={tw`flex-1 ml-2`}>
                        <Text style={tw`text-gray-700 mb-2`}>Empaquetado</Text>
                        <Pressable 
                          style={tw`border bg-white border-l-4 border-l-blue-500 rounded-lg p-4 flex-row items-center ${errores[`particion_${pIndex}_carga_${cIndex}_empaquetado`] ? 'border-red-500' : ''}`}
                          onPress={() => {
                            setCargaModalData({ particionIndex: pIndex, cargaIndex: cIndex, tipo: 'empaquetado' });
                            setShowCargaModal(true);
                            limpiarError(`particion_${pIndex}_carga_${cIndex}_empaquetado`);
                          }}
                        >
                          <Ionicons name="cube-outline" size={20} color="#9CA3AF" />
                          <Text style={tw`${carga.empaquetado ? 'text-gray-800' : 'text-gray-400'} flex-1 ml-3 text-sm`}>
                            {carga.empaquetado || 'Seleccionar empaquetado'}
                          </Text>
                          <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                        </Pressable>
                      </View>
                    </View>

                    <View style={tw`mb-4`}>
                      <Text style={tw`text-gray-700 mb-2`}>Peso</Text>
                      <View style={tw`border bg-white border-l-4 border-l-blue-500 rounded-lg flex-row items-center ${errores[`particion_${pIndex}_carga_${cIndex}_peso`] ? 'border-red-500' : ''}`}>
                        <Pressable 
                          onPress={() => updateCarga(pIndex, cIndex, 'peso', Math.max(0, carga.peso - 1))} 
                          style={tw`p-3 bg-gray-100 rounded-lg mx-1`}
                        >
                          <Text style={tw`text-gray-600 text-lg font-bold`}>−</Text>
                        </Pressable>
                        
                        <View style={tw`flex-1 items-center`}>
                          <Text style={tw`text-gray-800 text-lg font-semibold`}>{carga.peso} kg</Text>
                        </View>
                        
                        <Pressable 
                          onPress={() => updateCarga(pIndex, cIndex, 'peso', carga.peso + 1)} 
                          style={tw`p-3 bg-gray-100 rounded-lg mx-1`}
                        >
                          <Text style={tw`text-gray-600 text-lg font-bold`}>+</Text>
                        </Pressable>
                      </View>
                    </View>

                    {particion.cargas.length > 1 && (
                      <Pressable 
                        style={tw`self-end`}
                        onPress={() => eliminarCarga(pIndex, cIndex)}
                      >
                        <Text style={tw`text-red-500 text-sm`}>Eliminar carga</Text>
                      </Pressable>
                    )}
                  </View>
                ))}
                
                <Pressable 
                  style={tw`bg-blue-50 p-3 rounded-lg flex-row items-center justify-center mt-4`}
                  onPress={() => agregarCarga(pIndex)}
                >
                  <Ionicons name="add" size={20} color="#3B82F6" />
                  <Text style={tw`text-blue-600 font-medium ml-2`}>Añadir otra carga</Text>
                </Pressable>
              </View>

              {/* Selección del tipo de transporte */}
              <View style={tw`bg-white rounded-lg p-4 mb-4 shadow-sm`}>
                <Text style={tw`text-lg font-semibold text-gray-800 mb-4`}>
                  Selección del tipo de transporte
                </Text>
                
                <View style={tw`flex-row justify-between mb-4 ${errores[`particion_${pIndex}_transporte`] ? 'border border-red-500 rounded-lg p-2' : ''}`}>
                  {tiposTransporte.map((tipo) => (
                    <Pressable 
                      key={tipo.id}
                      style={tw`flex-1 items-center p-4 mx-1 rounded-lg ${particion.tipoTransporteId === tipo.id ? 'border-2 border-blue-500' : 'bg-gray-50 border border-gray-300'}`}
                      onPress={() => {
                        updateParticion(pIndex, 'tipoTransporteId', tipo.id);
                        updateParticion(pIndex, 'tipoTransporteLabel', tipo.nombre);
                        limpiarError(`particion_${pIndex}_transporte`);
                      }}
                    >
                      <View style={tw`w-12 h-12 bg-gray-300 rounded-lg mb-2 items-center justify-center`}>
                        <Feather 
                          name="truck" 
                          size={24} 
                          color={particion.tipoTransporteId === tipo.id ? '#3B82F6' : '#9CA3AF'} 
                        />
                      </View>
                      <Text style={tw`${particion.tipoTransporteId === tipo.id ? 'text-blue-600' : 'text-gray-600'} font-medium text-center text-sm`}>
                        {tipo.nombre}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                
                {particion.tipoTransporteLabel && (
                  <Text style={tw`text-gray-600 text-sm text-center`}>
                    {tiposTransporte.find(t => t.id === particion.tipoTransporteId)?.descripcion}
                  </Text>
                )}
              </View>
            </View>
          ))}

          {/* Botón añadir otra partición */}
          <Pressable 
            style={tw`bg-blue-50 p-4 rounded-lg flex-row items-center justify-center mb-4`}
            onPress={agregarParticion}
          >
            <Ionicons name="add" size={20} color="#3B82F6" />
            <Text style={tw`text-blue-600 font-medium ml-2`}>Añadir otra partición de envío</Text>
          </Pressable>

          {/* Botón confirmar envío */}
          <Pressable 
            style={tw`bg-blue-600 p-4 rounded-lg items-center mb-6 ${loading ? 'opacity-50' : ''}`}
            onPress={crearEnvio}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={tw`text-white font-semibold text-lg`}>Confirmar Envío</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {/* Modales */}
      
      {/* Modal Origen */}
      <Modal visible={showOrigenModal} transparent animationType="fade">
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center`}>
          <View style={tw`bg-white rounded-lg w-4/5 p-4 max-h-96`}>
            <Text style={tw`text-lg font-bold mb-4 text-center`}>Seleccionar Origen</Text>
            <ScrollView style={tw`max-h-60`}>
              {ubicaciones.map(u => (
                <Pressable
                  key={u._id}
                  style={tw`p-3 border-b border-gray-200`}
                  onPress={() => {
                    // Establecer origen y destino en una sola operación
                    setForm(f => ({ 
                      ...f, 
                      origen: { 
                        latitude: u.coordenadasOrigen[0], 
                        longitude: u.coordenadasOrigen[1] 
                      },
                      destino: { 
                        latitude: u.coordenadasDestino[0], 
                        longitude: u.coordenadasDestino[1] 
                      }
                    }));
                    
                    setOrigenLabel(u.nombreOrigen);
                    setDestinoLabel(u.nombreDestino);
                    
                    limpiarError('ubicacion');
                    setShowOrigenModal(false);
                  }}
                >
                  <Text style={tw`text-gray-800`}>{u.nombreOrigen}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable 
              style={tw`mt-4 bg-gray-200 rounded-lg p-3`}
              onPress={() => setShowOrigenModal(false)}
            >
              <Text style={tw`text-gray-700 font-medium text-center`}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal Destino */}
      <Modal visible={showDestinoModal} transparent animationType="fade">
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center`}>
          <View style={tw`bg-white rounded-lg w-4/5 p-4 max-h-96`}>
            <Text style={tw`text-lg font-bold mb-4 text-center`}>Seleccionar Destino</Text>
            <ScrollView style={tw`max-h-60`}>
              {ubicaciones.map(u => (
                <Pressable
                  key={u._id}
                  style={tw`p-3 border-b border-gray-200`}
                  onPress={() => {
                    setForm(f => ({ ...f, destino: { latitude: u.coordenadasDestino[0], longitude: u.coordenadasDestino[1] } }));
                    setDestinoLabel(u.nombreDestino);
                    setShowDestinoModal(false);
                  }}
                >
                  <Text style={tw`text-gray-800`}>{u.nombreDestino}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable 
              style={tw`mt-4 bg-gray-200 rounded-lg p-3`}
              onPress={() => setShowDestinoModal(false)}
            >
              <Text style={tw`text-gray-700 font-medium text-center`}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal de Selección de Carga */}
      <Modal visible={showCargaModal} transparent animationType="fade">
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center`}>
          <View style={tw`bg-white rounded-lg w-4/5 p-4 max-h-96`}>
            <Text style={tw`text-lg font-bold mb-4 text-center`}>
              Seleccionar {cargaModalData.tipo === 'tipo' ? 'Tipo de Carga' : 
                          cargaModalData.tipo === 'variedad' ? 'Variedad' : 'Empaquetado'}
            </Text>
            <ScrollView style={tw`max-h-60`}>
              {(cargaModalData.tipo === 'tipo' ? tiposCarga : 
                cargaModalData.tipo === 'variedad' ? variedadOptions : empaquetadoOptions
               ).map((opcion, idx) => (
                <Pressable
                  key={idx}
                  style={tw`p-3 border-b border-gray-200`}
                  onPress={() => {
                    updateCarga(cargaModalData.particionIndex, cargaModalData.cargaIndex, cargaModalData.tipo, opcion);
                    setShowCargaModal(false);
                  }}
                >
                  <Text style={tw`text-gray-800`}>{opcion}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable 
              style={tw`mt-4 bg-gray-200 rounded-lg p-3`}
              onPress={() => setShowCargaModal(false)}
            >
              <Text style={tw`text-gray-700 font-medium text-center`}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(_, date) => {
            setShowDatePicker(false);
            if (date) {
              updateParticion(datePickerIndex, 'fecha', date.toISOString().slice(0, 10));
            }
          }}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          display="default"
          is24Hour
          onChange={(_, time) => {
            setShowTimePicker(false);
            if (time) {
              const hh = time.getHours().toString().padStart(2, '0');
              const mm = time.getMinutes().toString().padStart(2, '0');
              updateParticion(
                timePickerData.particionIndex, 
                timePickerData.tipo === 'recogida' ? 'horaRecogida' : 'horaEntrega', 
                `${hh}:${mm}`
              );
            }
          }}
        />
      )}
    </View>
  );
}
