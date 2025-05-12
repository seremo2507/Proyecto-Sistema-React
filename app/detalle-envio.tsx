/* detalle-envio.tsx */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Pressable, Modal,
  LayoutAnimation, Platform, UIManager, Dimensions, BackHandler, Alert,
} from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Signature, { SignatureViewRef } from 'react-native-signature-canvas';
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
  const [envio, setEnvio] = useState<any>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [ruta, setRuta] = useState([]);

  const [conditions, setConditions] = useState<Record<string, boolean | null>>({});
  const [observaciones, setObservaciones] = useState('');
  const [incidents, setIncidents] = useState<Record<string, boolean | null>>({});
  const [descripcionIncidente, setDescripcionIncidente] = useState('');

  const [signatureData, setSignatureData] = useState('');
  const sigRef = useRef<SignatureViewRef | null>(null);

  const [modalVisible,   setModalVisible]   = useState(false);
  const [showConditions, setShowConditions] = useState(false);
  const [showIncidents,  setShowIncidents]  = useState(false);
  const [showChecklistAlert, setShowChecklistAlert] = useState(false);

  /* modal secundario de firma */
  const [showSignModal,  setShowSignModal]  = useState(false);
  const [readyToFinish,  setReadyToFinish]  = useState(false);

  /* toasts */
  const [infoMsg,    setInfoMsg]    = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg,   setErrorMsg]   = useState('');

  /* ---------- auto‑dismiss toasts ---------- */
  useEffect(()=>{ if(infoMsg){ const t=setTimeout(()=>setInfoMsg(''),2000);    return()=>clearTimeout(t);} },[infoMsg]);
  useEffect(()=>{ if(successMsg){ const t=setTimeout(()=>setSuccessMsg(''),2000); return()=>clearTimeout(t);} },[successMsg]);
  useEffect(()=>{ if(errorMsg){ const t=setTimeout(()=>setErrorMsg(''),2000);   return()=>clearTimeout(t);} },[errorMsg]);

  /* ---------- botón Android atrás ---------- */
  useFocusEffect(
    useCallback(()=>{ const onBack=()=>{ router.replace('/home'); return true; };
      BackHandler.addEventListener('hardwareBackPress',onBack);
      return()=>BackHandler.removeEventListener('hardwareBackPress',onBack);
    },[router])
  );

  /* helper para logs fetch */
  const logFetch = async (label:string,res:Response)=>{
    let body={}; try{ body=await res.clone().json(); }catch{}
    console.log(`📡 [${label}]`,res.status,body);
  };

  /* ---------- obtener detalles ---------- */
  const fetchDetail = useCallback(async()=>{
    try{
      const token=await AsyncStorage.getItem('token');
      const res=await fetch('https://api-4g7v.onrender.com/api/envios/mis-envios-transportista',
        {headers:{Authorization:`Bearer ${token}`}}); const data=await res.json();
      const found=data.find((e:any)=>e.id_asignacion?.toString()===id_asignacion);
      if(!found) throw new Error('No se encontró el envío');
      setEnvio(found);

      if(found.coordenadas_origen && found.coordenadas_destino){
        setRegion({latitude:found.coordenadas_origen[0],longitude:found.coordenadas_origen[1],
          latitudeDelta:0.05,longitudeDelta:0.05});
      }
      if(found.rutaGeoJSON?.coordinates){
        setRuta(found.rutaGeoJSON.coordinates.map((c:any)=>({latitude:c[1],longitude:c[0]})));
      }

      const init=(keys:string[])=>Object.fromEntries(keys.map(k=>[k,null]));
      setConditions(init(['temperatura_controlada','embalaje_adecuado','carga_segura','vehiculo_limpio',
        'documentos_presentes','ruta_conocida','combustible_completo','gps_operativo',
        'comunicacion_funcional','estado_general_aceptable']));
      setIncidents(init(['retraso','problema_mecanico','accidente','perdida_carga',
        'condiciones_climaticas_adversas','ruta_alternativa_usada','contacto_cliente_dificultoso',
        'parada_imprevista','problemas_documentacion','otros_incidentes']));
    }catch(err:any){ Alert.alert('Error',err.message); }
  },[id_asignacion]);

  useEffect(()=>{ fetchDetail(); },[fetchDetail]);

  /* ---------- helpers ---------- */
  const setAnswer = (setter:any,key:string,val:boolean)=>
    setter((p:any)=>({...p,[key]:val}));
  const allAnswered = (obj:Record<string,boolean|null>) =>
    Object.values(obj).every(v=>v!==null);

  /* ---------- acciones backend ---------- */
  const handleConfirmTrip = async()=>{
    if(!allAnswered(conditions)){ setErrorMsg('Responde Sí o No a todas las preguntas'); return; }
    try{
      const token=await AsyncStorage.getItem('token');
      const clean=Object.fromEntries(Object.entries(conditions).map(([k,v])=>[k,!!v]));
      const resChk=await fetch(
        `https://api-4g7v.onrender.com/api/envios/${id_asignacion}/checklist-condiciones`,
        {method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
         body:JSON.stringify({...clean,observaciones})});
      await logFetch('checklist-condiciones',resChk);
      if(!resChk.ok) throw new Error('Error checklist condiciones');

      const resStart=await fetch(
        `https://api-4g7v.onrender.com/api/envios/iniciar/${id_asignacion}`,
        {method:'PUT',headers:{Authorization:`Bearer ${token}`}});
      await logFetch('iniciar-envio',resStart);
      if(!resStart.ok) throw new Error('Error iniciar envío');

      setSuccessMsg('Viaje confirmado'); fetchDetail(); setModalVisible(false); setShowConditions(false);
    }catch(err:any){ setErrorMsg(err.message||'No se pudo confirmar'); }
  };

  const handleFinalize = async()=>{
    if(!allAnswered(incidents)){ setErrorMsg('Responde Sí o No a todas las preguntas'); return; }
    if(!signatureData?.length){ setErrorMsg('Falta la firma'); return; }

    try{
      const token=await AsyncStorage.getItem('token');
      const clean=Object.fromEntries(Object.entries(incidents).map(([k,v])=>[k,!!v]));

      const resInc=await fetch(
        `https://api-4g7v.onrender.com/api/envios/${id_asignacion}/checklist-incidentes`,
        {method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
         body:JSON.stringify({...clean,descripcion_incidente:descripcionIncidente})});
      await logFetch('checklist-incidentes',resInc);
      if(!resInc.ok) throw new Error('Error checklist incidentes');

      const resFirma=await fetch(
        `https://api-4g7v.onrender.com/api/envios/firma/${id_asignacion}`,
        {method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
         body:JSON.stringify({imagenFirma:signatureData})});
      await logFetch('firma',resFirma);
      if(!resFirma.ok) throw new Error('Error subir firma');

      const resFin=await fetch(
        `https://api-4g7v.onrender.com/api/envios/finalizar/${id_asignacion}`,
        {method:'PUT',headers:{Authorization:`Bearer ${token}`}});
      await logFetch('finalizar-envio',resFin);
      if(!resFin.ok) throw new Error('Error finalizar envío');

      setSuccessMsg('Entrega finalizada');
      fetchDetail(); setModalVisible(false); setShowIncidents(false); setReadyToFinish(false);
    }catch(err:any){ setErrorMsg(err.message||'No se pudo finalizar'); }
  };

  /* ---------- render loading ---------- */
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
          <MotiView key="toast-info" from={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
            transition={{type:'timing',duration:250}}
            style={[styles.toast,{backgroundColor:'#e8f0fe',top:height*0.45-40}]}>
            <Feather name="info" size={20} color="#0140CD"/><Text style={[styles.toastText,{color:'#0140CD'}]}>{infoMsg}</Text>
          </MotiView>
        )}
        {successMsg!=='' && (
          <MotiView key="toast-success" from={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
            transition={{type:'timing',duration:250}}
            style={[styles.toast,{backgroundColor:'#d4edda',top:height*0.45-40}]}>
            <Feather name="check-circle" size={20} color="#155724"/><Text style={[styles.toastText,{color:'#155724'}]}>{successMsg}</Text>
          </MotiView>
        )}
        {errorMsg!=='' && (
          <MotiView key="toast-error" from={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
            transition={{type:'timing',duration:250}}
            style={[styles.toast,{backgroundColor:'#fdecea',top:height*0.45-40}]}>
            <Feather name="x-circle" size={20} color="#dc3545"/><Text style={[styles.toastText,{color:'#dc3545'}]}>{errorMsg}</Text>
          </MotiView>
        )}
      </AnimatePresence>

      {/* modal principal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={()=>setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>

            {/* alerta verde */}
            <Modal transparent visible={showChecklistAlert} animationType="fade" onRequestClose={()=>setShowChecklistAlert(false)}>
              <View style={styles.alertOverlay}>
                <View style={styles.alertBox}>
                  <Ionicons name="alert-circle-outline" size={64} color="#28a745" style={{marginBottom:12}}/>
                  <Text style={styles.alertTitleGreen}>¡Atención!</Text>
                  <Text style={styles.alertMsg}>Completa el checklist de condiciones para iniciar el viaje.</Text>
                  <TouchableOpacity style={styles.alertBtn} onPress={()=>setShowChecklistAlert(false)}>
                    <Text style={styles.alertBtnText}>Entendido</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalles del Envío</Text>
              <TouchableOpacity onPress={()=>setModalVisible(false)}>
                <Ionicons name="close" size={26} color="#0140CD"/>
              </TouchableOpacity>
            </View>

            {/* body */}
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={styles.title}>📦 Envío Nº {envio.id_envio}</Text>
              <Text style={styles.item}>Estado: <Text style={{color:'#28a745'}}>{envio.estado_envio}</Text></Text>
              <View style={styles.separator}/>
              <Text style={styles.item}>🚛 Transporte: {envio.tipo_transporte}</Text>
              <Text style={styles.item}>🌱 Variedad: {envio.cargas?.[0]?.variedad}</Text>
              <Text style={styles.item}>⚖️ Peso: {envio.cargas?.[0]?.peso ?? '—'} kg</Text>
              <Text style={styles.item}>🔢 Cantidad: {envio.cargas?.[0]?.cantidad ?? '—'}</Text>
              <Text style={styles.item}>📍 {envio.nombre_origen} → {envio.nombre_destino}</Text>

              {/* ASIGNADO */}
              {envio.estado_envio.toLowerCase()==='asignado' && (
                !showConditions ? (
                  <TouchableOpacity style={styles.button} onPress={()=>{
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setShowChecklistAlert(true); setShowConditions(true);
                  }}>
                    <Text style={styles.btnText}>Iniciar viaje</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Checklist de condiciones</Text></View>
                    <TextInput style={styles.input} placeholder="Observaciones" placeholderTextColor="#666"
                      multiline value={observaciones} onChangeText={setObservaciones}/>
                    {Object.entries(conditions).map(([k,v])=>(
                      <View key={k} style={styles.row}>
                        <Text style={styles.label}>{k.replace(/_/g,' ')}</Text>
                        <View style={styles.yesNoGroup}>
                          <Pressable style={[styles.yesNoBtn,v===true&&styles.yesNoActive]}
                            onPress={()=>setAnswer(setConditions,k,true)}><Text style={[styles.yesNoText,v===true&&styles.yesNoTextActive]}>Sí</Text></Pressable>
                          <Pressable style={[styles.yesNoBtn,v===false&&styles.yesNoActive]}
                            onPress={()=>setAnswer(setConditions,k,false)}><Text style={[styles.yesNoText,v===false&&styles.yesNoTextActive]}>No</Text></Pressable>
                        </View>
                      </View>
                    ))}
                    <TouchableOpacity style={styles.button} onPress={handleConfirmTrip}>
                      <Text style={styles.btnText}>Confirmar viaje</Text>
                    </TouchableOpacity>
                  </>
                )
              )}

              {/* EN CURSO */}
              {envio.estado_envio.toLowerCase()==='en curso' && (
                !showIncidents ? (
                  <TouchableOpacity style={styles.button} onPress={()=>{
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setInfoMsg('Completa el checklist de incidentes para finalizar la entrega');
                    setShowIncidents(true);
                  }}>
                    <Text style={styles.btnText}>Iniciar finalización</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Checklist de incidentes</Text></View>
                    <TextInput style={styles.input} placeholder="Descripción del incidente" placeholderTextColor="#666"
                      multiline value={descripcionIncidente} onChangeText={setDescripcionIncidente}/>
                    {Object.entries(incidents).map(([k,v])=>(
                      <View key={k} style={styles.row}>
                        <Text style={styles.label}>{k.replace(/_/g,' ')}</Text>
                        <View style={styles.yesNoGroup}>
                          <Pressable style={[styles.yesNoBtn,v===true&&styles.yesNoActive]}
                            onPress={()=>setAnswer(setIncidents,k,true)}><Text style={[styles.yesNoText,v===true&&styles.yesNoTextActive]}>Sí</Text></Pressable>
                          <Pressable style={[styles.yesNoBtn,v===false&&styles.yesNoActive]}
                            onPress={()=>setAnswer(setIncidents,k,false)}><Text style={[styles.yesNoText,v===false&&styles.yesNoTextActive]}>No</Text></Pressable>
                        </View>
                      </View>
                    ))}
                    <TouchableOpacity style={styles.button} onPress={()=>{
                      if(!allAnswered(incidents)){ setErrorMsg('Responde Sí o No a todas las preguntas'); return; }
                      setShowSignModal(true);
                    }}>
                      <Text style={styles.btnText}>Firmar y finalizar</Text>
                    </TouchableOpacity>
                  </>
                )
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

      {/* modal firma */}
      <Modal transparent visible={showSignModal} animationType="slide" onRequestClose={()=>setShowSignModal(false)}>
        <View style={styles.signOverlay}>
          <View style={styles.signBox}>
            <Text style={styles.sectionTitle}>Firma del cliente</Text>
            <View style={styles.signatureContainer}>
              <Signature
                ref={sigRef}
                onEnd={()=>sigRef.current?.readSignature()}
                onOK={(data)=>{ setSignatureData(data); setReadyToFinish(true); }}
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
            <View style={{flexDirection:'row',gap:12,marginTop:20}}>
              <TouchableOpacity style={[styles.alertBtn,{flex:1,backgroundColor:'#6c757d'}]}
                onPress={()=>{ setShowSignModal(false); setReadyToFinish(false); }}>
                <Text style={styles.alertBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.alertBtn,{flex:1,opacity:readyToFinish?1:0.5}]}
                disabled={!readyToFinish}
                onPress={()=>{ setShowSignModal(false); handleFinalize(); }}>
                <Text style={styles.alertBtnText}>Finalizar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ---------- estilos ---------- */
const styles = StyleSheet.create({
  loading:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#0f2027'},

  miniInfoBar:{position:'absolute',bottom:20,left:20,right:20,backgroundColor:'rgba(1,64,205,0.95)',borderRadius:10,padding:12,
    flexDirection:'row',justifyContent:'space-between',alignItems:'center',elevation:6},
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

  signatureContainer:{height:200,borderRadius:8,overflow:'hidden',marginVertical:10},

  completedContainer:{alignItems:'center',paddingVertical:30},
  completedText:{color:'#000',fontSize:18,fontWeight:'600',marginTop:16},

  /* modal firma */
  signOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'center',alignItems:'center',padding:24},
  signBox:{width:'100%',backgroundColor:'#fff',borderRadius:16,padding:20},
});
