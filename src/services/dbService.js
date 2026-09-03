import { collection, getDocs, addDoc, doc, setDoc, serverTimestamp, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { auth } from '../firebase';

// =============================================================================
// CACHE EN MEMORIA â€” CatÃ¡logo Maestro de Equipos
// Evita mÃºltiples llamadas a Firestore por sesiÃ³n (Bloque1 y Bloque2 comparten).
// TTL: 5 minutos â€” los cambios en el catÃ¡logo se reflejan sin recargar la app.
// =============================================================================
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
let _catalogCache = null;
let _catalogCacheTimestamp = 0;

export const invalidateCatalogCache = () => {
  _catalogCache = null;
  _catalogCacheTimestamp = 0;
};

// Obtiene el catÃ¡logo de equipos desde la nube (con cache en memoria)
export const fetchEquiposMaestros = async (forceRefresh = false) => {
  const now = Date.now();
  if (!forceRefresh && _catalogCache && (now - _catalogCacheTimestamp) < CACHE_TTL_MS) {
    return _catalogCache;
  }
  try {
    const equiposCol = collection(db, 'equipos_maestros');
    const equipoSnapshot = await getDocs(equiposCol);
    const equiposList = equipoSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    _catalogCache = equiposList;
    _catalogCacheTimestamp = now;
    return equiposList;
  } catch (error) {
    console.error("Error obteniendo los equipos maestros:", error);
    // Si falla la red, devolver la cache aunque estÃ© vencida antes que array vacÃ­o
    return _catalogCache || [];
  }
};

// Guardar un Ã­tem ad-hoc en el catÃ¡logo maestro
// Invalida el cache para que el nuevo equipo aparezca de inmediato en el datalist
export const addEquipoMaestro = async (equipo) => {
  try {
    const docRef = await addDoc(collection(db, 'equipos_maestros'), equipo);
    invalidateCatalogCache(); // El catÃ¡logo cambiÃ³ â†’ forzar recarga en el prÃ³ximo fetch
    return docRef.id;
  } catch (error) {
    console.error("Error guardando nuevo equipo maestro:", error);
    throw error;
  }
};

// Guardar cotizaciÃ³n emitida (colecciÃ³n legacy â€” no eliminar por compatibilidad)
export const saveCotizacion = async (cotizacionData) => {
  try {
    const payload = {
      ...cotizacionData,
      fecha_creacion: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, 'cotizaciones_emitidas'), payload);
    return docRef.id;
  } catch (error) {
    console.error("Error guardando cotizaciÃ³n:", error);
    throw error;
  }
};

// Obtener el historial de cotizaciones emitidas (legacy)
export const fetchCotizacionesEmitidas = async () => {
  try {
    const cotizacionesCol = collection(db, 'cotizaciones_emitidas');
    const cotizacionesSnapshot = await getDocs(cotizacionesCol);
    const cotizacionesList = cotizacionesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

// FunciÃ³n helper para transformar el array de la nube al formato requerido por los selectores
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

// =============================================================================
// P3: Obtener cotizaciones consolidadas (cotizaciones_v2 + cotizaciones_emitidas)
// - Carga en paralelo y fusiona ambas colecciones con tolerancia total a fallos.
// - Ordena en memoria por fecha más reciente sin requerir índices compuestos estrictos
// =============================================================================
export const fetchCotizacionesV2 = async () => {
  try {
    const colV2 = collection(db, 'cotizaciones_v2');
    const colLegacy = collection(db, 'cotizaciones_emitidas');

    const [snapshotV2, snapshotLegacy] = await Promise.allSettled([
      getDocs(colV2),
      getDocs(colLegacy)
    ]);

    const listV2 = snapshotV2.status === 'fulfilled' 
      ? snapshotV2.value.docs.map(d => ({ id: d.id, _source: 'v2', ...d.data() }))
      : [];

    const listLegacy = snapshotLegacy.status === 'fulfilled'
      ? snapshotLegacy.value.docs.map(d => ({ id: d.id, _source: 'legacy', ...d.data() }))
      : [];

    const combinedMap = new Map();
    // Primero legacy, luego v2 para que si coinciden ids, v2 sobreescriba
    listLegacy.forEach(item => combinedMap.set(item.id, item));
    listV2.forEach(item => combinedMap.set(item.id, item));

    const combined = Array.from(combinedMap.values());

    const getMillis = (dateVal) => {
      if (!dateVal) return 0;
      if (typeof dateVal.toMillis === 'function') return dateVal.toMillis();
      if (typeof dateVal.toDate === 'function') return dateVal.toDate().getTime();
      if (typeof dateVal.seconds === 'number') return dateVal.seconds * 1000;
      if (typeof dateVal === 'string' || typeof dateVal === 'number') {
        const parsed = new Date(dateVal).getTime();
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    return combined.sort((a, b) => {
      const timeA = Math.max(
        getMillis(a.fecha_actualizacion), 
        getMillis(a.fecha_creacion), 
        getMillis(a.fecha),
        getMillis(a.timestamp)
      );
      const timeB = Math.max(
        getMillis(b.fecha_actualizacion), 
        getMillis(b.fecha_creacion), 
        getMillis(b.fecha),
        getMillis(b.timestamp)
      );
      return timeB - timeA;
    });
  } catch (error) {
    console.error('Error obteniendo cotizaciones consolidadas:', error);
    return [];
  }
};

// =============================================================================
// P2: Guardar o actualizar cotizaciÃ³n (Upsert) en cotizaciones_v2
// - Incluye userId del usuario autenticado para Security Rules y filtrado
// =============================================================================
export const upsertCotizacionV2 = async (id, cotizacionData) => {
  try {
    const cleanedData = cleanUndefined(cotizacionData);
    const payload = {
      ...cleanedData,
      // P2: userId permite filtrar por usuario y aplicar Security Rules
      userId: auth.currentUser?.uid || null,
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

