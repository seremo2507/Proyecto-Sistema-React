export const API_BASE = 'https://api-4g7v.onrender.com/api';
export const RUTA_KEY = '5b3ce3597851110001cf6248dbff311ed4d34185911c2eb9e6c50080';

export const tiposCarga = ['Frutas', 'Verduras', 'Granos', 'Lácteos'];
export const variedadOptions = [
  'Orgánico certificado',
  'Libre de pesticidas',
  'Comercio justo',
  'Local',
];

export const transporteIcons: Record<string, any> = {
  Refrigerado: require('../../assets/ico-refrigerado.png'),
  Ventilado:   require('../../assets/ico-ventilado.png'),
  Aislado:     require('../../assets/ico-aislado.png'),
};

export const pasosLabels = ['Ubicación','Partición','Carga','Transporte','Confirmar'];

export default {
  pasosLabels,
  tiposCarga,
  variedadOptions,
  transporteIcons,
};

