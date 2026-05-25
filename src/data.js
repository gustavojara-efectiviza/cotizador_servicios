// Base de datos de tiempos y costos base (Motor Bottom-Up)
export const equipmentData = [
  { tension: "500 kV", equipo: "Interruptor", dias_equipo: 0.5, interno: 1, externo: 0, ayudante: 2, hospedaje: 0.5, viatico: 1, costo_total_base: 1224500 },
  { tension: "500 kV", equipo: "Seccionador C/PAT", dias_equipo: 0.3, interno: 1, externo: 0, ayudante: 2, hospedaje: 0.3, viatico: 0.5, costo_total_base: 1165500 },
  { tension: "500 kV", equipo: "Seccionador C/PAT Monopolar", dias_equipo: 0.3, interno: 1, externo: 0, ayudante: 2, hospedaje: 0.3, viatico: 0.5, costo_total_base: 1165500 },
  { tension: "500 kV", equipo: "Seccionador", dias_equipo: 0.3, interno: 1, externo: 0, ayudante: 2, hospedaje: 0.3, viatico: 0.5, costo_total_base: 1165500 },
  { tension: "500 kV", equipo: "Seccionador Pantografo", dias_equipo: 0.5, interno: 1, externo: 0, ayudante: 2, hospedaje: 0.5, viatico: 0.5, costo_total_base: 1174500 },
  { tension: "500 kV", equipo: "Transformador De Corriente", dias_equipo: 0.2, interno: 1, externo: 0, ayudante: 2, hospedaje: 0.2, viatico: 0.5, costo_total_base: 1161000 },
  { tension: "500 kV", equipo: "Transformador De Tensión", dias_equipo: 0.17, interno: 1, externo: 0, ayudante: 2, hospedaje: 0.17, viatico: 0.5, costo_total_base: 1159650 },
  { tension: "500 kV", equipo: "Descargador", dias_equipo: 0.17, interno: 1, externo: 0, ayudante: 1, hospedaje: 0.17, viatico: 0.17, costo_total_base: 800650 },
  { tension: "500 kV", equipo: "Trampa de Onda", dias_equipo: 0.2, interno: 1, externo: 0, ayudante: 2, hospedaje: 0.2, viatico: 0.5, costo_total_base: 1000000 },
  { tension: "500 kV", equipo: "Autotransformador Monofásico", dias_equipo: 8, interno: 1, externo: 1, ayudante: 2, hospedaje: 8, viatico: 8, costo_total_base: 2688000, costo_medicion_base: 1500000 },
  { tension: "500 kV", equipo: "Transformador Trifásico", dias_equipo: 8, interno: 1, externo: 1, ayudante: 2, hospedaje: 8, viatico: 8, costo_total_base: 2688000, costo_medicion_base: 1500000 },
  { tension: "220 kV", equipo: "Interruptor", dias_equipo: 0.5, interno: 1, externo: 0, ayudante: 1, hospedaje: 0.5, viatico: 0.5, costo_total_base: 848500 },
  { tension: "220 kV", equipo: "Seccionador C/PAT", dias_equipo: 0.3, interno: 1, externo: 0, ayudante: 1, hospedaje: 0.3, viatico: 0.3, costo_total_base: 819500 },
  { tension: "220 kV", equipo: "Seccionador Tripolar", dias_equipo: 0.3, interno: 1, externo: 0, ayudante: 1, hospedaje: 0.3, viatico: 0.3, costo_total_base: 819500 },
  { tension: "220 kV", equipo: "Seccionador Monopolar", dias_equipo: 0.3, interno: 1, externo: 0, ayudante: 1, hospedaje: 0.3, viatico: 0.3, costo_total_base: 819500 },
  { tension: "220 kV", equipo: "Seccionador Pantografo", dias_equipo: 0.5, interno: 1, externo: 0, ayudante: 1, hospedaje: 0.3, viatico: 0.5, costo_total_base: 839500 },
  { tension: "220 kV", equipo: "Seccionador Semi-Pantografo Vertical", dias_equipo: 0.5, interno: 1, externo: 0, ayudante: 1, hospedaje: 0.5, viatico: 0.5, costo_total_base: 848500 },
  { tension: "220 kV", equipo: "Seccionador", dias_equipo: 0.3, interno: 1, externo: 0, ayudante: 1, hospedaje: 0.3, viatico: 0.3, costo_total_base: 819500 },
  { tension: "220 kV", equipo: "Transformador De Corriente", dias_equipo: 0.2, interno: 1, externo: 0, ayudante: 1, hospedaje: 0.2, viatico: 0.2, costo_total_base: 805000 },
  { tension: "220 kV", equipo: "Transformador De Tensión", dias_equipo: 0.17, interno: 1, externo: 0, ayudante: 1, hospedaje: 0.17, viatico: 0.17, costo_total_base: 800650 },
  { tension: "220 kV", equipo: "Descargador", dias_equipo: 0.17, interno: 1, externo: 0, ayudante: 1, hospedaje: 0.17, viatico: 0.17, costo_total_base: 800650 },
  { tension: "220 kV", equipo: "Trampa de Onda", dias_equipo: 0.2, interno: 1, externo: 0, ayudante: 1, hospedaje: 0.2, viatico: 0.2, costo_total_base: 805000 },
  { tension: "220 kV", equipo: "Transformador Monofásico", dias_equipo: 4, interno: 1, externo: 0, ayudante: 1, hospedaje: 4, viatico: 4, costo_total_base: 1356000, costo_medicion_base: 1500000 },
  { tension: "220 kV", equipo: "Autotransformador Monofásico", dias_equipo: 4, interno: 1, externo: 0, ayudante: 1, hospedaje: 4, viatico: 4, costo_total_base: 1356000, costo_medicion_base: 5400000 },
  { tension: "220 kV", equipo: "Transformador Trifásico", dias_equipo: 4, interno: 1, externo: 0, ayudante: 1, hospedaje: 4, viatico: 4, costo_total_base: 1356000, costo_medicion_base: 1500000 },
  { tension: "66 kV", equipo: "Interruptor", dias_equipo: 0.5, interno: 1, externo: 0, ayudante: 1, hospedaje: 0.5, viatico: 0.5, costo_total_base: 848500 },
  { tension: "66 kV", equipo: "Seccionador C/PAT", dias_equipo: 0.3, interno: 1, externo: 0, ayudante: 1, hospedaje: 0.3, viatico: 0.3, costo_total_base: 819500 },
  { tension: "66 kV", equipo: "Seccionador", dias_equipo: 0.3, interno: 1, externo: 0, ayudante: 1, hospedaje: 0.3, viatico: 0.3, costo_total_base: 819500 },
  { tension: "66 kV", equipo: "Transformador De Corriente", dias_equipo: 0.2, interno: 1, externo: 0, ayudante: 1, hospedaje: 0.2, viatico: 0.2, costo_total_base: 805000 },
  { tension: "66 kV", equipo: "Transformador De Tensión", dias_equipo: 0.17, interno: 1, externo: 0, ayudante: 1, hospedaje: 0.17, viatico: 0.17, costo_total_base: 800650 },
  { tension: "66 kV", equipo: "Descargador", dias_equipo: 0.17, interno: 1, externo: 0, ayudante: 1, hospedaje: 0.17, viatico: 0.17, costo_total_base: 800650 },
  { tension: "66 kV", equipo: "Trampa de Onda", dias_equipo: 0.2, interno: 1, externo: 0, ayudante: 1, hospedaje: 0.2, viatico: 0.2, costo_total_base: 805000 },
  { tension: "23 kV", equipo: "Celdas GIS 23kV", dias_equipo: 0.589, interno: 1, externo: 1, ayudante: 1, hospedaje: 0.589, viatico: 0.589, costo_total_base: 1287405 },
  { tension: "23 kV", equipo: "Celda de Llegada", dias_equipo: 0.589, interno: 1, externo: 1, ayudante: 1, hospedaje: 0.589, viatico: 0.589, costo_total_base: 1287405 },
  { tension: "23 kV", equipo: "Celda de Salida", dias_equipo: 0.589, interno: 1, externo: 1, ayudante: 1, hospedaje: 0.589, viatico: 0.589, costo_total_base: 1287405 },
  { tension: "23 kV", equipo: "Celda de Medición", dias_equipo: 0.589, interno: 1, externo: 1, ayudante: 1, hospedaje: 0.589, viatico: 0.589, costo_total_base: 1287405 },
  { tension: "23 kV", equipo: "Transformador De Tensión", dias_equipo: 0.17, interno: 1, externo: 0, ayudante: 1, hospedaje: 0.17, viatico: 0.17, costo_total_base: 800650 }
];

export const getTensions = () => [...new Set(equipmentData.map(e => e.tension))];
export const getEquipmentsByTension = (tension) => equipmentData.filter(e => e.tension === tension);

// ============================================================================
// NUEVO: MATRIZ DE PRECIOS DE MERCADO (Motor Top-Down)
// ============================================================================
// Esta matriz sobreescribe el costo base cuando se trata de equipos mayores
// garantizando el margen de ganancia real de mercado.
export const Maestro_Precios_Mercado = {
  Transformadores: {
    'Cat_A_Menor_30MVA': {
      Preventivo: 25000000,
      Integral: 50000000
    },
    'Cat_B_30_a_100MVA': { // Ejemplo: El Trafo de 80 MVA de ZUNZ
      Preventivo: 38000000,
      Integral: 75000000
    },
    'Cat_C_Mayor_100MVA': { // Ejemplo: Bancos de 500 kV
      Preventivo: 55000000,
      Integral: 110000000
    }
  }
};