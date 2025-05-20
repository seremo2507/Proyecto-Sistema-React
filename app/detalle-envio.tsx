/* detalle-envio.tsx */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Modal,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
  BackHandler,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MotiView, AnimatePresence } from 'moti';
import tw from 'twrnc';

/* 
 * NOTA: Código eliminado para compatibilidad con la Nueva Arquitectura
 * 
 * En versiones anteriores de React Native se usaba:
 * if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
 *   UIManager.setLayoutAnimationEnabledExperimental(true);
 * }
 * 
 * En la Nueva Arquitectura, las animaciones de layout están habilitadas por defecto
 * y este código genera advertencias, por lo que ha sido eliminado.
 */

export default function DetalleEnvioView() {
  const { id_asignacion } = useLocalSearchParams<{ id_asignacion: string }>();
  const router = useRouter();
  const { height } = Dimensions.get('window');

  /* ---------- estados ---------- */
  const [envio, setEnvio]   = useState<any>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [ruta,   setRuta]   = useState([]);

  const [conditions, setConditions] = useState<Record<string, boolean | null>>({});
  const [observaciones, setObservaciones] = useState('');
  const [incidents, setIncidents] = useState<Record<string, boolean | null>>({});
  const [descripcionIncidente, setDescripcionIncidente] = useState('');

  /* flags UI */
  const [modalVisible,   setModalVisible]   = useState(false);
  const [showConditions, setShowConditions] = useState(false);
  const [showIncidents,  setShowIncidents]  = useState(false);
  const [showChecklistAlert, setShowChecklistAlert] = useState(false);

  /* QR / firma */
  const [showQRModal,    setShowQRModal]    = useState(false);
  const [qrLoading,      setQrLoading]      = useState(false);
  const [qrImg,          setQrImg]          = useState<string|null>(null);
  const [clienteFirmo,   setClienteFirmo]   = useState(false);
  const [stopPolling,    setStopPolling]    = useState<(() => void)|null>(null);
  const [showSignNeeded, setShowSignNeeded] = useState(false);
  const [showFirmaBackendModal, setShowFirmaBackendModal] = useState(false);

  /* otros modals */
  const [showCondListModal, setShowCondListModal] = useState(false);
  const [showFinishModal,   setShowFinishModal]   = useState(false);
  const [showIncidentStartModal, setShowIncidentStartModal] = useState(false);

  /* toasts */
  const [infoMsg,  setInfoMsg]  = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  /* ---------- auto‑dismiss toasts ---------- */
  useEffect(()=>{ if(infoMsg){ const t=setTimeout(()=>setInfoMsg(''),2000); return()=>clearTimeout(t);} },[infoMsg]);
  useEffect(()=>{ if(errorMsg){ const t=setTimeout(()=>setErrorMsg(''),2000); return()=>clearTimeout(t);} },[errorMsg]);

  /* ---------- botón Android atrás ---------- */
  useFocusEffect(
    useCallback(() => {
      const onBack = () => { 
        router.replace('/home'); 
        return true; 
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => subscription.remove(); // Corregido: usamos subscription.remove() en lugar de removeEventListener
    }, [router])
  );

  /* helper fetch logger */
  const logFetch = async (label:string,res:Response)=>{
    let body={}; try{ body=await res.clone().json(); }catch{}
    console.log(`📡 [${label}]`,res.status,body);
  };

  /* ---------- obtener detalles ---------- */
  const fetchDetail = useCallback(async()=>{
    try{
      const token = await AsyncStorage.getItem('token');
      const res   = await fetch(
        'https://api-4g7v.onrender.com/api/envios/mis-envios-transportista',
        {headers:{Authorization:`Bearer ${token}`}}
      );
      const data  = await res.json();
      const found = data.find((e:any)=>e.id_asignacion?.toString()===id_asignacion);
      if(!found) throw new Error('No se encontró el envío');
      setEnvio(found);

      if(found.coordenadas_origen && found.coordenadas_destino){
        setRegion({
          latitude: found.coordenadas_origen[0],
          longitude: found.coordenadas_origen[1],
          latitudeDelta: 0.05,
          longitudeDelta: 0.05
        });
      }
      if(found.rutaGeoJSON?.coordinates){
        setRuta(found.rutaGeoJSON.coordinates.map((c:any)=>({latitude:c[1],longitude:c[0]})));
      }

      const init = (keys:string[]) => Object.fromEntries(keys.map(k=>[k,null]));
      setConditions(init([
        'temperatura_controlada','embalaje_adecuado','carga_segura','vehiculo_limpio',
        'documentos_presentes','ruta_conocida','combustible_completo','gps_operativo',
        'comunicacion_funcional','estado_general_aceptable'
      ]));
      setIncidents(init([
        'retraso','problema_mecanico','accidente','perdida_carga','condiciones_climaticas_adversas',
        'ruta_alternativa_usada','contacto_cliente_dificultoso','parada_imprevista',
        'problemas_documentacion','otros_incidentes'
      ]));
    }catch(err:any){ Alert.alert('Error',err.message); }
  },[id_asignacion]);

  useEffect(()=>{ fetchDetail(); },[fetchDetail]);

  /* ---------- helpers ---------- */
  const setAnswer = (setter:any,key:string,val:boolean)=>
    setter((p:any)=>({...p,[key]:val}));
  const allAnswered = (obj:Record<string,boolean|null>) =>
    Object.values(obj).every(v=>v!==null);

  /* ---------- QR ---------- */
    const handleShowQR = async () => {
    setQrLoading(true);
    setShowQRModal(true);
    setQrImg(null);

    try {
      const token = await AsyncStorage.getItem('token');
      const res   = await fetch(
        `https://api-4g7v.onrender.com/api/qr/${id_asignacion}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json  = await res.json();
      await logFetch('qr', res);

      if (!res.ok) throw new Error(json?.mensaje || 'Error QR');

      setQrImg(json.imagenQR);   // ← mostramos código
      setClienteFirmo(true);     // ← ✅ habilita "Finalizar envío"
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo obtener el QR');
      setShowQRModal(false);
    } finally {
      setQrLoading(false);
    }
  };


  // ------------- polling firma -------------
const startPollingFirma = () => {
  let attempts = 0;
  const intervalo = setInterval(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res   = await fetch(
        `https://api-4g7v.onrender.com/api/envios/validar-firma/${id_asignacion}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.ok) {
        const { firmaRealizada } = await res.json();
        if (firmaRealizada) {
          clearInterval(intervalo);
          setClienteFirmo(true);     // ✅ habilita «Finalizar»
          setShowQRModal(false);
          setInfoMsg('Firma verificada ✔');
        }
      }
      // por si acaso cortamos a los ~3 min
      if (++attempts > 60) clearInterval(intervalo);
    } catch {/* ignora fallos transitorios */}
  }, 3000);

  // limpiar si el componente se desmonta
  return () => clearInterval(intervalo);
};


  /** inicia polling y devuelve la función de limpieza */
  // 2️⃣  añade pollFirma cuando tengas el QR listo
    const pollFirma = () => {
      const intervalo = setInterval(async () => {
        try {
          const token = await AsyncStorage.getItem('token');
          const res   = await fetch(
            `https://api-4g7v.onrender.com/api/envios/validar-firma/${id_asignacion}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (res.ok) {
            const { firmaRealizada } = await res.json();
            if (firmaRealizada) {
              clearInterval(intervalo);
              setClienteFirmo(true);
              setShowQRModal(false);
              setInfoMsg('Firma verificada ✔');
            }
          }
        } catch {/* ignora errores momentáneos */}
      }, 3000);

      // limpia al cerrar el modal
      return () => clearInterval(intervalo);
    };


  /** botón que combina todo */
  const openQRModal = async ()=>{
    await handleShowQR();
    const stop = await pollFirma();
    setStopPolling(()=>stop);
  };

  /* ---------- acciones backend ---------- */
  const handleConfirmTrip = async()=>{
    if(!allAnswered(conditions)){ setErrorMsg('Responde Sí o No a todas las preguntas'); return; }
    try{
      const token = await AsyncStorage.getItem('token');
      const clean = Object.fromEntries(Object.entries(conditions).map(([k,v])=>[k,!!v]));

      const resChk = await fetch(
        `https://api-4g7v.onrender.com/api/envios/${id_asignacion}/checklist-condiciones`,
        {method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
         body:JSON.stringify({...clean,observaciones})});
      await logFetch('checklist-cond',resChk);
      if(!resChk.ok) throw new Error('Error checklist condiciones');

      const resStart = await fetch(
        `https://api-4g7v.onrender.com/api/envios/iniciar/${id_asignacion}`,
        {method:'PUT',headers:{Authorization:`Bearer ${token}`}}
      );
      await logFetch('iniciar',resStart);
      if(!resStart.ok) throw new Error('Error iniciar envío');

      setShowCondListModal(true);
      setShowConditions(false);
      fetchDetail();
    }catch(err:any){ setErrorMsg(err.message); }
  };

  const handleFinalize = async () => {
  /* ─── validaciones previas ─── */
  if (!clienteFirmo) {
    setShowSignNeeded(true);          // aún no se escaneó el QR
    return;
  }
  if (!allAnswered(incidents)) {
    setErrorMsg('Responde Sí o No a todas las preguntas');
    return;
  }

  try {
    const token = await AsyncStorage.getItem('token');
    let checklistRegistrado = false;

    /* 1️⃣  Checklist de incidentes (solo si no está registrado aún) */
    const cleanInc = Object.fromEntries(
      Object.entries(incidents).map(([k, v]) => [k, !!v])
    );

    const resInc = await fetch(
      `https://api-4g7v.onrender.com/api/envios/${id_asignacion}/checklist-incidentes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...cleanInc,
          descripcion_incidente: descripcionIncidente,
        }),
      }
    );
    await logFetch('checklist-inc', resInc);
    
    // Si obtenemos error, verificamos si es porque ya está registrado
    if (!resInc.ok) {
      const incBody = await resInc.json().catch(() => ({}));
      
      // Si ya está registrado, continuamos sin problema
      if (resInc.status === 400 && (incBody.error || '').includes('ya fue registrado')) {
        console.log('Checklist ya registrado, continuando con finalización');
        checklistRegistrado = true;
      } else {
        // Si es otro tipo de error, lo lanzamos
        throw new Error(incBody.error || 'Error checklist incidentes');
      }
    }

    /* 2️⃣  Finalizar envío */
    const resFin = await fetch(
      `https://api-4g7v.onrender.com/api/envios/finalizar/${id_asignacion}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const bodyFin = await resFin.json().catch(() => ({}));   // por si no es JSON
    await logFetch('finalizar', resFin);

    /*  ── firma faltante detectada por el backend ── */
    if (!resFin.ok) {
      if (
        resFin.status === 400 &&
        (bodyFin.error || '').toLowerCase().includes('firma del cliente')
      ) {
        setShowFirmaBackendModal(true);   // abre el modal informativo
        return;                           // salimos sin seguir
      }
      throw new Error(bodyFin.error || 'Error al finalizar');
    }

    /* 3️⃣  éxito */
    setShowFinishModal(true);    // modal "¡Envío finalizado!"
    fetchDetail();               // refresca datos en pantalla
    setModalVisible(false);
    setShowIncidents(false);
    setClienteFirmo(false);      // reinicia el flag para otros envíos
  } catch (err: any) {
    setErrorMsg(err.message || 'No se pudo finalizar');
  }
};

  /* ---------- render ---------- */
  if(!region||!envio){ return (
    <View style={tw`flex-1 justify-center items-center bg-white`}>
      <Text style={tw`text-gray-700`}>Cargando…</Text>
    </View>
  ); }

  return (
    <View style={tw`flex-1`}>
      {/* mapa */}
      <MapView style={tw`flex-1`} initialRegion={region}>
        <Marker coordinate={{ latitude:envio.coordenadas_origen[0], longitude:envio.coordenadas_origen[1] }}/>
        <Marker coordinate={{ latitude:envio.coordenadas_destino[0], longitude:envio.coordenadas_destino[1] }} pinColor="red"/>
        {ruta.length>0 && <Polyline coordinates={ruta} strokeColor="#0140CD" strokeWidth={4}/>}
      </MapView>

      {/* barra info - mejorada */}
      <TouchableOpacity 
        style={[
          tw`absolute bg-white bottom-6 left-4 right-4 rounded-2xl flex-row justify-between items-center py-3 px-4`,
          {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 6
          }
        ]}
        onPress={()=>{
          setModalVisible(true);
        }}
      >
        <View style={tw`flex-row items-center`}>
          <View style={tw`bg-[#0140CD] h-8 w-1 rounded-full mr-3`}></View>
          <View>
            <Text style={tw`text-[#0140CD] font-bold text-base`}>Envío #{envio.id_envio}</Text>
            <Text style={tw`text-gray-500 text-sm`}>{envio.estado_envio}</Text>
          </View>
        </View>
        <View style={tw`bg-[#0140CD] rounded-full p-2`}>
          <Ionicons name={modalVisible ? 'chevron-down' : 'chevron-up'} size={20} color="#fff"/>
        </View>
      </TouchableOpacity>

      {/* toasts */}
      <AnimatePresence>
        {infoMsg!=='' && (
          <MotiView key="info" from={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={[
              tw`absolute left-6 right-6 flex-row items-center p-3 rounded-xl bg-blue-50`,
              {top:height*0.45-40, shadowColor:'#000', shadowOpacity:0.2, shadowOffset:{width:0,height:2}, shadowRadius:4, elevation:4}
            ]}
          >
            <Feather name="info" size={20} color="#0140CD"/>
            <Text style={tw`ml-2 text-sm font-medium text-[#0140CD]`}>{infoMsg}</Text>
          </MotiView>
        )}
        {errorMsg!=='' && (
          <MotiView key="err" from={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={[
              tw`absolute left-6 right-6 flex-row items-center p-3 rounded-xl bg-red-50`,
              {top:height*0.45-40, shadowColor:'#000', shadowOpacity:0.2, shadowOffset:{width:0,height:2}, shadowRadius:4, elevation:4}
            ]}
          >
            <Feather name="x-circle" size={20} color="#dc3545"/>
            <Text style={tw`ml-2 text-sm font-medium text-red-600`}>{errorMsg}</Text>
          </MotiView>
        )}
      </AnimatePresence>

      {/* ---------- Modal principal ---------- */}
      <Modal 
        animationType="slide" 
        transparent={true}
        visible={modalVisible} 
        onRequestClose={()=>setModalVisible(false)}
      >
        <View style={tw`flex-1 justify-end bg-transparent`}>
          <View style={tw`bg-white rounded-t-3xl h-[70%]`}>
            {/* header */}
            <View style={tw`flex-row justify-between items-center p-4 border-b border-[#0140CD] bg-white`}>
              <Text style={tw`text-[#0140CD] text-lg font-bold`}>Detalles del Envío</Text>
              <TouchableOpacity onPress={()=>setModalVisible(false)}>
                <Ionicons name="close" size={26} color="#0140CD"/>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={tw`p-4 pb-10`}>
              {/* datos básicos */}
              <Text style={tw`text-black text-lg font-bold mb-2`}>📦 Envío Nº {envio.id_envio}</Text>
              <Text style={tw`text-black text-base mb-2.5`}>Estado: <Text style={tw`text-green-600`}>{envio.estado_envio}</Text></Text>
              <View style={tw`h-[1px] bg-gray-300 my-3`}/>
              <Text style={tw`text-black text-base mb-2.5`}>🚛 Transporte: {envio.tipo_transporte}</Text>
              <Text style={tw`text-black text-base mb-2.5`}>🌱 Variedad: {envio.cargas?.[0]?.variedad}</Text>
              <Text style={tw`text-black text-base mb-2.5`}>⚖️ Peso: {envio.cargas?.[0]?.peso ?? '—'} kg</Text>
              <Text style={tw`text-black text-base mb-2.5`}>🔢 Cantidad: {envio.cargas?.[0]?.cantidad ?? '—'}</Text>
              <Text style={tw`text-black text-base mb-2.5`}>📍 {envio.nombre_origen} → {envio.nombre_destino}</Text>

              {/* ---------- CHECKLIST CONDICIONES ---------- */}
              {(envio.estado_envio.toLowerCase()==='asignado') &&
              !showIncidents && !showConditions && (
                <TouchableOpacity 
                  style={tw`bg-[#0140CD] p-4 rounded-xl items-center mt-6 mb-10`}
                  onPress={()=>{
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setShowChecklistAlert(true);
                    setShowConditions(true);
                  }}>
                  <Text style={tw`text-white font-semibold text-base`}>Iniciar viaje</Text>
                </TouchableOpacity>
              )}

              {showConditions && (
                <>
                  <View style={tw`mt-5 mb-3`}>
                    <Text style={tw`text-[#0140CD] text-lg font-semibold`}>Checklist de condiciones</Text>
                  </View>
                  <TextInput
                    style={tw`bg-white border-[#0140CD] border-2 rounded-xl p-3 text-black text-base min-h-[80px] mb-4`}
                    placeholder="Observaciones" 
                    placeholderTextColor="#666"
                    multiline 
                    value={observaciones} 
                    onChangeText={setObservaciones}
                  />
                  {Object.entries(conditions).map(([k,v])=>(
                    <View key={k} style={tw`flex-row items-center mb-3 py-3 px-3.5 bg-white rounded-xl border border-gray-300 shadow`}>
                      <Text style={tw`flex-1 text-black text-base capitalize`}>{k.replace(/_/g,' ')}</Text>
                      <View style={tw`flex-row gap-2`}>
                        <Pressable 
                          style={tw`py-1.5 px-4 rounded-full border border-[#0140CD] ${v===true ? 'bg-[#0140CD]' : ''}`}
                          onPress={()=>setAnswer(setConditions,k,true)}>
                          <Text style={tw`${v===true ? 'text-white' : 'text-[#0140CD]'} font-semibold`}>Sí</Text>
                        </Pressable>
                        <Pressable 
                          style={tw`py-1.5 px-4 rounded-full border border-[#0140CD] ${v===false ? 'bg-[#0140CD]' : ''}`}
                          onPress={()=>setAnswer(setConditions,k,false)}>
                          <Text style={tw`${v===false ? 'text-white' : 'text-[#0140CD]'} font-semibold`}>No</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity 
                    style={tw`bg-[#0140CD] p-4 rounded-xl items-center mt-6 mb-10`} 
                    onPress={handleConfirmTrip}>
                    <Text style={tw`text-white font-semibold text-base`}>Confirmar viaje</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* ---------- CHECKLIST INCIDENTES ---------- */}
              {(envio.estado_envio.toLowerCase()==='en curso' || envio.estado_envio.toLowerCase()==='parcialmente entregado') &&
               !showIncidents && (
                <TouchableOpacity 
                  style={tw`bg-[#0140CD] p-4 rounded-xl items-center mt-6 mb-10`} 
                  onPress={()=>{
                    setShowIncidentStartModal(true);
                  }}>
                  <Text style={tw`text-white font-semibold text-base`}>Iniciar finalización</Text>
                </TouchableOpacity>
              )}

              {showIncidents && (
                <>
                  <View style={tw`mt-5 mb-3`}>
                    <Text style={tw`text-[#0140CD] text-lg font-semibold`}>Checklist de incidentes</Text>
                  </View>
                  <TextInput
                    style={tw`bg-white border-[#0140CD] border-2 rounded-xl p-3 text-black text-base min-h-[80px] mb-4`}
                    placeholder="Descripción del incidente" 
                    placeholderTextColor="#666"
                    multiline 
                    value={descripcionIncidente} 
                    onChangeText={setDescripcionIncidente}
                  />
                  {Object.entries(incidents).map(([k,v])=>(
                    <View key={k} style={tw`flex-row items-center mb-3 py-3 px-3.5 bg-white rounded-xl border border-gray-300 shadow`}>
                      <Text style={tw`flex-1 text-black text-base capitalize`}>{k.replace(/_/g,' ')}</Text>
                      <View style={tw`flex-row gap-2`}>
                        <Pressable 
                          style={tw`py-1.5 px-4 rounded-full border border-[#0140CD] ${v===true ? 'bg-[#0140CD]' : ''}`}
                          onPress={()=>setAnswer(setIncidents,k,true)}>
                          <Text style={tw`${v===true ? 'text-white' : 'text-[#0140CD]'} font-semibold`}>Sí</Text>
                        </Pressable>
                        <Pressable 
                          style={tw`py-1.5 px-4 rounded-full border border-[#0140CD] ${v===false ? 'bg-[#0140CD]' : ''}`}
                          onPress={()=>setAnswer(setIncidents,k,false)}>
                          <Text style={tw`${v===false ? 'text-white' : 'text-[#0140CD]'} font-semibold`}>No</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}

                  {/* siempre visible */}
                  <TouchableOpacity
                    style={tw`${allAnswered(incidents) ? 'bg-yellow-500' : 'bg-gray-400'} p-4 rounded-xl items-center mt-6 mb-2.5`}
                    onPress={handleShowQR}
                    disabled={!allAnswered(incidents)}
                  >
                    <Text style={tw`text-white font-semibold text-base`}>
                      {clienteFirmo ? 'Mostrar QR nuevamente' : 'Mostrar QR para firma'}
                    </Text>
                  </TouchableOpacity>


                  <TouchableOpacity
                    style={tw`bg-[#0140CD] p-4 rounded-xl items-center mb-10 ${clienteFirmo ? '' : 'opacity-50'}`}
                    disabled={!clienteFirmo}
                    onPress={handleFinalize}
                  >
                    <Text style={tw`text-white font-semibold text-base`}>Finalizar envío</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* COMPLETADO */}
              {envio.estado_envio.toLowerCase()==='completado' && (
                <View style={tw`items-center py-8`}>
                  <Ionicons name="checkmark-circle" size={64} color="#28a745"/>
                  <Text style={tw`text-black text-lg font-semibold mt-4`}>¡Entrega completada con éxito!</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ---------- Modal QR ---------- */}
      <Modal
        transparent
        visible={showQRModal}
        onRequestClose={()=>{
          stopPolling?.();               // detener polling
          setShowQRModal(false);
        }}>
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Text style={tw`text-lg font-bold text-[#0140CD] mb-2`}>Escanea este QR</Text>

            {qrLoading && !qrImg && (
              <ActivityIndicator size="large" color="#0140CD" style={tw`my-8`}/>
            )}

            {!qrLoading && qrImg && (
              <Image source={{uri:qrImg}} style={tw`w-[220px] h-[220px] my-4`}/>
            )}

            {!qrLoading && !qrImg && (
              <Text style={tw`my-4 text-red-600`}>No se pudo cargar el código. Intenta de nuevo.</Text>
            )}

            <TouchableOpacity 
              style={tw`bg-[#0140CD] py-3 px-6 rounded-xl mt-2`}
              onPress={()=>{
                stopPolling?.();
                setShowQRModal(false);
              }}>
              <Text style={tw`text-white font-semibold text-base`}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal inicio de checklist de incidentes */}
      <Modal transparent visible={showIncidentStartModal} animationType="fade" onRequestClose={()=>setShowIncidentStartModal(false)}>
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Ionicons name="list-circle-outline" size={64} color="#0140CD" style={tw`mb-3`}/>
            <Text style={tw`text-xl font-bold text-[#0140CD] mb-2 text-center`}>Checklist de Incidentes</Text>
            <Text style={tw`text-base text-gray-800 text-center mb-5`}>
              Debes completar el checklist de incidentes antes de finalizar este envío.
              Por favor, responde a todas las preguntas y describe cualquier incidencia ocurrida durante el trayecto.
            </Text>
            <View style={tw`flex-row justify-center`}>
              <TouchableOpacity 
                style={tw`bg-gray-500 py-3 px-6 rounded-xl mr-2`}
                onPress={()=>setShowIncidentStartModal(false)}>
                <Text style={tw`text-white font-semibold text-base`}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={tw`bg-[#0140CD] py-3 px-6 rounded-xl`}
                onPress={()=>{
                  setShowIncidentStartModal(false);
                  setShowIncidents(true);
                  setInfoMsg('Completa el checklist de incidentes');
                }}>
                <Text style={tw`text-white font-semibold text-base`}>Continuar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* lista condiciones */}
      <Modal transparent visible={showCondListModal} animationType="fade" onRequestClose={()=>setShowCondListModal(false)}>
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#28a745" style={tw`mb-3`}/>
            <Text style={tw`text-xl font-bold text-green-600 mb-2 text-center`}>Lista de Condiciones Registradas</Text>
            <TouchableOpacity 
              style={tw`bg-[#0140CD] py-3 px-6 rounded-xl mt-3`}
              onPress={()=>setShowCondListModal(false)}>
              <Text style={tw`text-white font-semibold text-base`}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* firma faltante detectada por el backend */}
      <Modal
        transparent
        visible={showFirmaBackendModal}
        animationType="fade"
        onRequestClose={() => setShowFirmaBackendModal(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Ionicons
              name="alert-circle-outline"
              size={64}
              color="#dc3545"
              style={tw`mb-3`}
            />
            <Text style={tw`text-xl font-bold text-green-600 mb-2 text-center`}>Debes capturar la firma</Text>
            <Text style={tw`text-base text-gray-800 text-center mb-5`}>
              El servidor rechazó la operación porque la firma del cliente aún no ha sido registrada.
              Pide al cliente que escanee el QR y firme para poder finalizar el envío.
            </Text>
            <TouchableOpacity
              style={tw`bg-[#0140CD] py-3 px-6 rounded-xl mt-2`}
              onPress={() => setShowFirmaBackendModal(false)}
            >
              <Text style={tw`text-white font-semibold text-base`}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal firma cliente requerida */}
      <Modal transparent visible={showSignNeeded} animationType="fade" onRequestClose={()=>setShowSignNeeded(false)}>
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Ionicons name="finger-print-outline" size={64} color="#dc3545" style={tw`mb-3`}/>
            <Text style={tw`text-xl font-bold text-red-600 mb-2 text-center`}>Falta la firma del cliente</Text>
            <Text style={tw`text-base text-gray-800 text-center mb-5`}>
              Para finalizar este envío, es necesario obtener la firma del cliente.
              Por favor, utiliza la opción "Mostrar QR para firma" y solicita al cliente que escanee y firme.
            </Text>
            <View style={tw`flex-row justify-center`}>
              <TouchableOpacity 
                style={tw`bg-gray-500 py-3 px-6 rounded-xl mr-2`}
                onPress={()=>setShowSignNeeded(false)}>
                <Text style={tw`text-white font-semibold text-base`}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={tw`bg-[#0140CD] py-3 px-6 rounded-xl`}
                onPress={()=>{
                  setShowSignNeeded(false);
                  handleShowQR();
                }}>
                <Text style={tw`text-white font-semibold text-base`}>Mostrar QR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* envío finalizado */}
      <Modal transparent visible={showFinishModal} animationType="fade" onRequestClose={()=>setShowFinishModal(false)}>
        <View style={tw`flex-1 bg-black bg-opacity-45 justify-center items-center p-6`}>
          <View style={tw`bg-white rounded-2xl p-6 w-full items-center`}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#28a745" style={tw`mb-3`}/>
            <Text style={tw`text-xl font-bold text-green-600 mb-2 text-center`}>¡Envío Finalizado!</Text>
            <Text style={tw`text-base text-gray-800 text-center mb-5`}>La entrega se registró con éxito.</Text>
            <TouchableOpacity 
              style={tw`bg-[#0140CD] py-3 px-6 rounded-xl mt-2`}
              onPress={()=>setShowFinishModal(false)}>
              <Text style={tw`text-white font-semibold text-base`}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}