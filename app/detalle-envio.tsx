/* detalle-envio.tsx */
import React, { useEffect, useState, useCallback } from 'react';
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
  BackHandler,
  Alert,
  Image,
  ActivityIndicator,     // ← nuevo
} from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MotiView, AnimatePresence } from 'moti';

/* ---------- animaciones en Android ---------- */
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

  /* toasts */
  const [infoMsg,  setInfoMsg]  = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  /* ---------- auto‑dismiss toasts ---------- */
  useEffect(()=>{ if(infoMsg){ const t=setTimeout(()=>setInfoMsg(''),2000); return()=>clearTimeout(t);} },[infoMsg]);
  useEffect(()=>{ if(errorMsg){ const t=setTimeout(()=>setErrorMsg(''),2000); return()=>clearTimeout(t);} },[errorMsg]);

  /* ---------- botón Android atrás ---------- */
  useFocusEffect(
    useCallback(()=>{ const onBack=()=>{ router.replace('/home'); return true; };
      BackHandler.addEventListener('hardwareBackPress',onBack);
      return()=>BackHandler.removeEventListener('hardwareBackPress',onBack);
    },[router])
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
      setClienteFirmo(true);     // ← ✅ habilita “Finalizar envío”
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
      // por si acaso cortamos a los ~3 min
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

    /* 1️⃣  Checklist de incidentes */
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
    if (!resInc.ok) throw new Error('Error checklist incidentes');

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
    setShowFinishModal(true);    // modal “¡Envío finalizado!”
    fetchDetail();               // refresca datos en pantalla
    setModalVisible(false);
    setShowIncidents(false);
    setClienteFirmo(false);      // reinicia el flag para otros envíos
  } catch (err: any) {
    setErrorMsg(err.message || 'No se pudo finalizar');
  }
};

  /* ---------- render ---------- */
  if(!region||!envio){ return <View style={styles.loading}><Text style={{color:'#fff'}}>Cargando…</Text></View>; }

  return (
    <View style={{flex:1}}>
      {/* mapa */}
      <MapView style={{flex:1}} initialRegion={region}>
        <Marker coordinate={{ latitude:envio.coordenadas_origen[0], longitude:envio.coordenadas_origen[1] }}/>
        <Marker coordinate={{ latitude:envio.coordenadas_destino[0], longitude:envio.coordenadas_destino[1] }} pinColor="red"/>
        {ruta.length>0 && <Polyline coordinates={ruta} strokeColor="#0140CD" strokeWidth={4}/>}
      </MapView>

      {/* barra info */}
      <TouchableOpacity style={styles.miniInfoBar} onPress={()=>setModalVisible(!modalVisible)}>
        <Text style={styles.miniInfoText}>📦 Envío #{envio.id_envio} • {envio.estado_envio}</Text>
        <Ionicons name={modalVisible?'chevron-down':'chevron-up'} size={24} color="#fff"/>
      </TouchableOpacity>

      {/* toasts */}
      <AnimatePresence>
        {infoMsg!=='' && (
          <MotiView key="info" from={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={[styles.toast,{backgroundColor:'#e8f0fe',top:height*0.45-40}]}>
            <Feather name="info" size={20} color="#0140CD"/><Text style={[styles.toastText,{color:'#0140CD'}]}>{infoMsg}</Text>
          </MotiView>
        )}
        {errorMsg!=='' && (
          <MotiView key="err" from={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={[styles.toast,{backgroundColor:'#fdecea',top:height*0.45-40}]}>
            <Feather name="x-circle" size={20} color="#dc3545"/><Text style={[styles.toastText,{color:'#dc3545'}]}>{errorMsg}</Text>
          </MotiView>
        )}
      </AnimatePresence>

      {/* ---------- Modal principal ---------- */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={()=>setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>

            {/* header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalles del Envío</Text>
              <TouchableOpacity onPress={()=>setModalVisible(false)}>
                <Ionicons name="close" size={26} color="#0140CD"/>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {/* datos básicos */}
              <Text style={styles.title}>📦 Envío Nº {envio.id_envio}</Text>
              <Text style={styles.item}>Estado: <Text style={{color:'#28a745'}}>{envio.estado_envio}</Text></Text>
              <View style={styles.separator}/>
              <Text style={styles.item}>🚛 Transporte: {envio.tipo_transporte}</Text>
              <Text style={styles.item}>🌱 Variedad: {envio.cargas?.[0]?.variedad}</Text>
              <Text style={styles.item}>⚖️ Peso: {envio.cargas?.[0]?.peso ?? '—'} kg</Text>
              <Text style={styles.item}>🔢 Cantidad: {envio.cargas?.[0]?.cantidad ?? '—'}</Text>
              <Text style={styles.item}>📍 {envio.nombre_origen} → {envio.nombre_destino}</Text>

              {/* ---------- CHECKLIST CONDICIONES ---------- */}
              {(envio.estado_envio.toLowerCase()==='asignado') &&
              !showIncidents && !showConditions && (
                <TouchableOpacity style={styles.button}
                  onPress={()=>{
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setShowChecklistAlert(true);
                    setShowConditions(true);
                  }}>
                  <Text style={styles.btnText}>Iniciar viaje</Text>
                </TouchableOpacity>
              )}

              {showConditions && (
                <>
                  <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Checklist de condiciones</Text></View>
                  <TextInput
                    style={styles.input} placeholder="Observaciones" placeholderTextColor="#666"
                    multiline value={observaciones} onChangeText={setObservaciones}
                  />
                  {Object.entries(conditions).map(([k,v])=>(
                    <View key={k} style={styles.row}>
                      <Text style={styles.label}>{k.replace(/_/g,' ')}</Text>
                      <View style={styles.yesNoGroup}>
                        <Pressable style={[styles.yesNoBtn,v===true&&styles.yesNoActive]}
                          onPress={()=>setAnswer(setConditions,k,true)}>
                          <Text style={[styles.yesNoText,v===true&&styles.yesNoTextActive]}>Sí</Text>
                        </Pressable>
                        <Pressable style={[styles.yesNoBtn,v===false&&styles.yesNoActive]}
                          onPress={()=>setAnswer(setConditions,k,false)}>
                          <Text style={[styles.yesNoText,v===false&&styles.yesNoTextActive]}>No</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.button} onPress={handleConfirmTrip}>
                    <Text style={styles.btnText}>Confirmar viaje</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* ---------- CHECKLIST INCIDENTES ---------- */}
              {(envio.estado_envio.toLowerCase()==='en curso' || envio.estado_envio.toLowerCase()==='parcialmente entregado') &&
               !showIncidents && (
                <TouchableOpacity style={styles.button} onPress={()=>{setShowIncidents(true);setInfoMsg('Completa el checklist de incidentes');}}>
                  <Text style={styles.btnText}>Iniciar finalización</Text>
                </TouchableOpacity>
              )}

              {showIncidents && (
                <>
                  <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Checklist de incidentes</Text></View>
                  <TextInput
                    style={styles.input} placeholder="Descripción del incidente" placeholderTextColor="#666"
                    multiline value={descripcionIncidente} onChangeText={setDescripcionIncidente}
                  />
                  {Object.entries(incidents).map(([k,v])=>(
                    <View key={k} style={styles.row}>
                      <Text style={styles.label}>{k.replace(/_/g,' ')}</Text>
                      <View style={styles.yesNoGroup}>
                        <Pressable style={[styles.yesNoBtn,v===true&&styles.yesNoActive]}
                          onPress={()=>setAnswer(setIncidents,k,true)}>
                          <Text style={[styles.yesNoText,v===true&&styles.yesNoTextActive]}>Sí</Text>
                        </Pressable>
                        <Pressable style={[styles.yesNoBtn,v===false&&styles.yesNoActive]}
                          onPress={()=>setAnswer(setIncidents,k,false)}>
                          <Text style={[styles.yesNoText,v===false&&styles.yesNoTextActive]}>No</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}

                  {/* siempre visible */}
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#ffc107' }]}
                    onPress={handleShowQR}
                  >
                    <Text style={styles.btnText}>
                      {clienteFirmo ? 'Mostrar QR nuevamente' : 'Mostrar QR para firma'}
                    </Text>
                  </TouchableOpacity>


                  <TouchableOpacity
                    style={[styles.button,{opacity:clienteFirmo?1:0.5}]}
                    disabled={!clienteFirmo}
                    onPress={handleFinalize}
                  >
                    <Text style={styles.btnText}>Finalizar envío</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* COMPLETADO */}
              {envio.estado_envio.toLowerCase()==='completado' && (
                <View style={styles.completedContainer}>
                  <Ionicons name="checkmark-circle" size={64} color="#28a745"/>
                  <Text style={styles.completedText}>¡Entrega completada con éxito!</Text>
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
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <Text style={styles.sectionTitle}>Escanea este QR</Text>

            {qrLoading && !qrImg && (
              <ActivityIndicator size="large" color="#0140CD" style={{marginVertical:32}}/>
            )}

            {!qrLoading && qrImg && (
              <Image source={{uri:qrImg}} style={{width:220,height:220,marginVertical:16}}/>
            )}

            {!qrLoading && !qrImg && (
              <Text style={{marginVertical:16,color:'#dc3545'}}>No se pudo cargar el código. Intenta de nuevo.</Text>
            )}

            <TouchableOpacity style={[styles.alertBtn,{marginTop:8}]}
              onPress={()=>{
                stopPolling?.();
                setShowQRModal(false);
              }}>
              <Text style={styles.alertBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* lista condiciones */}
      <Modal transparent visible={showCondListModal} animationType="fade" onRequestClose={()=>setShowCondListModal(false)}>
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#28a745" style={{marginBottom:12}}/>
            <Text style={styles.alertTitleGreen}>Lista de Condiciones Registradas</Text>
            <TouchableOpacity style={[styles.alertBtn,{marginTop:12}]} onPress={()=>setShowCondListModal(false)}>
              <Text style={styles.alertBtnText}>Cerrar</Text>
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
  <View style={styles.alertOverlay}>
    <View style={styles.alertBox}>
      <Ionicons
        name="alert-circle-outline"
        size={64}
        color="#dc3545"
        style={{ marginBottom: 12 }}
      />
      <Text style={styles.alertTitleGreen}>Debes capturar la firma</Text>
      <Text style={styles.alertMsg}>
        El servidor rechazó la operación porque la firma del cliente aún no ha sido registrada.
        Pide al cliente que escanee el QR y firme para poder finalizar el envío.
      </Text>
      <TouchableOpacity
        style={[styles.alertBtn, { marginTop: 8 }]}
        onPress={() => setShowFirmaBackendModal(false)}
      >
        <Text style={styles.alertBtnText}>Entendido</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>


      {/* envío finalizado */}
      <Modal transparent visible={showFinishModal} animationType="fade" onRequestClose={()=>setShowFinishModal(false)}>
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#28a745" style={{marginBottom:12}}/>
            <Text style={styles.alertTitleGreen}>¡Envío Finalizado!</Text>
            <Text style={styles.alertMsg}>La entrega se registró con éxito.</Text>
            <TouchableOpacity style={[styles.alertBtn,{marginTop:8}]} onPress={()=>setShowFinishModal(false)}>
              <Text style={styles.alertBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ---------- estilos ---------- */
const styles = StyleSheet.create({
  loading:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#0f2027'},

  miniInfoBar:{position:'absolute',bottom:20,left:20,right:20,backgroundColor:'rgba(1,64,205,0.95)',
    borderRadius:10,padding:12,flexDirection:'row',justifyContent:'space-between',alignItems:'center',elevation:6},
  miniInfoText:{color:'#fff',fontWeight:'600'},

  toast:{position:'absolute',left:24,right:24,flexDirection:'row',alignItems:'center',padding:12,borderRadius:12,elevation:4,
    shadowColor:'#000',shadowOpacity:0.2,shadowOffset:{width:0,height:2},shadowRadius:4},
  toastText:{marginLeft:8,fontSize:14,fontWeight:'500'},

  alertOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.45)',justifyContent:'center',alignItems:'center',padding:24},
  alertBox:{backgroundColor:'#fff',borderRadius:16,padding:24,width:'100%',alignItems:'center'},
  alertTitleGreen:{fontSize:20,fontWeight:'700',color:'#28a745',marginBottom:8,textAlign:'center'},
  alertMsg:{fontSize:16,color:'#333',textAlign:'center',marginBottom:20},
  alertBtn:{backgroundColor:'#0140CD',paddingVertical:12,paddingHorizontal:24,borderRadius:12},
  alertBtnText:{color:'#fff',fontWeight:'600',fontSize:16},

  modalContainer:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,0.4)'},
  modalContent:{backgroundColor:'#fff',borderTopLeftRadius:20,borderTopRightRadius:20,maxHeight:'90%'},
  modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:16,borderBottomWidth:1,borderBottomColor:'#0140CD'},
  modalTitle:{color:'#0140CD',fontSize:18,fontWeight:'700'},
  modalScroll:{padding:16,paddingBottom:40},

  title:{color:'#000',fontSize:18,fontWeight:'700',marginBottom:8},
  item:{color:'#000',fontSize:16,marginBottom:10},
  separator:{height:1,backgroundColor:'#CCC',marginVertical:12},

  sectionHeader:{marginTop:20,marginBottom:12},
  sectionTitle:{color:'#0140CD',fontSize:18,fontWeight:'600'},

  input:{backgroundColor:'#FFFFFF',borderColor:'#0140CD',borderWidth:1.5,borderRadius:10,padding:12,color:'#000',
    marginBottom:16,fontSize:16,minHeight:80},

  row:{flexDirection:'row',alignItems:'center',marginBottom:12,paddingVertical:12,paddingHorizontal:14,backgroundColor:'#ffffff',
    borderRadius:14,borderWidth:1,borderColor:'#d0d0d0',elevation:3,shadowColor:'#000',shadowOpacity:0.15,shadowOffset:{width:0,height:2},
    shadowRadius:3},
  label:{flex:1,color:'#000',fontSize:16,textTransform:'capitalize'},
  yesNoGroup:{flexDirection:'row',gap:8},
  yesNoBtn:{paddingVertical:6,paddingHorizontal:16,borderRadius:20,borderWidth:1,borderColor:'#0140CD'},
  yesNoActive:{backgroundColor:'#0140CD'},
  yesNoText:{color:'#0140CD',fontWeight:'600'},
  yesNoTextActive:{color:'#fff'},

  button:{backgroundColor:'#0140CD',padding:16,borderRadius:10,alignItems:'center',marginTop:24,marginBottom:40},
  btnText:{color:'#fff',fontWeight:'600',fontSize:16},

  completedContainer:{alignItems:'center',paddingVertical:30},
  completedText:{color:'#000',fontSize:18,fontWeight:'600',marginTop:16},
});
