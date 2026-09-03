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
// P3: Obtener cotizaciones filtradas por usuario (query con where + limit)
// - Requiere Ã­ndice compuesto en Firebase Console:
//   Collection: cotizaciones_v2 | Fields: userId ASC, fecha_actualizacion DESC
// - Fallback a query sin filtro si el usuario no tiene UID (no deberÃ­a ocurrir)
// =============================================================================
export const fetchCotizacionesV2 = async (userId = null) => {
  try {
    const col = collection(db, 'cotizaciones_v2');
    const uid = userId || auth.currentUser?.uid;

    let q;
    if (uid) {
      // Query filtrada por usuario â€” O(usuario) en vez de O(colecciÃ³n total)
      q = query(
        col,
        where('userId', '==', uid),
        orderBy('fecha_actualizacion', 'desc'),
        limit(100)
      );
    } else {
      // Fallback defensivo: sin filtro, ordenar en cliente
      console.warn('fetchCotizacionesV2: no se encontrÃ³ userId, cargando sin filtro.');
      const snapshot = await getDocs(col);
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return list.sort((a, b) => {
        const dateA = a.fecha_actualizacion?.toMillis?.() || a.fecha_creacion?.toMillis?.() || 0;
        const dateB = b.fecha_actualizacion?.toMillis?.() || b.fecha_creacion?.toMillis?.() || 0;
        return dateB - dateA;
      });
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    // Si falla el Ã­ndice compuesto (aÃºn no creado en Firebase), degradar a fetch simple
    if (error.code === 'failed-precondition') {
      console.warn('fetchCotizacionesV2: Ã­ndice compuesto no disponible. Cargando sin filtro hasta que se cree el Ã­ndice.');
      const col = collection(db, 'cotizaciones_v2');
      const snapshot = await getDocs(col);
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return list.sort((a, b) => {
        const dateA = a.fecha_actualizacion?.toMillis?.() || a.fecha_creacion?.toMillis?.() || 0;
        const dateB = b.fecha_actualizacion?.toMillis?.() || b.fecha_creacion?.toMillis?.() || 0;
        return dateB - dateA;
      });
    }
    console.error('Error obteniendo cotizaciones_v2:', error);
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

