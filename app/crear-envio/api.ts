import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE, RUTA_KEY } from './constants';

async function authHeaders() {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('No autenticado');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function getUbicaciones() {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/ubicaciones/`, { headers });
  if (!res.ok) throw new Error('Error cargando ubicaciones');
  return res.json();
}

export async function getRuta(origen: string, destino: string) {
  const url = `${API_BASE}/ruta?key=${RUTA_KEY}&start=${origen}&end=${destino}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error obteniendo ruta');
  return res.json(); // { coordinates: [...] }
}

export async function crearEnvio(payload: any) {
  const headers = await authHeaders();

  const res = await fetch(`${API_BASE}/ubicaciones/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload.loc),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Error ubicacion: ${msg}`);
  }

  const { _id: idUb } = await res.json();

  const evRes = await fetch(`${API_BASE}/envios/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id_ubicacion_mongo: idUb,
      particiones: [payload.part],
    }),
  });

  if (!evRes.ok) {
    const msg = await evRes.text();
    throw new Error(`Error envío: ${msg}`);
  }

  return evRes.json();
}



export default {
  getUbicaciones,
  getRuta,
  crearEnvio,
};
