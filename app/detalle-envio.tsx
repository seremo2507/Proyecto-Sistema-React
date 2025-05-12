import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Modal,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
  Alert,
} from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { useLocalSearchParams } from 'expo-router';
import Signature, { SignatureViewRef } from 'react-native-signature-canvas';
import { Ionicons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MotiView, AnimatePresence } from 'moti';
import { BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';


/* Habilitar animaciones en Android */
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function DetalleEnvioView() {
  const { id_asignacion } = useLocalSearchParams<{ id_asignacion: string }>();
  const { height } = Dimensions.get('window');

  /* ---------- estados principales ---------- */
  const [envio, setEnvio] = useState<any>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [ruta, setRuta] = useState([]);

  /* Checklists y firma */
  const [conditions, setConditions] = useState<Record<string, boolean>>({});
  const [observaciones, setObservaciones] = useState('');
  const [incidents, setIncidents] = useState<Record<string, boolean>>({});
  const [descripcionIncidente, setDescripcionIncidente] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const sigRef = useRef<SignatureViewRef | null>(null);
  const [showChecklistAlert, setShowChecklistAlert] = useState(false);
  const router = useRouter();



  /* UI */
  const [modalVisible, setModalVisible] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  /* Toasts */
  const [infoMsg, setInfoMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  /* ---------- auto‑dismiss de toasts ---------- */
  useEffect(() => { if (infoMsg)    { const t = setTimeout(() => setInfoMsg(''),    2000); return () => clearTimeout(t); } }, [infoMsg]);
  useEffect(() => { if (successMsg) { const t = setTimeout(() => setSuccessMsg(''), 2000); return () => clearTimeout(t); } }, [successMsg]);
  useEffect(() => { if (errorMsg)   { const t = setTimeout(() => setErrorMsg(''),   2000); return () => clearTimeout(t); } }, [errorMsg]);

  /* ---------- obtener detalles del envío ---------- */
  const fetchDetail = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(
        'https://api-4g7v.onrender.com/api/envios/mis-envios-transportista',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      const found = data.find((e: any) => e.id_asignacion?.toString() === id_asignacion);
      if (!found) throw new Error('No se encontró el envío.');
      setEnvio(found);

      /* región mapa */
      if (found.coordenadas_origen && found.coordenadas_destino) {
        setRegion({
          latitude: found.coordenadas_origen[0],
          longitude: found.coordenadas_origen[1],
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
      if (found.rutaGeoJSON?.coordinates) {
        setRuta(
          found.rutaGeoJSON.coordinates.map((c: any) => ({
            latitude: c[1],
            longitude: c[0],
          }))
        );
      }

      /* inicializar checklists */
      setConditions({
        temperatura_controlada: false,
        embalaje_adecuado: false,
        carga_segura: false,
        vehiculo_limpio: false,
        documentos_presentes: false,
        ruta_conocida: false,
        combustible_completo: false,
        gps_operativo: false,
        comunicacion_funcional: false,
        estado_general_aceptable: false,
      });
      setIncidents({
        retraso: false,
        problema_mecanico: false,
        accidente: false,
        perdida_carga: false,
        condiciones_climaticas_adversas: false,
        ruta_alternativa_usada: false,
        contacto_cliente_dificultoso: false,
        parada_imprevista: false,
        problemas_documentacion: false,
        otros_incidentes: false,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }, [id_asignacion]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);
  
  useFocusEffect(
  useCallback(() => {
    const onBack = () => {
      router.replace('/home');   // navega al Home
      return true;               // ← evita el cierre de la app
    };
    BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBack);
  }, [router])
);


  /* ---------- helpers ---------- */
  const toggleCheck = (setter: any, key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  /* ---------- acciones back‑end ---------- */
  const handleConfirmTrip = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      /* checklist condiciones */
      await fetch(
        `https://api-4g7v.onrender.com/api/envios/${id_asignacion}/checklist-condiciones`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...conditions, observaciones }),
        }
      );
      /* iniciar viaje */
      await fetch(
        `https://api-4g7v.onrender.com/api/envios/iniciar/${id_asignacion}`,
        { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMsg('Viaje confirmado');
      fetchDetail();
      setModalVisible(false);
      setShowChecklist(false);
    } catch {
      setErrorMsg('No se pudo confirmar el viaje');
    }
  };

  const handleFinalize = async () => {
    if (!signatureData) { setInfoMsg('Falta la firma del cliente'); return; }
    try {
      const token = await AsyncStorage.getItem('token');
      /* checklist incidentes */
      await fetch(
        `https://api-4g7v.onrender.com/api/envios/${id_asignacion}/checklist-incidentes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...incidents, descripcion_incidente: descripcionIncidente }),
        }
      );
      /* firma */
      await fetch(
        `https://api-4g7v.onrender.com/api/envios/firma/${id_asignacion}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ imagenFirma: signatureData }),
        }
      );
      /* finalizar */
      await fetch(
        `https://api-4g7v.onrender.com/api/envios/finalizar/${id_asignacion}`,
        { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMsg('Entrega finalizada');
      fetchDetail();
      setModalVisible(false);
    } catch {
      setErrorMsg('No se pudo finalizar la entrega');
    }
  };

  /* ---------- render ---------- */
  if (!region || !envio) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: '#fff' }}>Cargando…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* ---------- MAPA ---------- */}
      <MapView style={{ flex: 1 }} initialRegion={region}>
        <Marker coordinate={{ latitude: envio.coordenadas_origen[0], longitude: envio.coordenadas_origen[1] }} />
        <Marker coordinate={{ latitude: envio.coordenadas_destino[0], longitude: envio.coordenadas_destino[1] }} pinColor="red" />
        {ruta.length > 0 && <Polyline coordinates={ruta} strokeColor="#0140CD" strokeWidth={4} />}
      </MapView>

      {/* ---------- BARRA FLOTANTE ---------- */}
      <TouchableOpacity style={styles.miniInfoBar} onPress={() => setModalVisible(!modalVisible)}>
        <Text style={styles.miniInfoText}>📦 Envío #{envio.id_envio} • {envio.estado_envio}</Text>
        <Ionicons name={modalVisible ? 'chevron-down' : 'chevron-up'} size={24} color="#fff" />
      </TouchableOpacity>

      {/* ---------- TOASTS CENTRALES ---------- */}
      <AnimatePresence>
        {infoMsg !== '' && (
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'timing', duration: 250 }}
            style={[styles.toast, { backgroundColor: '#e8f0fe', top: height * 0.45 - 40 }]}
          >
            <Feather name="info" size={20} color="#0140CD" />
            <Text style={[styles.toastText, { color: '#0140CD' }]}>{infoMsg}</Text>
          </MotiView>
        )}
        {successMsg !== '' && (
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'timing', duration: 250 }}
            style={[styles.toast, { backgroundColor: '#d4edda', top: height * 0.45 - 40 }]}
          >
            <Feather name="check-circle" size={20} color="#155724" />
            <Text style={[styles.toastText, { color: '#155724' }]}>{successMsg}</Text>
          </MotiView>
        )}
        {errorMsg !== '' && (
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'timing', duration: 250 }}
            style={[styles.toast, { backgroundColor: '#fdecea', top: height * 0.45 - 40 }]}
          >
            <Feather name="x-circle" size={20} color="#dc3545" />
            <Text style={[styles.toastText, { color: '#dc3545' }]}>{errorMsg}</Text>
          </MotiView>
        )}
      </AnimatePresence>
      {/* ----------- ALERTA CENTRAL ----------- */}
       <Modal
        transparent
        visible={showChecklistAlert}
        animationType="fade"
        onRequestClose={() => setShowChecklistAlert(false)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            {/* ✅ Icono y título en verde */}
            <Ionicons
              name="alert-circle-outline"
              size={64}
              color="#28a745"          // ← VERDE
              style={{ marginBottom: 12 }}
            />
            <Text style={styles.alertTitleGreen}>¡Atención!</Text>
            <Text style={styles.alertMsg}>
              Completa el checklist de condiciones para iniciar el viaje.
            </Text>

            <Pressable
              style={styles.alertBtn}
              onPress={() => setShowChecklistAlert(false)}
            >
              <Text style={styles.alertBtnText}>Entendido</Text>
            </Pressable>
          </View>
        </View>
      </Modal>



      {/* ---------- MODAL DETALLE ---------- */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* toasts SOLO para el modal */}
          <AnimatePresence>
            {infoMsg !== '' && (
              <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                exit={{ opacity: 0, translateY: 20 }}
                transition={{ type: 'timing', duration: 250 }}
                style={[styles.toastModal, { backgroundColor: '#e8f0fe' }]}
              >
                <Feather name="info" size={20} color="#0140CD" />
                <Text style={[styles.toastText, { color: '#0140CD' }]}>{infoMsg}</Text>
              </MotiView>
            )}
          </AnimatePresence>

            {/* CONTENIDO SCROLL */}
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={styles.title}>📦 Envío Nº {envio.id_envio}</Text>
              <Text style={styles.item}>
                Estado: <Text style={{ color: '#28a745' }}>{envio.estado_envio}</Text>
              </Text>

              <View style={styles.separator} />

              <Text style={styles.item}>🚛 Transporte: {envio.tipo_transporte}</Text>
              <Text style={styles.item}>🌱 Variedad: {envio.cargas?.[0]?.variedad}</Text>
              <Text style={styles.item}>⚖️ Peso: {envio.cargas?.[0]?.peso ?? '—'} kg</Text>
              <Text style={styles.item}>🔢 Cantidad: {envio.cargas?.[0]?.cantidad ?? '—'}</Text>
              <Text style={styles.item}>📍 {envio.nombre_origen} → {envio.nombre_destino}</Text>

              {/* --------- ESTADO ASIGNADO --------- */}
              {envio.estado_envio.toLowerCase() === 'asignado' && (
                !showChecklist ? (
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setShowChecklistAlert(true);          // ← muestra la alerta centrada
                      setShowChecklist(true);               // despliega el checklist                    
                    }}
                  >
                    <Text style={styles.btnText}>Iniciar viaje</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Checklist de condiciones</Text>
                    </View>

                    <TextInput
                      style={styles.input}
                      placeholder="Observaciones"
                      placeholderTextColor="#666"
                      multiline
                      numberOfLines={3}
                      value={observaciones}
                      onChangeText={setObservaciones}
                    />

                    {Object.entries(conditions).map(([k, v]) => (
                      <Pressable key={k} style={styles.row} onPress={() => toggleCheck(setConditions, k)}>
                        <View style={styles.iconBox}>
                          <Ionicons name={v ? 'checkbox' : 'square-outline'} size={24} color={v ? '#0140CD' : '#000'} />
                        </View>
                        <Text style={styles.label}>{k.replace(/_/g, ' ')}</Text>
                      </Pressable>
                    ))}

                    <TouchableOpacity style={styles.button} onPress={handleConfirmTrip}>
                      <Text style={styles.btnText}>Confirmar viaje</Text>
                    </TouchableOpacity>
                  </>
                )
              )}

              {/* --------- ESTADO EN CURSO --------- */}
              {envio.estado_envio.toLowerCase() === 'en curso' && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Checklist de incidentes</Text>
                  </View>

                  <TextInput
                    style={styles.input}
                    placeholder="Descripción del incidente"
                    placeholderTextColor="#666"
                    multiline
                    numberOfLines={3}
                    value={descripcionIncidente}
                    onChangeText={setDescripcionIncidente}
                  />

                  {Object.entries(incidents).map(([k, v]) => (
                    <Pressable key={k} style={styles.row} onPress={() => toggleCheck(setIncidents, k)}>
                      <View style={styles.iconBox}>
                        <Ionicons name={v ? 'checkbox' : 'square-outline'} size={24} color={v ? '#0140CD' : '#000'} />
                      </View>
                      <Text style={styles.label}>{k.replace(/_/g, ' ')}</Text>
                    </Pressable>
                  ))}

                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Firma del cliente</Text>
                  </View>
                  <View style={styles.signatureContainer}>
                    <Signature
                      ref={sigRef}
                      onOK={setSignatureData}
                      descriptionText="Firma aquí"
                      clearText="Limpiar"
                      confirmText="Guardar"
                      webStyle={`
                        .m-signature-pad--footer { background-color: #0f2027; color: white; }
                        .m-signature-pad { border: 1px solid #0140CD; }
                        .m-signature-pad--body { background-color: #fff; }
                      `}
                    />
                  </View>

                  <TouchableOpacity style={styles.button} onPress={handleFinalize}>
                    <Text style={styles.btnText}>Finalizar entrega</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* --------- ESTADO COMPLETADO --------- */}
              {envio.estado_envio.toLowerCase() === 'completado' && (
                <View style={styles.completedContainer}>
                  <Ionicons name="checkmark-circle" size={64} color="#28a745" />
                  <Text style={styles.completedText}>¡Entrega completada con éxito!</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ---------- ESTILOS ---------- */
const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f2027' },

  /* Barra flotante */
  miniInfoBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(1,64,205,0.95)',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 6,
  },
  miniInfoText: { color: '#fff', fontWeight: '600' },

  /* Toasts */
  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  toastText: { marginLeft: 8, fontSize: 14, fontWeight: '500' },

  /* Modal */
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#0140CD',
  },
  modalTitle: { color: '#0140CD', fontSize: 18, fontWeight: '700' },
  modalScroll: { padding: 16, paddingBottom: 40 },

  /* Texto */
  title: { color: '#000', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  item: { color: '#000', fontSize: 16, marginBottom: 10 },
  separator: { height: 1, backgroundColor: '#CCC', marginVertical: 12 },

  /* Secciones */
  sectionHeader: { marginTop: 20, marginBottom: 12 },
  sectionTitle: { color: '#0140CD', fontSize: 18, fontWeight: '600' },

  /* Input */
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#0140CD',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    color: '#000',
    marginBottom: 16,
    fontSize: 16,
    minHeight: 80,
  },

  /* Fila checklist */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  iconBox: { width: 24, alignItems: 'center' },
  label: { color: '#000', marginLeft: 12, textTransform: 'capitalize', fontSize: 16, flexShrink: 1 },

  /* Botones */
  button: {
    backgroundColor: '#0140CD',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  /* Firma */
  signatureContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 10,
  },

  toastModal: {
  position: 'absolute',
  alignSelf: 'center',
  top: 16,
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 12,
  zIndex: 100,
},

alertOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 24,
},
alertBox: {
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: 24,
  width: '100%',
  alignItems: 'center',
},
alertTitle: {
  fontSize: 20,
  fontWeight: '700',
  color: '#dc3545',
  marginBottom: 8,
  textAlign: 'center',
},
alertMsg: {
  fontSize: 16,
  color: '#333',
  textAlign: 'center',
  marginBottom: 20,
},
alertBtn: {
  backgroundColor: '#0140CD',
  paddingVertical: 12,
  paddingHorizontal: 24,
  borderRadius: 12,
},
alertBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
alertTitleGreen: {            // ← NUEVO estilo para título verde
  fontSize: 20,
  fontWeight: '700',
  color: '#28a745',
  marginBottom: 8,
  textAlign: 'center',
},


  /* Finalizado */
  completedContainer: { alignItems: 'center', paddingVertical: 30 },
  completedText: { color: '#000', fontSize: 18, fontWeight: '600', marginTop: 16 },
});
