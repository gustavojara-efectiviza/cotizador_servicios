import { collection, getDocs, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
// Obtiene el catálogo de equipos desde la nube
export const fetchEquiposMaestros = async () => {
  try {
    const equiposCol = collection(db, 'equipos_maestros');
    const equipoSnapshot = await getDocs(equiposCol);
    const equiposList = equipoSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return equiposList;
  } catch (error) {
    console.error("Error obteniendo los equipos maestros:", error);
    return [];
  }
};

// Guardar un ítem ad-hoc en el catálogo maestro
export const addEquipoMaestro = async (equipo) => {
  try {
    const docRef = await addDoc(collection(db, 'equipos_maestros'), equipo);
    return docRef.id;
  } catch (error) {
    console.error("Error guardando nuevo equipo maestro:", error);
    throw error;
  }
};

// Guardar cotización emitida
export const saveCotizacion = async (cotizacionData) => {
  try {
    const payload = {
      ...cotizacionData,
      fecha_creacion: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, 'cotizaciones_emitidas'), payload);
    return docRef.id;
  } catch (error) {
    console.error("Error guardando cotización:", error);
    throw error;
  }
};
// Obtener el historial de cotizaciones emitidas
export const fetchCotizacionesEmitidas = async () => {
  try {
    const cotizacionesCol = collection(db, 'cotizaciones_emitidas');
    const cotizacionesSnapshot = await getDocs(cotizacionesCol);
    const cotizacionesList = cotizacionesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Ordenar manualmente por fecha (más recientes primero)
    return cotizacionesList.sort((a, b) => {
      const dateA = a.fecha_creacion?.toMillis?.() || 0;
      const dateB = b.fecha_creacion?.toMillis?.() || 0;
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Error obteniendo el historial de cotizaciones:", error);
    return [];
  }
};
// Función helper para transformar el array de la nube al formato requerido por los selectores
export const getTensionsFromData = (data) => {
  return [...new Set(data.map(e => e.tension))];
};

export const getEquipmentsByTensionFromData = (data, tension) => {
  return data.filter(e => e.tension === tension);
};

// Sanitizar datos para Firebase (reemplazar undefined por null)
const cleanUndefined = (obj) => {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item));
  }
  if (typeof obj === 'object') {
    const cleaned = {};
    Object.keys(obj).forEach(key => {
      cleaned[key] = cleanUndefined(obj[key]);
    });
    return cleaned;
  }
  return obj;
};

// Obtener el historial de cotizaciones desde la colección v2
export const fetchCotizacionesV2 = async () => {
  try {
    const col = collection(db, 'cotizaciones_v2');
    const snapshot = await getDocs(col);
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // Más recientes primero
    return list.sort((a, b) => {
      const dateA = a.fecha_actualizacion?.toMillis?.() || a.fecha_creacion?.toMillis?.() || 0;
      const dateB = b.fecha_actualizacion?.toMillis?.() || b.fecha_creacion?.toMillis?.() || 0;
      return dateB - dateA;
    });
  } catch (error) {
    console.error('Error obteniendo cotizaciones_v2:', error);
    return [];
  }
};

// Guardar o actualizar cotización (Upsert) en cotizaciones_v2
export const upsertCotizacionV2 = async (id, cotizacionData) => {
  try {
    const cleanedData = cleanUndefined(cotizacionData);
    const payload = {
      ...cleanedData,
      fecha_actualizacion: serverTimestamp()
    };
    if (!id) {
      payload.fecha_creacion = serverTimestamp();
      const docRef = await addDoc(collection(db, 'cotizaciones_v2'), payload);
      return docRef.id;
    } else {
      const docRef = doc(db, 'cotizaciones_v2', id);
      await setDoc(docRef, payload, { merge: true });
      return id;
    }
  } catch (error) {
    console.error("Error en upsertCotizacionV2:", error);
    throw error;
  }
};


