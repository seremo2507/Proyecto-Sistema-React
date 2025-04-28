// app/crear-envio.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Dimensions,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';

type Coordenada = {
  latitude: number;
  longitude: number;
};

type FormularioEnvio = {
  origen: Coordenada;
  destino: Coordenada;
  tipoCarga: string;
  variedad: string;
  peso: string;
  cantidad: string;
  horaSalida: string;
  horaEntrega: string;
  tipoTransporte: string;
  tipoTransportista: string;
};

const pasos = ['Ubicación', 'Carga', 'Horarios', 'Transporte', 'Confirmar'];
const { width: W } = Dimensions.get('window');
const CIRCLE_DIAM = 28;

export default function CrearEnvio() {
  const [pasoActual, setPasoActual] = useState(0);
  const [formulario, setFormulario] = useState<FormularioEnvio>({
    origen: { latitude: 0, longitude: 0 },
    destino: { latitude: 0, longitude: 0 },
    tipoCarga: '',
    variedad: '',
    peso: '',
    cantidad: '',
    horaSalida: '',
    horaEntrega: '',
    tipoTransporte: '',
    tipoTransportista: '',
  });

  // Modal productos
  const [showCargaModal, setShowCargaModal] = useState(false);
  const productos = ['Frutas', 'Verduras', 'Lácteos', 'Cereales'];

  const handleChange = (campo: keyof FormularioEnvio, valor: any) => {
    setFormulario(prev => ({ ...prev, [campo]: valor }));
  };

  const siguientePaso = () => {
    if (pasoActual < pasos.length - 1) setPasoActual(pasoActual + 1);
  };
  const pasoAnterior = () => {
    if (pasoActual > 0) setPasoActual(pasoActual - 1);
  };

  const crearEnvio = () => {
    console.log('Datos de envío:', formulario);
    Alert.alert('¡Éxito!', '¡Envío creado exitosamente!');
  };

  const renderContenido = () => {
    switch (pasoActual) {
      case 0:
        return (
          <>
            <Text style={styles.label}>Origen:</Text>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: -17.7833,
                longitude: -63.1821,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              onPress={e => handleChange('origen', e.nativeEvent.coordinate)}
            >
              <Marker
                coordinate={formulario.origen}
                draggable
                onDragEnd={e => handleChange('origen', e.nativeEvent.coordinate)}
              />
            </MapView>
            <Text style={styles.label}>Destino:</Text>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: -17.7833,
                longitude: -63.1821,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              onPress={e => handleChange('destino', e.nativeEvent.coordinate)}
            >
              <Marker
                coordinate={formulario.destino}
                draggable
                onDragEnd={e => handleChange('destino', e.nativeEvent.coordinate)}
              />
            </MapView>
          </>
        );
      case 1:
        return (
          <>
            <Text style={styles.label}>Tipo de Carga:</Text>
            <Pressable
              style={styles.input}
              onPress={() => setShowCargaModal(true)}
            >
              <Text style={
                formulario.tipoCarga
                  ? styles.inputText
                  : styles.inputPlaceholder
              }>
                {formulario.tipoCarga || 'Selecciona producto'}
              </Text>
            </Pressable>
            <TextInput
              style={styles.input}
              placeholder="Variedad"
              placeholderTextColor="#999"
              value={formulario.variedad}
              onChangeText={t => handleChange('variedad', t)}
            />
            <TextInput
              style={styles.input}
              placeholder="Peso (kg)"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={formulario.peso}
              onChangeText={t => handleChange('peso', t)}
            />
            <TextInput
              style={styles.input}
              placeholder="Cantidad"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={formulario.cantidad}
              onChangeText={t => handleChange('cantidad', t)}
            />

            <Modal
              transparent
              visible={showCargaModal}
              animationType="fade"
              onRequestClose={() => setShowCargaModal(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalBox}>
                  <Text style={styles.modalTitle}>Seleccione producto</Text>
                  {productos.map(item => (
                    <Pressable
                      key={item}
                      style={styles.modalOption}
                      onPress={() => {
                        handleChange('tipoCarga', item);
                        setShowCargaModal(false);
                      }}
                    >
                      <Text style={styles.modalOptionText}>{item}</Text>
                    </Pressable>
                  ))}
                  <Pressable
                    style={styles.modalCancelBtn}
                    onPress={() => setShowCargaModal(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.label}>Hora de Salida:</Text>
            <TextInput
              style={styles.input}
              placeholder="08:00"
              placeholderTextColor="#999"
              value={formulario.horaSalida}
              onChangeText={t => handleChange('horaSalida', t)}
            />
            <Text style={styles.label}>Hora de Entrega:</Text>
            <TextInput
              style={styles.input}
              placeholder="14:00"
              placeholderTextColor="#999"
              value={formulario.horaEntrega}
              onChangeText={t => handleChange('horaEntrega', t)}
            />
          </>
        );
      case 3:
        return (
          <>
            <Text style={styles.label}>Tipo de Transporte:</Text>
            {['Medio','Pesado','Liviano'].map(tipo => (
              <Pressable
                key={tipo}
                style={styles.rowBtn}
                onPress={() => handleChange('tipoTransporte', tipo)}
              >
                <MaterialCommunityIcons
                  name={
                    tipo==='Medio'? 'truck'
                    : tipo==='Pesado'? 'truck-delivery'
                    : 'truck-fast'
                  }
                  size={20}
                  color="#fff"
                />
                <Text style={styles.rowLabel}>{tipo}</Text>
              </Pressable>
            ))}
            <Text style={styles.label}>Tipo de Transportista:</Text>
            {['Propio','Tercero'].map(tp => (
              <Pressable
                key={tp}
                style={styles.rowBtn}
                onPress={() => handleChange('tipoTransportista', tp)}
              >
                <Ionicons
                  name={tp==='Propio'? 'person-outline':'person-circle-outline'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.rowLabel}>{tp}</Text>
              </Pressable>
            ))}
          </>
        );
      case 4:
        return (
          <>
            <Text style={styles.label}>Resumen:</Text>
            {(Object.keys(formulario) as (keyof FormularioEnvio)[]).map(k => (
              <Text key={k} style={styles.resumenItem}>
                {k}: {typeof formulario[k] === 'object'
                  ? JSON.stringify(formulario[k])
                  : formulario[k]}
              </Text>
            ))}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* STEP INDICATOR */}
      <View style={styles.stepper}>
        {pasos.map((_, i) => (
          <React.Fragment key={i}>
            <View style={[
              styles.circle,
              i <= pasoActual && styles.circleActive
            ]}>
              <Text style={[
                styles.circleText,
                i <= pasoActual && styles.circleTextActive
              ]}>{i+1}</Text>
            </View>
            {i < pasos.length - 1 && (
              <View style={[
                styles.line,
                i < pasoActual && styles.lineActive
              ]}/>
            )}
          </React.Fragment>
        ))}
      </View>
      <View style={styles.labels}>
        {pasos.map((lbl, i) => (
          <View key={i} style={styles.labelItem}>
            <Text style={[
              styles.labelText,
              i <= pasoActual && styles.labelTextActive
            ]}>{lbl}</Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {renderContenido()}
      </ScrollView>

      {/* NAV BUTTONS */}
      <View style={styles.nav}>
        {pasoActual > 0 && (
          <Pressable style={styles.navBtn} onPress={pasoAnterior}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.navText}>Atrás</Text>
          </Pressable>
        )}
        {pasoActual < pasos.length-1 ? (
          <Pressable style={styles.navBtn} onPress={siguientePaso}>
            <Text style={styles.navText}>Siguiente</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </Pressable>
        ) : (
          <Pressable style={[styles.navBtn, styles.finishBtn]} onPress={crearEnvio}>
            <Ionicons name="checkmark-done" size={20} color="#fff" />
            <Text style={styles.navText}>Crear Envío</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f2027' },
  scroll: { padding: 20 },

  /* STEP INDICATOR */
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16
  },
  circle: {
    width: CIRCLE_DIAM,
    height: CIRCLE_DIAM,
    borderRadius: CIRCLE_DIAM/2,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center'
  },
  circleActive: { backgroundColor: '#28a745' },
  circleText: { color: '#aaa', fontWeight: '700' },
  circleTextActive: { color: '#fff' },
  line: {
    flex: 1,
    height: 4,
    backgroundColor: '#333',
    marginHorizontal: 4
  },
  lineActive: { backgroundColor: '#28a745' },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 4
  },
  labelItem: { width: CIRCLE_DIAM + (W - 32 - pasos.length*CIRCLE_DIAM)/(pasos.length-1) },
  labelText: { color: '#555', fontSize: 12, textAlign: 'center' },
  labelTextActive: { color: '#fff' },

  /* FORM FIELDS */
  label: { color: '#ccc', marginBottom: 8, fontSize: 14 },
  input: {
    backgroundColor: '#1e2a38',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  inputText: { color: '#fff' },
  inputPlaceholder: { color: '#999' },
  map: {
    width: W - 32,
    height: 140,
    borderRadius: 10,
    marginBottom: 20,
  },
  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a3748',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  rowLabel: { color: '#fff', marginLeft: 10 },

  resumenItem: { color: '#fff', marginBottom: 6 },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#1e2a38',
    borderRadius: 12,
    width: '80%',
    padding: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalOptionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  modalCancelBtn: {
    marginTop: 12,
    backgroundColor: '#dc3545',
    borderRadius: 8,
    paddingVertical: 10,
  },
  modalCancelText: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },

  /* NAV BUTTONS */
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  finishBtn: { backgroundColor: '#007bff' },
  navText: { color: '#fff', fontWeight: '600', marginHorizontal: 6 },
});