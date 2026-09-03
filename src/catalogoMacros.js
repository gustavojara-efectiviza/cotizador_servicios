// =============================================================================
// CATALOGO DE MACROS / TEMPLATES DE SERVICIOS FRECUENTES
// =============================================================================
// Este archivo es la UNICA fuente de verdad para los precios de los templates.
// Para actualizar tarifas de subcontratistas, modificar SOLO este archivo.
// No tocar los handlers en Bloque2_SSTT.jsx.
//
// SEMANTICA: todos los precios aqui son el COSTO de subcontratacion (sin margen).
// El margen se aplica en el motor financiero segun overrides.margen_tercerizado.
// =============================================================================

/**
 * Catalogo de servicios frecuentes para el datalist de Capa 2.
 * Ultima revision de tarifas: Agosto 2026 (valores de mercado PY).
 */
export const CATALOGOS_SERVICIOS_FRECUENTES = [
  {
    label: 'Ensayo Fisico - Quimico de aceite aislante segun normas ASTM y IEC',
    tension: 'N/A',
    costo_total_base: 393746,
    is_tercerizado: true,
  },
  {
    label: 'Analisis de gases disueltos por cromatografia',
    tension: 'N/A',
    costo_total_base: 314997,
    is_tercerizado: true,
  },
  {
    label: 'Extraccion de muestra de aceite mineral aislante para ensayo',
    tension: 'N/A',
    costo_total_base: 293403,
    is_tercerizado: true,
  },
  {
    label: 'Limpiezas, mantenimientos, ajustes y controles de Trafo',
    tension: 'N/A',
    costo_total_base: 4662484,
    is_tercerizado: true,
  },
  {
    label: 'Mediciones, verificaciones y pruebas electricas de Trafo',
    tension: 'N/A',
    costo_total_base: 4790297,
    is_tercerizado: true,
  },
  {
    label: 'Tratamiento y Termovacio de Aceite Dielectrico en Trafo',
    tension: 'N/A',
    costo_total_base: 5500000,
    is_tercerizado: true,
  },
  {
    label: 'Suministro de Aceite Dielectrico Mineral (Tambor 200L)',
    tension: 'N/A',
    costo_total_base: 4800000,
    is_tercerizado: true,
  },
  {
    label: 'Inspeccion Termografica Infrarroja de Subestacion',
    tension: 'N/A',
    costo_total_base: 1800000,
    is_tercerizado: true,
  }
];

const _buildItem = (equipo, tension, costo_total_base, margen) => ({
  id: crypto.randomUUID(),
  tension: tension || 'N/A',
  equipo,
  cantidad: 1,
  baseData: { equipo, tension: tension || 'N/A', horas_equipo: 0, horas_servicio: 0, interno: 0, ayudante: 0, externo: 0, costo_total_base },
  overrides: { is_tercerizado: true, modo_subcontrato: 'fijo', costo_total_base, margen_tercerizado: margen }
});

/**
 * Paquete Mantenimiento Basico de Trafo (3 items: ensayos de laboratorio).
 */
export const buildMacroPaqueteTrafo = (margenTercerizado = 30) => {
  const labels = [
    'Ensayo Fisico - Quimico de aceite aislante segun normas ASTM y IEC',
    'Analisis de gases disueltos por cromatografia',
    'Extraccion de muestra de aceite mineral aislante para ensayo'
  ];
  return CATALOGOS_SERVICIOS_FRECUENTES
    .filter(s => labels.some(l => s.label.startsWith(l)))
    .map(s => _buildItem(s.label, s.tension, s.costo_total_base, margenTercerizado));
};

/**
 * Paquete PCP Completo (5 items) - Mantenimiento Integral Transformadores de Distribucion.
 */
export const buildMacroPCPCompleto = (margenTercerizado = 30) => {
  const ITEMS_PCP = [
    { equipo: 'Ensayo Fisico - Quimico de aceite aislante segun normas ASTM y IEC (Pto I-II)', costo_total_base: 393746 },
    { equipo: 'Analisis de gases disueltos por cromatografia (Pto III)', costo_total_base: 314997 },
    { equipo: 'Limpiezas, mantenimientos, ajustes, controles (Pto IV al X)', costo_total_base: 4662484 },
    { equipo: 'Mediciones, verificaciones y pruebas (Pto XI al XXIV)', costo_total_base: 4790297 },
    { equipo: 'Extraccion de muestra de aceite mineral aislante para ensayo (Pto XXV)', costo_total_base: 293403 }
  ];
  return ITEMS_PCP.map(item => _buildItem(item.equipo, 'N/A', item.costo_total_base, margenTercerizado));
};

/**
 * Convierte un item del catalogo de servicios frecuentes a un item de carrito.
 * Usado por el handler del datalist (Capa 2).
 */
export const buildItemFromCatalogEntry = (catalogEntry, qty = 1, margenTercerizado = 30) => ({
  ..._buildItem(catalogEntry.label, catalogEntry.tension, catalogEntry.costo_total_base || 0, margenTercerizado),
  cantidad: qty
});
