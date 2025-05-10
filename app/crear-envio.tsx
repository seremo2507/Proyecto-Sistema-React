// app/crear-envio.tsx

import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, Feather } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

// --- Tipos ---
type Coordenada = { latitude: number; longitude: number };
type UbicacionAPI = {
  _id: string;
  nombreOrigen: string;
  coordenadasOrigen: [number, number];
  nombreDestino: string;
  coordenadasDestino: [number, number];
};
type Carga = {
  tipo: string;
  variedad: string;
  empaquetado: string;
  cantidad: number;
  peso: number;
};
type FormularioEnvio = {
  origen: Coordenada;
  destino: Coordenada;
  fecha: string;
  horaRecogida: string;
  horaEntrega: string;
  instruccionesRecogida: string;
  instruccionesEntrega: string;
  cargas: Carga[];
  tipoTransporteLabel: string;
};

// --- Constantes ---
const pasos = ['Ubicación', 'Partición', 'Carga', 'Transporte', 'Confirmar'];
const { width: W } = Dimensions.get('window');
const CIRCLE_DIAM = 28;
const API_BASE = 'https://api-4g7v.onrender.com/api';
const tiposCarga = ['Frutas', 'Verduras', 'Granos', 'Lácteos'];
const variedadOptions = [
  'Orgánico certificado',
  'Libre de pesticidas',
  'Comercio justo',
  'Local',
];
const transporteIcons: Record<string, any> = {
  Refrigerado: require('../assets/ico-refrigerado.png'),
  Ventilado:   require('../assets/ico-ventilado.png'),
  Aislado:     require('../assets/ico-aislado.png'),
};

export default function CrearEnvio() {
  // --- Estado navegación / loading ---
  const [paso, setPaso] = useState(0);
  const [loading, setLoading] = useState(false);

  // --- Ubicaciones guardadas ---
  const [ubicaciones, setUbicaciones] = useState<UbicacionAPI[]>([]);
  const [showOrigenModal, setShowOrigenModal] = useState(false);
  const [showDestinoModal, setShowDestinoModal] = useState(false);
  const [origenLabel, setOrigenLabel] = useState('');
  const [destinoLabel, setDestinoLabel] = useState('');

  // --- Tipo de transporte ---
  const [transportes] = useState<string[]>(['Refrigerado','Ventilado','Aislado']);
  const [tipoTransporteId, setTipoTransporteId] = useState<number | null>(null);

  // --- Pickers de fecha y hora ---
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showTimeRec, setShowTimeRec] = useState(false);
  const [selectedTimeRec, setSelectedTimeRec] = useState(new Date());
  const [showTimeEnt, setShowTimeEnt] = useState(false);
  const [selectedTimeEnt, setSelectedTimeEnt] = useState(new Date());

  // --- Modales de carga / variedad ---
  const [showCargaModal, setShowCargaModal] = useState(false);
  const [cargaModalIndex, setCargaModalIndex] = useState(0);
  const [showVariedadModal, setShowVariedadModal] = useState(false);
  const [variedadModalIndex, setVariedadModalIndex] = useState(0);

  // --- Datos del formulario ---
  const [form, setForm] = useState<FormularioEnvio>({
    origen: { latitude: 0, longitude: 0 },
    destino: { latitude: 0, longitude: 0 },
    fecha: '',
    horaRecogida: '',
    horaEntrega: '',
    instruccionesRecogida: '',
    instruccionesEntrega: '',
    cargas: [{ tipo: '', variedad: '', empaquetado: '', cantidad: 0, peso: 0 }],
    tipoTransporteLabel: '',
  });

  // --- Carga inicial de ubicaciones (filtra duplicados) ---
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const ru = await fetch(`${API_BASE}/ubicaciones/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const todas: UbicacionAPI[] = await ru.json();
      const visto = new Set<string>();
      const únicas = todas.filter(u => {
        if (visto.has(u._id)) return false;
        visto.add(u._id);
        return true;
      });
      setUbicaciones(únicas);
    })();
  }, []);

  // --- Helpers de estado ---
  const handleChange = (k: keyof FormularioEnvio, v: any) =>
    setForm(f => ({ ...f, [k]: v } as any));
  const updateCarga = (i: number, f: keyof Carga, v: any) => {
    const c = [...form.cargas]; c[i] = { ...c[i], [f]: v };
    setForm(fm => ({ ...fm, cargas: c }));
  };
  const agregarCarga = () =>
    setForm(fm => ({
      ...fm,
      cargas: [...fm.cargas, { tipo: '', variedad: '', empaquetado: '', cantidad: 0, peso: 0 }],
    }));

  // --- Crear envío ---
  const crearEnvio = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('No autenticado');

      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

      // 1) Crear ubicación
      const payloadUbic = {
        nombreOrigen: origenLabel,
        coordenadasOrigen: [form.origen.latitude, form.origen.longitude],
        nombreDestino: destinoLabel,
        coordenadasDestino: [form.destino.latitude, form.destino.longitude],
        segmentos: [],
      };
      const ru = await fetch(`${API_BASE}/ubicaciones/`, {
        method: 'POST', headers, body: JSON.stringify(payloadUbic),
      });
      const dataUb = await ru.json();
      if (!ru.ok) throw new Error(dataUb.error || 'Error ubicación');
      const idUb = dataUb._id;

      // 2) Partición
      const particion = {
        id_tipo_transporte: tipoTransporteId,
        recogidaEntrega: {
          fecha_recogida: form.fecha,
          hora_recogida: form.horaRecogida,
          hora_entrega:  form.horaEntrega,
          instrucciones_recogida: form.instruccionesRecogida,
          instrucciones_entrega:  form.instruccionesEntrega,
        },
        cargas: form.cargas,
      };

      // 3) Crear envío
      const ev = await fetch(`${API_BASE}/envios/`, {
        method:'POST', headers,
        body: JSON.stringify({ id_ubicacion_mongo: idUb, particiones: [particion] }),
      });
      const dataEnv = await ev.json();
      if (!ev.ok) throw new Error(dataEnv.error || 'Error envío');

      Alert.alert('¡Éxito!', 'Envío creado correctamente');
      // Reset
      setForm({
        origen:{latitude:0,longitude:0},
        destino:{latitude:0,longitude:0},
        fecha:'',horaRecogida:'',horaEntrega:'',
        instruccionesRecogida:'',instruccionesEntrega:'',
        cargas:[{tipo:'',variedad:'',empaquetado:'',cantidad:0,peso:0}],
        tipoTransporteLabel:'',
      });
      setOrigenLabel(''); setDestinoLabel(''); setTipoTransporteId(null); setPaso(0);

    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // --- Navegación entre pasos ---
  const siguiente = () => paso < pasos.length - 1 && setPaso(paso + 1);
  const anterior = () => paso > 0 && setPaso(paso - 1);

  // --- Render Paso 0 (sin duplicados) ---
  const renderPaso0 = () => {
    const origenesUnicos = ubicaciones.filter(
      (u, i, arr) => arr.findIndex(x => x.nombreOrigen === u.nombreOrigen) === i
    );
    const destinosUnicos = ubicaciones.filter(
      (u, i, arr) => arr.findIndex(x => x.nombreDestino === u.nombreDestino) === i
    );

    return (
      <>
        <Text style={styles.label}>Origen:</Text>
        <Pressable style={styles.input} onPress={() => setShowOrigenModal(true)}>
          <Text style={origenLabel ? styles.inputText : styles.inputPlaceholder}>
            {origenLabel || 'Selecciona origen'}
          </Text>
        </Pressable>

        <Text style={styles.label}>Destino:</Text>
        <Pressable style={styles.input} onPress={() => setShowDestinoModal(true)}>
          <Text style={destinoLabel ? styles.inputText : styles.inputPlaceholder}>
            {destinoLabel || 'Selecciona destino'}
          </Text>
        </Pressable>

        <MapView
          style={styles.map}
          initialRegion={{
            latitude: form.origen.latitude || -17.78,
            longitude: form.origen.longitude || -63.18,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}>
          {form.origen.latitude !== 0 && (
            <Marker key="mo" coordinate={form.origen} title={origenLabel} />
          )}
          {form.destino.latitude !== 0 && (
            <Marker key="md" pinColor="green" coordinate={form.destino} title={destinoLabel} />
          )}
        </MapView>

        {/* Modal Origen */}
        <Modal visible={showOrigenModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Elige Origen</Text>
              {origenesUnicos.map(u => (
                <Pressable
                  key={u._id}
                  style={styles.modalOption}
                  onPress={() => {
                    handleChange('origen', {
                      latitude: u.coordenadasOrigen[0],
                      longitude: u.coordenadasOrigen[1],
                    });
                    setOrigenLabel(u.nombreOrigen);
                    setShowOrigenModal(false);
                  }}>
                  <Text style={styles.modalOptionText}>{u.nombreOrigen}</Text>
                </Pressable>
              ))}
              <Pressable style={styles.modalCancelBtn} onPress={() => setShowOrigenModal(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Modal Destino */}
        <Modal visible={showDestinoModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Elige Destino</Text>
              {destinosUnicos.map(u => (
                <Pressable
                  key={u._id + '-d'}
                  style={styles.modalOption}
                  onPress={() => {
                    handleChange('destino', {
                      latitude: u.coordenadasDestino[0],
                      longitude: u.coordenadasDestino[1],
                    });
                    setDestinoLabel(u.nombreDestino);
                    setShowDestinoModal(false);
                  }}>
                  <Text style={styles.modalOptionText}>{u.nombreDestino}</Text>
                </Pressable>
              ))}
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setShowDestinoModal(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </>
    );
  };

  // --- Render Paso 1 ---
  const renderPaso1 = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Partición</Text>
      <Text style={styles.label}>Fecha</Text>
      <Pressable style={styles.input} onPress={() => setShowDatePicker(true)}>
        <Text style={form.fecha ? styles.inputText : styles.inputPlaceholder}>
          {form.fecha || 'YYYY-MM-DD'}
        </Text>
      </Pressable>
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(_, d) => {
            setShowDatePicker(false);
            if (d) handleChange('fecha', d.toISOString().slice(0, 10));
          }}
        />
      )}
      <Text style={styles.label}>Hora Recogida</Text>
      <Pressable style={styles.input} onPress={() => setShowTimeRec(true)}>
        <Text style={form.horaRecogida ? styles.inputText : styles.inputPlaceholder}>
          {form.horaRecogida || 'HH:MM'}
        </Text>
      </Pressable>
      {showTimeRec && (
        <DateTimePicker
          value={selectedTimeRec}
          mode="time"
          display="default"
          is24Hour
          onChange={(_, d) => {
            setShowTimeRec(false); if (d) {
              const hh = d.getHours().toString().padStart(2, '0');
              const mm = d.getMinutes().toString().padStart(2, '0');
              handleChange('horaRecogida', `${hh}:${mm}`);
            }
          }}
        />
      )}
      <Text style={styles.label}>Hora Entrega</Text>
      <Pressable style={styles.input} onPress={() => setShowTimeEnt(true)}>
        <Text style={form.horaEntrega ? styles.inputText : styles.inputPlaceholder}>
          {form.horaEntrega || 'HH:MM'}
        </Text>
      </Pressable>
      {showTimeEnt && (
        <DateTimePicker
          value={selectedTimeEnt}
          mode="time"
          display="default"
          is24Hour
          onChange={(_, d) => {
            setShowTimeEnt(false); if (d) {
              const hh = d.getHours().toString().padStart(2, '0');
              const mm = d.getMinutes().toString().padStart(2, '0');
              handleChange('horaEntrega', `${hh}:${mm}`);
            }
          }}
        />
      )}
      <Text style={styles.subTitle}>Instrucciones (opcionales)</Text>
      <TextInput
        style={styles.input}
        placeholder="Recogida..."
        placeholderTextColor="#999"
        value={form.instruccionesRecogida}
        onChangeText={t => handleChange('instruccionesRecogida', t)}
      />
      <TextInput
        style={styles.input}
        placeholder="Entrega..."
        placeholderTextColor="#999"
        value={form.instruccionesEntrega}
        onChangeText={t => handleChange('instruccionesEntrega', t)}
      />
    </View>
  );

  // --- Render Paso 2 ---
  const renderPaso2 = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Cargas</Text>
      {form.cargas.map((c, i) => (
        <View key={`c${i}`} style={styles.card}>
          <Text style={styles.label}>Tipo</Text>
          <Pressable
            style={styles.input}
            onPress={() => {
              setCargaModalIndex(i);
              setShowCargaModal(true);
            }}>
            <Text style={c.tipo ? styles.inputText : styles.inputPlaceholder}>
              {c.tipo || 'Seleccionar'}
            </Text>
          </Pressable>
          <Text style={styles.label}>Variedad</Text>
          <Pressable
            style={styles.input}
            onPress={() => {
              setVariedadModalIndex(i);
              setShowVariedadModal(true);
            }}>
            <Text style={c.variedad ? styles.inputText : styles.inputPlaceholder}>
              {c.variedad || 'Seleccionar'}
            </Text>
          </Pressable>
          <Text style={styles.label}>Cant.</Text>
          <View style={styles.counterRow}>
            <Pressable
              onPress={() => updateCarga(i, 'cantidad', Math.max(0, c.cantidad - 1))}
              style={styles.counterBtn}>
              <Text style={styles.counterText}>—</Text>
            </Pressable>
            <Text style={styles.counterValue}>{c.cantidad}</Text>
            <Pressable
              onPress={() => updateCarga(i, 'cantidad', c.cantidad + 1)}
              style={styles.counterBtn}>
              <Text style={styles.counterText}>+</Text>
            </Pressable>
          </View>
          <Text style={styles.label}>Peso (kg)</Text>
          <View style={styles.counterRow}>
            <Pressable
              onPress={() => updateCarga(i, 'peso', Math.max(0, c.peso - 1))}
              style={styles.counterBtn}>
              <Text style={styles.counterText}>—</Text>
            </Pressable>
            <Text style={styles.counterValue}>{c.peso}</Text>
            <Pressable
              onPress={() => updateCarga(i, 'peso', c.peso + 1)}
              style={styles.counterBtn}>
              <Text style={styles.counterText}>+</Text>
            </Pressable>
          </View>
        </View>
      ))}
      <Pressable style={styles.addBtn} onPress={agregarCarga}>
        <Ionicons name="add-circle" size={20} color="#0066cc" />
        <Text style={styles.addText}>Añadir carga</Text>
      </Pressable>

      {/* Modal Cargas */}
      <Modal transparent visible={showCargaModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {tiposCarga.map((t, idx) => (
              <Pressable
                key={idx}
                style={styles.modalOption}
                onPress={() => {
                  updateCarga(cargaModalIndex, 'tipo', t);
                  setShowCargaModal(false);
                }}>
                <Text style={styles.modalOptionText}>{t}</Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.modalCancelBtn}
              onPress={() => setShowCargaModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal Variedad */}
      <Modal transparent visible={showVariedadModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {variedadOptions.map((v, idx) => (
              <Pressable
                key={idx}
                style={styles.modalOption}
                onPress={() => {
                  updateCarga(variedadModalIndex, 'variedad', v);
                  setShowVariedadModal(false);
                }}>
                <Text style={styles.modalOptionText}>{v}</Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.modalCancelBtn}
              onPress={() => setShowVariedadModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );

  // --- Render Paso 3 ---
  const renderPaso3 = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Transporte</Text>
      <View style={styles.transportRow}>
        {transportes.map((tipo, idx) => (
          <Pressable
            key={idx}
            style={[
              styles.transportCard,
              form.tipoTransporteLabel === tipo && styles.transportActive,
            ]}
            onPress={() => {
              setTipoTransporteId(idx);
              handleChange('tipoTransporteLabel', tipo);
            }}>
            <Image source={transporteIcons[tipo]} style={styles.transportIcon} />
            <Text style={styles.transportLabel}>{tipo}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.descText}>
        {form.tipoTransporteLabel
          ? `Seleccionado: ${form.tipoTransporteLabel}`
          : 'Selecciona un transporte'}
      </Text>
    </View>
  );

  // --- Render Paso 4 ---
  const renderPaso4 = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Resumen</Text>
      <Text style={styles.resumen}>Origen: {origenLabel}</Text>
      <Text style={styles.resumen}>Destino: {destinoLabel}</Text>
      <Text style={styles.resumen}>Fecha: {form.fecha}</Text>
      <Text style={styles.resumen}>Recogida: {form.horaRecogida}</Text>
      <Text style={styles.resumen}>Entrega: {form.horaEntrega}</Text>
      {form.cargas.map((c, i) => (
        <Text key={i} style={styles.resumen}>
          {c.tipo} {c.variedad} — {c.cantidad} uds — {c.peso} kg
        </Text>
      ))}
      <Text style={styles.resumen}>Transporte: {form.tipoTransporteLabel}</Text>
    </View>
  );

  const renderContenido = () => {
    switch (paso) {
      case 0:
        return renderPaso0();
      case 1:
        return renderPaso1();
      case 2:
        return renderPaso2();
      case 3:
        return renderPaso3();
      case 4:
        return renderPaso4();
      default:
        return null;
    }
  };

  return (
    <LinearGradient colors={['#0140CD', '#0140CD']} style={loginStyles.container}>
      <MotiView
        from={{ opacity: 0, translateX: W }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'timing', duration: 500 }}
        style={loginStyles.formWrapper}
      >
        <View style={styles.inner}>
          {/* Stepper */}
          <View style={styles.stepper}>
            {pasos.map((_, i) => (
              <React.Fragment key={i}>
                <View style={[styles.circle, i <= paso && styles.circleActive]}>
                  <Text style={[styles.circleText, i <= paso && styles.circleTextActive]}>
                    {i + 1}
                  </Text>
                </View>
                {i < pasos.length - 1 && (
                  <View style={[styles.line, i < paso && styles.lineActive]} />
                )}
              </React.Fragment>
            ))}
          </View>
          <View style={styles.labels}>
            {pasos.map((l, i) => (
              <Text key={i} style={[styles.labelStep, i <= paso && styles.labelActive]}>
                {l}
              </Text>
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>{renderContenido()}</ScrollView>

          {/* Navegación */}
          <View style={styles.nav}>
            {paso > 0 && !loading && (
              <Pressable style={styles.navBtn} onPress={anterior}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
                <Text style={styles.navText}>Atrás</Text>
              </Pressable>
            )}
            {paso < pasos.length - 1 && !loading && (
              <Pressable style={styles.navBtn} onPress={siguiente}>
                <Text style={styles.navText}>Siguiente</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </Pressable>
            )}
            {paso === pasos.length - 1 && (
              <Pressable
                style={[styles.navBtn, styles.finishBtn]}
                onPress={crearEnvio}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.navText}>Crear Envío</Text>}
              </Pressable>
            )}
          </View>
        </View>
      </MotiView>
    </LinearGradient>
  );
}

// Estilos Login
const loginStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0140CD' },
  formWrapper: { flex: 1, paddingHorizontal: 24, paddingTop: 80, justifyContent: 'center' },
});

// Estilos CrearEnvio
const styles = StyleSheet.create({
  inner: { flex: 1 },
  scroll: { paddingVertical: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  circle: {
    width: CIRCLE_DIAM,
    height: CIRCLE_DIAM,
    borderRadius: CIRCLE_DIAM / 2,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleActive: { backgroundColor: '#fff' },
  circleText: { color: '#666' },
  circleTextActive: { color: '#0140CD' },
  line: { flex: 1, height: 4, backgroundColor: '#ccc' },
  lineActive: { backgroundColor: '#fff' },
  labels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 },
  labelStep: { fontSize: 12, color: '#eee' },
  labelActive: { color: '#fff' },
  label: { fontSize: 14, color: '#333', marginBottom: 4 },
  input: { backgroundColor: '#fff', borderRadius: 6, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#ddd' },
  inputText: { color: '#000' },
  inputPlaceholder: { color: '#999' },
  map: { width: W - 40, height: 300, borderRadius: 8, marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 6, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#ddd' },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#333' },
  subTitle: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 6, color: '#333' },
  counterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  counterBtn: { padding: 8, backgroundColor: '#eee', borderRadius: 4 },
  counterText: { fontSize: 18 },
  counterValue: { marginHorizontal: 12, fontSize: 16 },
  addBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  addText: { marginLeft: 6, color: '#0066cc', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', borderRadius: 6, width: '80%', padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  modalOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalOptionText: { fontSize: 16, color: '#333', textAlign: 'center' },
  modalCancelBtn: { marginTop: 12, backgroundColor: '#dc3545', borderRadius: 6, padding: 10 },
  modalCancelText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  transportRow: { flexDirection: 'row', justifyContent: 'space-between' },
  transportCard: { flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 6, margin: 4, borderWidth: 1, borderColor: '#ddd' },
  transportActive: { borderColor: '#0140CD' },
  transportIcon: { width: 48, height: 48, marginBottom: 8 },
  transportLabel: { fontSize: 14, color: '#333' },
  descText: { marginTop: 12, fontSize: 14, color: '#666' },
  resumen: { fontSize: 14, color: '#333', marginBottom: 4 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  navBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 6 },
  navText: { color: '#0140CD', fontWeight: '600', marginHorizontal: 6 },
  finishBtn: { backgroundColor: '#28a745' },
});
