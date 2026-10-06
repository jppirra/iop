import type { Estrategia } from '../types/graph'
import archivoConfig from './config.json'

/** Qué partes de la app se muestran. Se edita desde /config. */
export interface Configuracion {
  /** Ids de las estrategias habilitadas (al menos una). */
  estrategias: string[]
  pantallaInicio: boolean
  /** Botón Paso a paso, controles de pasos y leyenda. */
  pasoAPaso: boolean
  /** Reproducción automática de los pasos y transiciones de color. */
  animaciones: boolean
  /** Lista "Todos los pasos" en el panel de resultados. */
  historialPasos: boolean
  ejemplosLibro: boolean
  aleatorio: boolean
  cargaMasiva: boolean
  exportar: boolean
  /** Enlace para descargar un JSON de ejemplo en Carga masiva. */
  ejemploJson: boolean
  integrantes: boolean
  leyenda: boolean
}

export type ComponenteConfigurable = Exclude<keyof Configuracion, 'estrategias'>

export const COMPONENTES: { clave: ComponenteConfigurable; titulo: string; descripcion: string; dependeDe?: ComponenteConfigurable }[] = [
  { clave: 'pantallaInicio', titulo: 'Pantalla de inicio', descripcion: 'Panel para elegir algoritmo y tipo de carga al abrir la web, y botón "Inicio".' },
  { clave: 'pasoAPaso', titulo: 'Paso a paso', descripcion: 'Botón "Paso a paso", controles (Anterior, Siguiente, Final…) y leyenda de colores. Si se oculta, Ejecutar muestra el resultado.' },
  { clave: 'leyenda', titulo: 'Leyenda de colores', descripcion: 'Referencia de colores debajo de los controles.', dependeDe: 'pasoAPaso' },
  { clave: 'animaciones', titulo: 'Animaciones', descripcion: 'Ejecutar reproduce los pasos solos y los colores cambian con transición. Si se desactiva, Ejecutar va directo al resultado.' },
  { clave: 'historialPasos', titulo: 'Todos los pasos', descripcion: 'Lista con la explicación de cada paso en el panel de resultados.' },
  { clave: 'ejemplosLibro', titulo: 'Ejemplos del libro', descripcion: 'Menú de la cabecera con Lauderdale, Leadville y Ray Design.' },
  { clave: 'aleatorio', titulo: 'Ejemplo aleatorio', descripcion: 'Botón "Aleatorio" y opción en la pantalla de inicio.' },
  { clave: 'cargaMasiva', titulo: 'Carga masiva', descripcion: 'Pestaña para pegar o subir texto, CSV o JSON.' },
  { clave: 'exportar', titulo: 'Exportar', descripcion: 'Botones para descargar el grafo en JSON o CSV (dentro de Carga masiva).', dependeDe: 'cargaMasiva' },
  { clave: 'ejemploJson', titulo: 'JSON de ejemplo', descripcion: 'Enlace para descargar un archivo JSON de ejemplo, listo para editar y subir (dentro de Carga masiva).', dependeDe: 'cargaMasiva' },
  { clave: 'integrantes', titulo: 'Integrantes', descripcion: 'Botón con la lista de integrantes del grupo.' },
]

export const CLAVE_ALMACENAMIENTO = 'grupo3-iop:configuracion'

export function configPorDefecto(todas: Estrategia[]): Configuracion {
  return {
    estrategias: todas.map((e) => e.id),
    pantallaInicio: true,
    pasoAPaso: true,
    animaciones: true,
    historialPasos: true,
    ejemplosLibro: true,
    aleatorio: true,
    cargaMasiva: true,
    exportar: true,
    ejemploJson: true,
    integrantes: true,
    leyenda: true,
  }
}

/**
 * Normaliza una configuración guardada: descarta estrategias que ya no existen,
 * completa las claves faltantes con `base` y garantiza que quede al menos una estrategia.
 */
export function normalizar(crudo: unknown, todas: Estrategia[], base: Configuracion = configPorDefecto(todas)): Configuracion {
  if (typeof crudo !== 'object' || crudo === null) return base
  const datos = crudo as Record<string, unknown>
  const resultado = { ...base }

  for (const { clave } of COMPONENTES) if (typeof datos[clave] === 'boolean') resultado[clave] = datos[clave] as boolean

  if (Array.isArray(datos.estrategias)) {
    const ids = new Set(todas.map((e) => e.id))
    const validas = datos.estrategias.filter((id): id is string => typeof id === 'string' && ids.has(id))
    if (validas.length > 0) resultado.estrategias = todas.map((e) => e.id).filter((id) => validas.includes(id))
  }
  return resultado
}

export function estrategiasVisibles(config: Configuracion, todas: Estrategia[]): Estrategia[] {
  return todas.filter((e) => config.estrategias.includes(e.id))
}

/** La opción dirigido/no dirigido solo tiene sentido si algún algoritmo visible acepta grafos dirigidos. */
export function permiteDirigido(config: Configuracion, todas: Estrategia[]): boolean {
  return estrategiasVisibles(config, todas).some((e) => !e.forzarNoDirigido)
}

// ---------- Configuración del proyecto (src/config/config.json) ----------

/** La que ven todos: se incluye en el build. Para cambiarla se edita config.json y se hace push. */
export function configDelProyecto(todas: Estrategia[]): Configuracion {
  return normalizar(archivoConfig, todas)
}

/** JSON listo para pegar en src/config/config.json. */
export function aJson(config: Configuracion): string {
  const { estrategias, ...componentes } = config
  const ordenados = Object.fromEntries(COMPONENTES.map(({ clave }) => [clave, componentes[clave]]))
  return JSON.stringify({ estrategias, ...ordenados }, null, 2) + '\n'
}

export const mismaConfig = (a: Configuracion, b: Configuracion) => aJson(a) === aJson(b)

// ---------- Configuración local (localStorage de este navegador) ----------

/** Config local si existe (cambios hechos en /config en este navegador); si no, la del proyecto. */
export function leerConfig(todas: Estrategia[]): Configuracion {
  const proyecto = configDelProyecto(todas)
  try {
    const texto = localStorage.getItem(CLAVE_ALMACENAMIENTO)
    return texto ? normalizar(JSON.parse(texto), todas, proyecto) : proyecto
  } catch {
    return proyecto
  }
}

export function tieneConfigLocal(): boolean {
  try {
    return localStorage.getItem(CLAVE_ALMACENAMIENTO) !== null
  } catch {
    return false
  }
}

/** Guarda la config local; si coincide con la del proyecto se borra, así sigue los cambios futuros del repo. */
export function guardarConfig(config: Configuracion, todas: Estrategia[]): void {
  try {
    if (mismaConfig(config, configDelProyecto(todas))) localStorage.removeItem(CLAVE_ALMACENAMIENTO)
    else localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(config))
  } catch {
    // almacenamiento bloqueado (modo privado, etc.): la config queda solo en memoria
  }
}
