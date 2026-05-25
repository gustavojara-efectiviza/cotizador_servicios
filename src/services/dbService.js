import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
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


