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
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';

// Tipos de datos
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

// Constantes
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
// Iconos de transporte
const transporteIcons: Record<string, any> = {
  Refrigerado: require('../assets/ico-refrigerado.png'),
  Ventilado:   require('../assets/ico-ventilado.png'),
  Aislado:     require('../assets/ico-aislado.png'),
};

export default function CrearEnvio() {
  const [paso, setPaso] = useState(0);
  const [loading, setLoading] = useState(false);

  // Ubicaciones guardadas
  const [ubicaciones, setUbicaciones] = useState<UbicacionAPI[]>([]);
  const [showOrigenModal, setShowOrigenModal] = useState(false);
  const [showDestinoModal, setShowDestinoModal] = useState(false);
  const [origenLabel, setOrigenLabel] = useState('');
  const [destinoLabel, setDestinoLabel] = useState('');

  // Pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showTimeRec, setShowTimeRec] = useState(false);
  const [selectedTimeRec, setSelectedTimeRec] = useState(new Date());
  const [showTimeEnt, setShowTimeEnt] = useState(false);
  const [selectedTimeEnt, setSelectedTimeEnt] = useState(new Date());

  // Modal carga / variedad
  const [showCargaModal, setShowCargaModal] = useState(false);
  const [cargaModalIndex, setCargaModalIndex] = useState(0);
  const [showVariedadModal, setShowVariedadModal] = useState(false);
  const [variedadModalIndex, setVariedadModalIndex] = useState(0);

  // Formulario
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

  // Carga inicial de ubicaciones
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const ru = await fetch(`${API_BASE}/ubicaciones/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUbicaciones(await ru.json());
    })();
  }, []);

  // Helpers
  const handleChange = (k: keyof FormularioEnvio, v: any) =>
    setForm(f => ({ ...f, [k]: v } as any));
  const updateCarga = (i: number, f: keyof Carga, v: any) => {
    const c = [...form.cargas];
    c[i] = { ...c[i], [f]: v };
    setForm(fm => ({ ...fm, cargas: c }));
  };
  const agregarCarga = () =>
    setForm(fm => ({
      ...fm,
      cargas: [...fm.cargas, { tipo: '', variedad: '', empaquetado: '', cantidad: 0, peso: 0 }],
    }));

  // crearEnvio con logs
  const crearEnvio = async () => {
    console.log('▶️ iniciar crearEnvio');
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('Token obtenido:', token);
      if (!token) throw new Error('No autenticado');

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      // 1) Ubicación
      const payloadUbic = {
        nombreOrigen: origenLabel,
        coordenadasOrigen: [form.origen.latitude, form.origen.longitude],
        nombreDestino: destinoLabel,
        coordenadasDestino: [form.destino.latitude, form.destino.longitude],
        segmentos: [],
      };
      console.log('📍 Payload /ubicaciones/:', payloadUbic);
      const ru = await fetch(`${API_BASE}/ubicaciones/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payloadUbic),
      });
      console.log('Response ubicaciones status:', ru.status);
      const dataUb = await ru.json();
      console.log('Response ubicaciones body:', dataUb);
      if (!ru.ok) throw new Error(`Error ubicación: ${dataUb.error || ru.status}`);

      const idUb = dataUb._id;
      console.log('ID ubicación creada:', idUb);

      // 2) Partición
      const particion = {         
        recogidaEntrega: {
          fecha_recogida: form.fecha,
          hora_recogida: form.horaRecogida + ':00',
          hora_entrega: form.horaEntrega + ':00',
          instrucciones_recogida: form.instruccionesRecogida,
          instrucciones_entrega: form.instruccionesEntrega,
        },
        cargas: form.cargas,
      };
      console.log('📦 Payload partición:', particion);

      // 3) Envío
      const payloadEnv = { id_ubicacion_mongo: idUb, particiones: [particion] };
      console.log('✈️ Payload /envios/:', payloadEnv);
      const ev = await fetch(`${API_BASE}/envios/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payloadEnv),
      });
      console.log('Response envios status:', ev.status);
      const dataEnv = await ev.json();
      console.log('Response envios body:', dataEnv);
      if (!ev.ok) throw new Error(`Error envío: ${dataEnv.error || ev.status}`);

      Alert.alert('¡Éxito!', 'Envío creado correctamente');
      console.log('✅ crearEnvio finalizado sin errores');

      // Reset
      setForm({
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
      setOrigenLabel('');
      setDestinoLabel('');
      setPaso(0);
    } catch (e) {
      console.error('❌ Error en crearEnvio:', e);
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Navegación
  const siguiente = () => paso < pasos.length - 1 && setPaso(paso + 1);
  const anterior = () => paso > 0 && setPaso(paso - 1);

  // Render pasos
  const renderPaso0 = () => (
    <>
      <Text style={styles.label}>Origen guardado:</Text>
      <Pressable style={styles.input} onPress={() => setShowOrigenModal(true)}>
        <Text style={origenLabel ? styles.inputText : styles.inputPlaceholder}>
          {origenLabel || 'Selecciona origen'}
        </Text>
      </Pressable>
      <Text style={styles.label}>Destino guardado:</Text>
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
          <Marker key="m-origen" coordinate={form.origen} title={origenLabel} />
        )}
        {form.destino.latitude !== 0 && (
          <Marker
            key="m-destino"
            pinColor="green"
            coordinate={form.destino}
            title={destinoLabel}
          />
        )}
      </MapView>
      {/* Modal Origen */}
      <Modal visible={showOrigenModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Elige Origen</Text>
            {ubicaciones.map((u, idx) => (
              <Pressable
                key={`${u._id}-${idx}`}
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
            {ubicaciones.map((u, idx) => (
              <Pressable
                key={`${u._id}-d-${idx}`}
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
            <Pressable style={styles.modalCancelBtn} onPress={() => setShowDestinoModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );

  const renderPaso1 = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Partición de envío</Text>
      <Text style={styles.label}>Día</Text>
      <Pressable style={styles.input} onPress={() => setShowDatePicker(true)}>
        <Text style={form.fecha ? styles.inputText : styles.inputPlaceholder}>
          {form.fecha || 'Selecciona fecha'}
        </Text>
      </Pressable>
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(_, d) => {
            setShowDatePicker(false);
            if (d) {
              const dd = d.getDate().toString().padStart(2, '0');
              const mm = (d.getMonth() + 1).toString().padStart(2, '0');
              handleChange('fecha', `${dd}/${mm}/${d.getFullYear()}`);
            }
          }}
        />
      )}
      <Text style={styles.label}>Hora recogida</Text>
      <Pressable style={styles.input} onPress={() => setShowTimeRec(true)}>
        <Text style={form.horaRecogida ? styles.inputText : styles.inputPlaceholder}>
          {form.horaRecogida || 'Selecciona hora'}
        </Text>
      </Pressable>
      {showTimeRec && (
        <DateTimePicker
          value={selectedTimeRec}
          mode="time"
          display="default"
          is24Hour
          onChange={(_, d) => {
            setShowTimeRec(false);
            if (d) {
              const hh = d.getHours().toString().padStart(2, '0');
              const mi = d.getMinutes().toString().padStart(2, '0');
              handleChange('horaRecogida', `${hh}:${mi}`);
            }
          }}
        />
      )}
      <Text style={styles.label}>Hora entrega</Text>
      <Pressable style={styles.input} onPress={() => setShowTimeEnt(true)}>
        <Text style={form.horaEntrega ? styles.inputText : styles.inputPlaceholder}>
          {form.horaEntrega || 'Selecciona hora'}
        </Text>
      </Pressable>
      {showTimeEnt && (
        <DateTimePicker
          value={selectedTimeEnt}
          mode="time"
          display="default"
          is24Hour
          onChange={(_, d) => {
            setShowTimeEnt(false);
            if (d) {
              const hh = d.getHours().toString().padStart(2, '0');
              const mi = d.getMinutes().toString().padStart(2, '0');
              handleChange('horaEntrega', `${hh}:${mi}`);
            }
          }}
        />
      )}
      <Text style={styles.subTitle}>Información opcional</Text>
      <Text style={styles.label}>Instrucciones recogida</Text>
      <TextInput
        style={styles.input}
        placeholder="..."
        placeholderTextColor="#999"
        value={form.instruccionesRecogida}
        onChangeText={t => handleChange('instruccionesRecogida', t)}
      />
      <Text style={styles.label}>Instrucciones entrega</Text>
      <TextInput
        style={styles.input}
        placeholder="..."
        placeholderTextColor="#999"
        value={form.instruccionesEntrega}
        onChangeText={t => handleChange('instruccionesEntrega', t)}
      />
    </View>
  );

  const renderPaso2 = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Detalles de la carga</Text>
      {form.cargas.map((c, i) => (
        <View key={`carga-${i}`} style={styles.card}>
          <Text style={styles.label}>Tipo de carga</Text>
          <Pressable
            style={styles.input}
            onPress={() => {
              setCargaModalIndex(i);
              setShowCargaModal(true);
            }}>
            <Text style={c.tipo ? styles.inputText : styles.inputPlaceholder}>
              {c.tipo || 'Seleccionar tipo'}
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
              {c.variedad || 'Seleccionar variedad'}
            </Text>
          </Pressable>
          <Text style={styles.label}>Cantidad</Text>
          <View style={styles.counterRow}>
            <Pressable
              key={`minus-${i}`}
              onPress={() => updateCarga(i, 'cantidad', Math.max(0, c.cantidad - 1))}
              style={styles.counterBtn}>
              <Text style={styles.counterText}>—</Text>
            </Pressable>
            <Text style={styles.counterValue}>{c.cantidad}</Text>
            <Pressable
              key={`plus-${i}`}
              onPress={() => updateCarga(i, 'cantidad', c.cantidad + 1)}
              style={styles.counterBtn}>
              <Text style={styles.counterText}>+</Text>
            </Pressable>
          </View>
          <Text style={styles.label}>Empaquetado</Text>
          <TextInput
            key={`empaque-${i}`}
            style={styles.input}
            placeholder="Ej: Caja"
            placeholderTextColor="#999"
            value={c.empaquetado}
            onChangeText={t => updateCarga(i, 'empaquetado', t)}
          />
          <Text style={styles.label}>Peso (kg)</Text>
          <View style={styles.counterRow}>
            <Pressable
              key={`wminus-${i}`}
              onPress={() => updateCarga(i, 'peso', Math.max(0, c.peso - 1))}
              style={styles.counterBtn}>
              <Text style={styles.counterText}>—</Text>
            </Pressable>
            <Text style={styles.counterValue}>{c.peso}</Text>
            <Pressable
              key={`wplus-${i}`}
              onPress={() => updateCarga(i, 'peso', c.peso + 1)}
              style={styles.counterBtn}>
              <Text style={styles.counterText}>+</Text>
            </Pressable>
          </View>
        </View>
      ))}
      <Pressable style={styles.addBtn} onPress={agregarCarga} key="add-carga">
        <Ionicons name="add-circle" size={20} color="#0066cc" />
        <Text style={styles.addText}>Añadir otra carga</Text>
      </Pressable>
      <Modal transparent visible={showCargaModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {tiposCarga.map((t, idx) => (
              <Pressable
                key={`tc-${idx}`}
                style={styles.modalOption}
                onPress={() => {
                  updateCarga(cargaModalIndex, 'tipo', t);
                  setShowCargaModal(false);
                }}>
                <Text style={styles.modalOptionText}>{t}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.modalCancelBtn} onPress={() => setShowCargaModal(false)} key="cancel-carga">
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal transparent visible={showVariedadModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {variedadOptions.map((v, idx) => (
              <Pressable
                key={`vo-${idx}`}
                style={styles.modalOption}
                onPress={() => {
                  updateCarga(variedadModalIndex, 'variedad', v);
                  setShowVariedadModal(false);
                }}>
                <Text style={styles.modalOptionText}>{v}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.modalCancelBtn} onPress={() => setShowVariedadModal(false)} key="cancel-variedad">
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderPaso3 = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Selección del tipo de transporte</Text>
      <View style={styles.transportRow}>
        {['Refrigerado', 'Ventilado', 'Aislado'].map((tipo, idx) => (
          <Pressable
            key={`tr-${idx}`}
            style={[
              styles.transportCard,
              form.tipoTransporteLabel === tipo && styles.transportActive,
            ]}
            onPress={() => handleChange('tipoTransporteLabel', tipo)}>
            <Image source={transporteIcons[tipo]} style={styles.transportIcon} />
            <Text style={styles.transportLabel}>{tipo}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.descText}>
        {form.tipoTransporteLabel
          ? `Has seleccionado: ${form.tipoTransporteLabel}`
          : 'Selecciona un tipo de transporte.'}
      </Text>
    </View>
  );

  const renderPaso4 = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Resumen</Text>
      <Text style={styles.resumen}>Origen: {origenLabel}</Text>
      <Text style={styles.resumen}>Destino: {destinoLabel}</Text>
      <Text style={styles.resumen}>Fecha: {form.fecha}</Text>
      <Text style={styles.resumen}>Recogida: {form.horaRecogida}</Text>
      <Text style={styles.resumen}>Entrega: {form.horaEntrega}</Text>
      {form.cargas.map((c, i) => (
        <Text key={`res-${i}`} style={styles.resumen}>
          Carga {i + 1}: {c.tipo}, {c.variedad}, {c.cantidad} uds, {c.peso} kg.
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
    <View style={styles.container}>
      {/* Stepper */}
      <View style={styles.stepper}>
        {pasos.map((_, i) => (
          <React.Fragment key={`step-${i}`}>
            <View style={[styles.circle, i <= paso && styles.circleActive]}>
              <Text style={[styles.circleText, i <= paso && styles.circleTextActive]}>{i + 1}</Text>
            </View>
            {i < pasos.length - 1 && <View style={[styles.line, i < paso && styles.lineActive]} />}
          </React.Fragment>
        ))}
      </View>
      <View style={styles.labels}>
        {pasos.map((l, i) => (
          <Text key={`label-${i}`} style={[styles.labelStep, i <= paso && styles.labelActive]}>
            {l}
          </Text>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>{renderContenido()}</ScrollView>

      {/* Navegación */}
      <View style={styles.nav}>
        {paso > 0 && !loading && (
          <Pressable style={styles.navBtn} onPress={anterior} key="nav-back">
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.navText}>Atrás</Text>
          </Pressable>
        )}
        {paso < pasos.length - 1 && !loading && (
          <Pressable style={styles.navBtn} onPress={siguiente} key="nav-next">
            <Text style={styles.navText}>Siguiente</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </Pressable>
        )}
        {paso === pasos.length - 1 && (
          <Pressable style={[styles.navBtn, styles.finishBtn]} onPress={crearEnvio} disabled={loading} key="nav-finish">
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.navText}>Crear Envío</Text>}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  circle: {
    width: CIRCLE_DIAM,
    height: CIRCLE_DIAM,
    borderRadius: CIRCLE_DIAM / 2,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleActive: { backgroundColor: '#0066cc' },
  circleText: { color: '#666' },
  circleTextActive: { color: '#fff' },
  line: { flex: 1, height: 4, backgroundColor: '#ccc' },
  lineActive: { backgroundColor: '#0066cc' },
  labels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  labelStep: { fontSize: 12, color: '#999' },
  labelActive: { color: '#333' },

  label: { fontSize: 14, color: '#333', marginBottom: 4 },
  input: { backgroundColor: '#fff', borderRadius: 6, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#ddd' },
  inputText: { color: '#000' },
  inputPlaceholder: { color: '#999' },
  map: { width: W - 32, height: 140, borderRadius: 6, marginBottom: 20 },
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
  transportCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    margin: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  transportActive: { borderColor: '#0066cc' },
  transportIcon: { width: 48, height: 48, marginBottom: 8 },
  transportLabel: { fontSize: 14, color: '#333' },
  descText: { marginTop: 12, fontSize: 14, color: '#666' },

  resumen: { fontSize: 14, color: '#333', marginBottom: 4 },

  nav: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  navBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0066cc', padding: 12, borderRadius: 6 },
  navText: { color: '#fff', fontWeight: '600', marginHorizontal: 6 },
  finishBtn: { backgroundColor: '#28a745' },
});
