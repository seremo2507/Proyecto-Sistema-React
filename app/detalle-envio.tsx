// app/detalle-envio.tsx

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Signature, { SignatureViewRef } from 'react-native-signature-canvas';

export const unstable_settings = {
  drawer: { gestureEnabled: false },
};

export default function DetalleEnvioView() {
  const { id_asignacion, refresh } = useLocalSearchParams<{
    id_asignacion: string;
    refresh?: string;
  }>();
  const router = useRouter();

  // Estados principales
  const [envio, setEnvio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mapa
  const [region, setRegion] = useState<Region | null>(null);
  const [ruta, setRuta] = useState<{ latitude: number; longitude: number }[]>([]);

  // Checklists y firma
  const [conditions, setConditions] = useState<Record<string, boolean>>({
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
  const [observaciones, setObservaciones] = useState('');
  const [incidents, setIncidents] = useState<Record<string, boolean>>({
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
  const [descripcionIncidente, setDescripcionIncidente] = useState('');
  const [signatureData, setSignatureData] = useState<string>('');
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const sigRef = useRef<SignatureViewRef | null>(null);

  const toggleCondition = (key: string) =>
    setConditions((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleIncident = (key: string) =>
    setIncidents((prev) => ({ ...prev, [key]: !prev[key] }));

  // Obtener detalle del envío
  const fetchDetail = async () => {
    if (!id_asignacion) return;
    console.log('🔢 id_asignacion:', id_asignacion);
    setLoading(true);
    setRefreshing(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(
        'https://api-4g7v.onrender.com/api/envios/mis-envios-transportista',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const list = await res.json();
      const found = (list as any[]).find(
        (e) => e.id_asignacion?.toString() === id_asignacion
      );
      if (!found) throw new Error('No se encontró la asignación');
      setEnvio(found);

      // Inicializar mapa
      const o = found.coordenadas_origen;
      const d = found.coordenadas_destino;
      if (Array.isArray(o) && Array.isArray(d)) {
        setRegion({
          latitude: o[0],
          longitude: o[1],
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
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id_asignacion, refresh]);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        router.replace('/home');
        return true;
      };
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () =>
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [])
  );

  // Confirmar viaje: checklist condiciones
  const handleConfirmTrip = async () => {
    if (!Object.values(conditions).every(Boolean)) {
      setShowMissingModal(true);
      return;
    }
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const resChk = await fetch(
        `https://api-4g7v.onrender.com/api/envios/${id_asignacion}/checklist-condiciones`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...conditions, observaciones }),
        }
      );
      if (!resChk.ok) throw new Error('Error guardando condiciones');
      const resStart = await fetch(
        `https://api-4g7v.onrender.com/api/envios/iniciar/${id_asignacion}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!resStart.ok) throw new Error('Error iniciando viaje');
      setEnvio((prev: any) => ({ ...prev, estado_envio: 'En curso' }));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Finalizar entrega: checklist incidentes → firma → finalizar
  const handleFinalize = async () => {
    // Validaciones
    if (!Object.values(incidents).every(Boolean)) {
      Alert.alert('Error', 'Completa el checklist de incidentes.');
      return;
    }
    if (!descripcionIncidente.trim()) {
      Alert.alert('Error', 'Agrega descripción del incidente.');
      return;
    }
    if (!signatureData) {
      Alert.alert(
        'Error',
        'Debes capturar la firma del cliente antes de finalizar el viaje.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');

      // 1) Registrar checklist incidentes
      const resInc = await fetch(
        `https://api-4g7v.onrender.com/api/envios/${id_asignacion}/checklist-incidentes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...incidents,
            descripcion_incidente: descripcionIncidente,
          }),
        }
      );
      if (!resInc.ok) {
        const b = await resInc.json().catch(() => ({}));
        if (
          resInc.status === 400 &&
          (b.error || '').toLowerCase().includes('ya fue registrado')
        ) {
          console.warn('⚠️ Checklist de incidentes ya registrado, continuando...');
        } else {
          throw new Error(
            `Error incidentes (${resInc.status}): ${b.error || JSON.stringify(b)}`
          );
        }
      }

      // 2) Enviar firma usando id_asignacion
      console.log('🆔 id_asignacion para firma:', id_asignacion);
      const resFirma = await fetch(
        `https://api-4g7v.onrender.com/api/envios/firma/${id_asignacion}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ imagenFirma: signatureData }),
        }
      );
      const bFirma = await resFirma.json().catch(() => ({}));
      console.log('📥 Firma response:', resFirma.status, bFirma);
      if (!resFirma.ok) {
        throw new Error(`Error firma (${resFirma.status}): ${bFirma.error || JSON.stringify(bFirma)}`);
      }

      // 3) Finalizar envío
      const resFin = await fetch(
        `https://api-4g7v.onrender.com/api/envios/finalizar/${id_asignacion}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!resFin.ok) {
        const b = await resFin.json().catch(() => ({}));
        throw new Error(
          `Error finalizando envío (${resFin.status}): ${b.error || JSON.stringify(b)}`
        );
      }

      setEnvio((prev: any) => ({ ...prev, estado_envio: 'Entregado' }));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Cargando / no envío
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }
  if (!envio) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: '#fff' }}>Envío no encontrado.</Text>
      </View>
    );
  }

  // UI principal
  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={fetchDetail} tintColor="#28a745" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.replace('/home')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <View>
          <Text style={styles.title}>Envío N.º {envio.id_envio}</Text>
          <Text style={styles.subtitle}>Asignación N.º {id_asignacion}</Text>
        </View>
      </View>

      {/* Detalles del envío */}
      <View style={styles.card}>
        <Text style={styles.item}>📦 Producto: {envio.cargas?.[0]?.tipo || '—'}</Text>
        <Text style={styles.item}>🚛 Transporte: {envio.tipo_transporte}</Text>
        <Text style={styles.item}>📋 Estado: {envio.estado_envio}</Text>
        <Text style={styles.item}>
          📅 Recogida: {envio.recogidaEntrega?.fecha_recogida?.split('T')[0] || '—'}
        </Text>
        <Text style={styles.item}>
          🕒 {envio.recogidaEntrega?.hora_recogida?.substring(11, 16) || '--:--'} –{' '}
          {envio.recogidaEntrega?.hora_entrega?.substring(11, 16) || '--:--'}
        </Text>
        <Text style={styles.item}>🌱 Variedad: {envio.cargas?.[0]?.variedad || '—'}</Text>
        <Text style={styles.item}>⚖️ Peso: {envio.cargas?.[0]?.peso ?? '—'} kg</Text>
        <Text style={styles.item}>🔢 Cantidad: {envio.cargas?.[0]?.cantidad ?? '—'}</Text>
        <Text style={styles.item}>
          📍 {envio.nombre_origen} → {envio.nombre_destino}
        </Text>
      </View>

      {/* Mapa */}
      <Text style={styles.subtitle}>🗺️ Ruta</Text>
      {region ? (
        <MapView style={styles.map} initialRegion={region}>
          <Marker
            coordinate={{
              latitude: envio.coordenadas_origen[0],
              longitude: envio.coordenadas_origen[1],
            }}
            title={`Origen: ${envio.nombre_origen}`}
            pinColor="#007bff"
          />
          <Marker
            coordinate={{
              latitude: envio.coordenadas_destino[0],
              longitude: envio.coordenadas_destino[1],
            }}
            title={`Destino: ${envio.nombre_destino}`}
            pinColor="#dc3545"
          />
          {ruta.length > 0 && (
            <Polyline coordinates={ruta} strokeColor="#1e90ff" strokeWidth={4} />
          )}
        </MapView>
      ) : (
        <Text style={styles.noMap}>Sin coordenadas.</Text>
      )}

      {/* Checklist Condiciones */}
      {envio.estado_envio.toLowerCase() === 'asignado' && (
        <>
          <Text style={styles.subtitle}>✅ Checklist de Condiciones</Text>
          <TextInput
            style={styles.input}
            placeholder="Observaciones (opcional)"
            placeholderTextColor="#888"
            value={observaciones}
            onChangeText={setObservaciones}
          />
          {Object.keys(conditions).map((key) => (
            <Pressable key={key} style={styles.row} onPress={() => toggleCondition(key)}>
              <Ionicons
                name={conditions[key] ? 'checkbox' : 'square-outline'}
                size={22}
                color="#fff"
              />
              <Text style={styles.rowLabel}>{key.replace(/_/g, ' ')}</Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.button, submitting && styles.disabled]}
            onPress={handleConfirmTrip}
            disabled={submitting}
          >
            <Text style={styles.btnText}>
              {submitting ? 'Procesando…' : 'Confirmar Viaje'}
            </Text>
          </Pressable>
        </>
      )}

      {/* Checklist Incidentes + Firma */}
      {envio.estado_envio.toLowerCase() === 'en curso' && (
        <>
          <Text style={styles.subtitle}>⚠️ Checklist de Incidentes</Text>
          <TextInput
            style={styles.input}
            placeholder="Descripción incidente"
            placeholderTextColor="#888"
            value={descripcionIncidente}
            onChangeText={setDescripcionIncidente}
          />
          {Object.keys(incidents).map((key) => (
            <Pressable key={key} style={styles.row} onPress={() => toggleIncident(key)}>
              <Ionicons
                name={incidents[key] ? 'checkbox' : 'square-outline'}
                size={22}
                color="#fff"
              />
              <Text style={styles.rowLabel}>{key.replace(/_/g, ' ')}</Text>
            </Pressable>
          ))}

          <View style={{ marginTop: 16, height: 300 }}>
            <Signature
              ref={sigRef}
              onBegin={() => console.log('✏️ Signature onBegin')}
              onEnd={() => {
                console.log('✏️ Signature onEnd');
                sigRef.current?.readSignature();
              }}
              onOK={(data) => {
                console.log('✅ Signature onOK length=', data.length);
                setSignatureData(data);
              }}
              onEmpty={() => console.warn('⚠️ Signature onEmpty')}
              descriptionText="Firma aquí"
              clearText="Limpiar"
              confirmText="Guardar"
              webStyle={`
                .m-signature-pad--footer { background-color: #0f2027; }
                body,html { width:100%;height:100%;margin:0; }
              `}
            />
          </View>

          <Pressable
            style={[styles.button, submitting && styles.disabled]}
            onPress={handleFinalize}
            disabled={submitting}
          >
            <Text style={styles.btnText}>
              {submitting ? 'Procesando…' : 'Finalizar Entrega'}
            </Text>
          </Pressable>
        </>
      )}

      {/* Modal validación */}
      <Modal transparent visible={showMissingModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>
              Completa todos los campos y firma antes de continuar
            </Text>
            <Pressable style={styles.modalBtn} onPress={() => setShowMissingModal(false)}>
              <Text style={styles.modalBtnText}>Entendido</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f2027', padding: 16 },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f2027',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  backButton: { padding: 4 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  card: {
    backgroundColor: '#1e2a38',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  item: { color: '#ddd', marginBottom: 6 },
  map: {
    width: Dimensions.get('window').width - 32,
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
  },
  noMap: { color: '#ccc', textAlign: 'center', marginBottom: 16 },
  input: {
    backgroundColor: '#2a3748',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  rowLabel: { color: '#fff', marginLeft: 10, textTransform: 'capitalize' },
  button: {
    backgroundColor: '#28a745',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  disabled: { backgroundColor: '#555' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#0f2027',
    borderRadius: 12,
    padding: 20,
    width: '75%',
    alignItems: 'center',
  },
  modalIcon: { fontSize: 40, marginBottom: 16, color: '#fff' },
  modalTitle: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 12 },
  modalBtn: {
    backgroundColor: '#28a745',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalBtnText: { color: '#fff', fontWeight: '600' },
});
