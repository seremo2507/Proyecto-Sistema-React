import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Alert, Modal, ActivityIndicator, TextInput, Platform } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import * as api from './api';
import styles from './styles';
import {
  pasosLabels,
  tiposCarga,
  variedadOptions,
  transporteIcons,
} from './constants';

type Coordenada = { latitude: number; longitude: number };
type Carga = { tipo: string; variedad: string; empaquetado: string; cantidad: number; peso: number };
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

export default function CrearEnvio() {
  // Wizard state
  const [paso, setPaso] = useState(0);
  const [loading, setLoading] = useState(false);

  // Form state
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
  const [tipoTransporteId, setTipoTransporteId] = useState<number | null>(null);

  // Labels
  const [origenLabel, setOrigenLabel] = useState('');
  const [destinoLabel, setDestinoLabel] = useState('');

  // Data
  const [ubicaciones, setUbicaciones] = useState<any[]>([]);
  const [routeCoords, setRouteCoords] = useState<Coordenada[]>([]);

  // UI flags
  const [showOrigenModal, setShowOrigenModal] = useState(false);
  const [showDestinoModal, setShowDestinoModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate] = useState(new Date());
  const [showTimeRec, setShowTimeRec] = useState(false);
  const [selectedTimeRec] = useState(new Date());
  const [showTimeEnt, setShowTimeEnt] = useState(false);
  const [selectedTimeEnt] = useState(new Date());
  const [showCargaModal, setShowCargaModal] = useState(false);
  const [cargaModalIndex, setCargaModalIndex] = useState(0);
  const [showVariedadModal, setShowVariedadModal] = useState(false);
  const [variedadModalIndex, setVariedadModalIndex] = useState(0);

  // Fetch ubicaciones
  useEffect(() => {
    api.getUbicaciones()
      .then(data => setUbicaciones(data))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        Alert.alert('Error', msg);
      });
  }, []);

  // Fetch ruta on origen/destino change
  useEffect(() => {
    const { origen, destino } = form;
    if (origen.latitude && destino.latitude) {
      const start = `${origen.longitude},${origen.latitude}`;
      const end = `${destino.longitude},${destino.latitude}`;
      api.getRuta(start, end)
        .then(data => {
          const coords = data.coordinates.map(([lon, lat]: [number, number]) => ({ latitude: lat, longitude: lon }));
          setRouteCoords(coords);
        })
        .catch(() => setRouteCoords([]));
    } else {
      setRouteCoords([]);
    }
  }, [form.origen, form.destino]);

  // Handlers
  const handleChange = (key: keyof FormularioEnvio, value: any) => {
    setForm(f => ({ ...f, [key]: value } as any));
  };
  const updateCarga = (i: number, field: keyof Carga, value: any) => {
    const cargas = [...form.cargas];
    cargas[i] = { ...cargas[i], [field]: value };
    setForm(f => ({ ...f, cargas }));
  };
  const agregarCarga = () => setForm(f => ({
    ...f,
    cargas: [...f.cargas, { tipo: '', variedad: '', empaquetado: '', cantidad: 0, peso: 0 }]
  }));

  // Submit
  const crearEnvio = async () => {
    setLoading(true);
    try {
      await api.crearEnvio({
        loc: {
          nombreOrigen: origenLabel,
          coordenadasOrigen: [form.origen.latitude, form.origen.longitude],
          nombreDestino: destinoLabel,
          coordenadasDestino: [form.destino.latitude, form.destino.longitude],
          segmentos: []
        },
        part: {
          id_tipo_transporte: tipoTransporteId,
          recogidaEntrega: {
            fecha_recogida: form.fecha,
            hora_recogida: form.horaRecogida,
            hora_entrega: form.horaEntrega,
            instrucciones_recogida: form.instruccionesRecogida,
            instrucciones_entrega: form.instruccionesEntrega
          },
          cargas: form.cargas
        }
      });
      Alert.alert('¡Éxito!', 'Envío creado correctamente');
      // reset
      setForm({ origen: { latitude: 0, longitude: 0 }, destino: { latitude: 0, longitude: 0 }, fecha: '', horaRecogida: '', horaEntrega: '', instruccionesRecogida: '', instruccionesEntrega: '', cargas: [{ tipo: '', variedad: '', empaquetado: '', cantidad: 0, peso: 0 }], tipoTransporteLabel: '' });
      setOrigenLabel('');
      setDestinoLabel('');
      setTipoTransporteId(null);
      setPaso(0);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  // Step components
  const PasoUbicacion = () => {
    const origenes = Array.from(new Map(ubicaciones.map(u => [u.nombreOrigen, u])).values());
    const destinosUnicos = Array.from(new Map(ubicaciones.map(u => [u.nombreDestino, u])).values());
    return (
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.labelWhite}>Origen:</Text>
      <Pressable style={styles.inputWrapper} onPress={() => setShowOrigenModal(true)}>
        <Feather name="map-pin" size={20} color="#999" />
        <Text style={styles.input}>{origenLabel || 'Selecciona origen'}</Text>
      </Pressable>
      <Text style={styles.labelWhite}>Destino:</Text>
      <Pressable style={styles.inputWrapper} onPress={() => setShowDestinoModal(true)}>
        <Feather name="map" size={20} color="#999" />
        <Text style={styles.input}>{destinoLabel || 'Selecciona destino'}</Text>
      </Pressable>
      <MapView style={styles.map} initialRegion={{
        latitude: form.origen.latitude && form.destino.latitude ? (form.origen.latitude + form.destino.latitude) / 2 : -17.78,
        longitude: form.origen.longitude && form.destino.longitude ? (form.origen.longitude + form.destino.longitude) / 2 : -63.18,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }}>
        {form.origen.latitude !== 0 && <Marker coordinate={form.origen} title={origenLabel} />}
        {form.destino.latitude !== 0 && <Marker coordinate={form.destino} pinColor="green" title={destinoLabel} />}
        {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeColor="#fff" strokeWidth={4} />}
      </MapView>
      {/* Origen Modal */}
      <Modal visible={showOrigenModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Elige Origen</Text>
            {origenes.map(u => (
              <Pressable
                key={u._id}
                style={styles.modalOption}
                onPress={() => {
                  handleChange('origen', { latitude: u.coordenadasOrigen[0], longitude: u.coordenadasOrigen[1] });
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
      {/* Destino Modal */}
      <Modal visible={showDestinoModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Elige Destino</Text>
            {destinosUnicos.map(u => (
              <Pressable
                key={u._id}
                style={styles.modalOption}
                onPress={() => {
                  handleChange('destino', { latitude: u.coordenadasDestino[0], longitude: u.coordenadasDestino[1] });
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
    </View>
  );
  };

  const PasoParticion = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitleWhite}>Partición</Text>
      <Text style={styles.labelWhite}>Fecha</Text>
      <Pressable style={styles.inputWrapper} onPress={() => setShowDatePicker(true)}>
        <Feather name="calendar" size={20} color="#999" />
        <Text style={styles.input}>{form.fecha || 'YYYY-MM-DD'}</Text>
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
      <Text style={styles.labelWhite}>Hora Recogida</Text>
      <Pressable style={styles.inputWrapper} onPress={() => setShowTimeRec(true)}>
        <Feather name="clock" size={20} color="#999" />
        <Text style={styles.input}>{form.horaRecogida || 'HH:MM'}</Text>
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
              const mm = d.getMinutes().toString().padStart(2, '0');
              handleChange('horaRecogida', `${hh}:${mm}`);
            }
          }}
        />
      )}
      <Text style={styles.labelWhite}>Hora Entrega</Text>
      <Pressable style={styles.inputWrapper} onPress={() => setShowTimeEnt(true)}>
        <Feather name="clock" size={20} color="#999" />
        <Text style={styles.input}>{form.horaEntrega || 'HH:MM'}</Text>
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
              const mm = d.getMinutes().toString().padStart(2, '0');
              handleChange('horaEntrega', `${hh}:${mm}`);
            }
          }}
        />
      )}
      <Text style={styles.labelWhite}>Instr. Recogida</Text>
      <View style={styles.inputWrapper}>
        <Feather name="edit" size={20} color="#999" />
        <TextInput
          style={styles.textarea}
          placeholder="Opcional..."
          placeholderTextColor="#999"
          value={form.instruccionesRecogida}
          onChangeText={t => handleChange('instruccionesRecogida', t)}
          multiline
        />
      </View>
      <Text style={styles.labelWhite}>Instr. Entrega</Text>
      <View style={styles.inputWrapper}>
        <Feather name="edit" size={20} color="#999" />
        <TextInput
          style={styles.textarea}
          placeholder="Opcional..."
          placeholderTextColor="#999"
          value={form.instruccionesEntrega}
          onChangeText={t => handleChange('instruccionesEntrega', t)}
          multiline
        />
      </View>
    </View>
  );

  const PasoCargas = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitleWhite}>Cargas</Text>
      {form.cargas.map((c, i) => (
        <View key={i} style={styles.cardSection}>
          <Text style={styles.labelWhite}>Tipo</Text>
          <Pressable style={styles.inputWrapper} onPress={() => { setCargaModalIndex(i); setShowCargaModal(true); }}>
            <Feather name="layers" size={20} color="#999" />
            <Text style={styles.input}>{c.tipo || 'Seleccionar'}</Text>
          </Pressable>
          <Text style={styles.labelWhite}>Variedad</Text>
          <Pressable style={styles.inputWrapper} onPress={() => { setVariedadModalIndex(i); setShowVariedadModal(true); }}>
            <Feather name="tag" size={20} color="#999" />
            <Text style={styles.input}>{c.variedad || 'Seleccionar'}</Text>
          </Pressable>
          <View style={styles.twoColumns}>
            <View style={{ flex: 1 }}>
              <Text style={styles.labelWhite}>Cantidad</Text>
              <View style={styles.counterRow}>
                <Pressable onPress={() => updateCarga(i, 'cantidad', Math.max(0, c.cantidad - 1))} style={styles.counterBtn}>
                  <Text style={styles.counterText}>—</Text>
                </Pressable>
                <Text style={styles.counterValue}>{c.cantidad}</Text>
                <Pressable onPress={() => updateCarga(i, 'cantidad', c.cantidad + 1)} style={styles.counterBtn}>
                  <Text style={styles.counterText}>+</Text>
                </Pressable>
              </View>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.labelWhite}>Peso (kg)</Text>
              <View style={styles.counterRow}>
                <Pressable onPress={() => updateCarga(i, 'peso', Math.max(0, c.peso - 1))} style={styles.counterBtn}>
                  <Text style={styles.counterText}>—</Text>
                </Pressable>
                <Text style={styles.counterValue}>{c.peso}</Text>
                <Pressable onPress={() => updateCarga(i, 'peso', c.peso + 1)} style={styles.counterBtn}>
                  <Text style={styles.counterText}>+</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      ))}
      <Pressable style={styles.buttonAdd} onPress={agregarCarga}>
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.buttonAddText}>Añadir otra carga</Text>
      </Pressable>
      {/* Carga Modal */}
      <Modal transparent visible={showCargaModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {tiposCarga.map((t, idx) => (
              <Pressable key={idx} style={styles.modalOption} onPress={() => { updateCarga(cargaModalIndex, 'tipo', t); setShowCargaModal(false); }}>
                <Text style={styles.modalOptionText}>{t}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.modalCancelBtn} onPress={() => setShowCargaModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {/* Variedad Modal */}
      <Modal transparent visible={showVariedadModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {variedadOptions.map((v, idx) => (
              <Pressable key={idx} style={styles.modalOption} onPress={() => { updateCarga(variedadModalIndex, 'variedad', v); setShowVariedadModal(false); }}>
                <Text style={styles.modalOptionText}>{v}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.modalCancelBtn} onPress={() => setShowVariedadModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );

  const PasoTransporte = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitleWhite}>Transporte</Text>
      <View style={styles.transportRow}>
        {Object.keys(transporteIcons).map((tipo, idx) => (
          <Pressable key={idx} style={styles.transportCard} onPress={() => { setTipoTransporteId(idx); handleChange('tipoTransporteLabel', tipo); }}>
            <Feather name="truck" size={24} color={form.tipoTransporteLabel === tipo ? '#fff' : '#999'} />
            <Text style={styles.input}>{tipo}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.descText}>{form.tipoTransporteLabel ? `Seleccionado: ${form.tipoTransporteLabel}` : 'Elige transporte'}</Text>
    </View>
  );

  const PasoConfirmar = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitleWhite}>Resumen</Text>
      <View style={styles.confirmRow}><Feather name="map-pin" size={20} color="#fff" /><Text style={styles.confirmText}>{origenLabel}</Text></View>
      <View style={styles.confirmRow}><Feather name="map" size={20} color="#fff" /><Text style={styles.confirmText}>{destinoLabel}</Text></View>
      <View style={styles.confirmRow}><Feather name="calendar" size={20} color="#fff" /><Text style={styles.confirmText}>{form.fecha}</Text></View>
      <View style={styles.confirmRow}><Feather name="clock" size={20} color="#fff" /><Text style={styles.confirmText}>{form.horaRecogida} → {form.horaEntrega}</Text></View>
      {form.cargas.map((c, i) => (
        <View key={i} style={styles.confirmRow}><Feather name="layers" size={20} color="#fff" /><Text style={styles.confirmText}>{`${c.tipo} ${c.variedad} (${c.cantidad} uds, ${c.peso}kg)`}</Text></View>
      ))}
      <View style={styles.confirmRow}><Feather name="truck" size={20} color="#fff" /><Text style={styles.confirmText}>{form.tipoTransporteLabel}</Text></View>
    </View>
  );

  const pasosComponents = [
    <PasoUbicacion key="0" />, 
    <PasoParticion key="1" />,
    <PasoCargas key="2" />, 
    <PasoTransporte key="3" />,
    <PasoConfirmar key="4" />
  ];

  return (
    <LinearGradient colors={['#0140CD', '#0140CD']} style={[styles.container, { paddingTop: Platform.OS === 'ios' ? 60 : 40 }]}>
      {/* Stepper */}
      <View style={styles.stepper}>
        {pasosLabels.map((_, i) => (
          <React.Fragment key={i}>
            <View style={[styles.circle, i <= paso && styles.circleActive]}>
              <Text style={[styles.circleText, i <= paso && styles.circleTextActive]}>{i + 1}</Text>
            </View>
            {i < pasosLabels.length - 1 && <View style={[styles.line, i < paso && styles.lineActive]} />}
          </React.Fragment>
        ))}
      </View>
      {/* Labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 16 }}>
        {pasosLabels.map((l, i) => (
          <Text key={i} style={[styles.labelStep, i <= paso && styles.labelActive]}>{l}</Text>
        ))}
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: 16 }]}>
        {pasosComponents[paso]}
      </ScrollView>
      {/* Navigation */}
      <View style={styles.nav}>
        {paso > 0 && !loading && (
          <Pressable style={styles.navBtn} onPress={() => setPaso(paso - 1)}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.navText}>Atrás</Text>
          </Pressable>
        )}
        {paso < pasosLabels.length - 1 && !loading && (
          <Pressable style={styles.navBtn} onPress={() => setPaso(paso + 1)}>
            <Text style={styles.navText}>Siguiente</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </Pressable>
        )}
        {paso === pasosLabels.length - 1 && (
          <Pressable style={[styles.navBtn, styles.finishBtn]} onPress={crearEnvio} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.navText}>Crear Envío</Text>}
          </Pressable>
        )}
      </View>
    </LinearGradient>
  );
}
