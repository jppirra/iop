// Tipos del dominio. No dependen de React ni de Cytoscape.

export interface Nodo {
  id: string
  nombre: string
  x: number
  y: number
}

export interface Arista {
  id: string
  origen: string // id de nodo
  destino: string // id de nodo
  peso: number
}

export interface Grafo {
  dirigido: boolean
  nodos: Nodo[]
  aristas: Arista[]
}

/**
 * Un paso de la ejecución de un algoritmo, pensado para animarse.
 * Todas las listas contienen ids (de nodos o aristas).
 */
export interface Paso {
  titulo: string
  descripcion: string
  /** Nodo(s) protagonista(s) del paso (resaltado fuerte). */
  nodosActuales: string[]
  /** Aristas que se evaluaron/compararon en este paso. */
  aristasEvaluadas: string[]
  /** Nodos ya incorporados a la solución (árbol, etiqueta permanente, etc.). */
  nodosIncluidos: string[]
  /** Aristas que forman parte de la solución hasta este paso. */
  aristasIncluidas: string[]
  /** Aristas descartadas (por ejemplo, porque formarían un ciclo). */
  aristasDescartadas: string[]
  /** Aristas del resultado final (ruta encontrada, etc.). */
  aristasResultado?: string[]
  /** Texto de aviso si hubo un empate en este paso. */
  empate?: string
  /** Índice de iteración asociada (tabla de etiquetas de Dijkstra). */
  iteracion?: number
}

// ---------- Resultados ----------

export interface AristaElegida {
  aristaId: string
  desde: string // nombre
  hasta: string // nombre
  peso: number
}

export interface ResultadoArbol {
  tipo: 'arbol'
  aristas: AristaElegida[]
  total: number
  conexo: boolean
  nodosSinConectar: string[] // nombres
  solucionesMultiples: boolean
  detalleEmpates: string[]
}

export interface EtiquetaDijkstra {
  nodo: string // nombre
  distancia: number // Infinity si todavía no se alcanzó
  previo: string | null // nombre
  permanente: boolean
}

export interface IteracionDijkstra {
  numero: number
  nodoFijado: string | null // nombre
  etiquetas: EtiquetaDijkstra[]
}

export interface ResultadoRuta {
  tipo: 'ruta'
  origen: string // nombre
  destino: string // nombre
  ruta: string[] | null // nombres, null si no hay ruta
  distancia: number | null
  aristasRuta: string[] // ids
  iteraciones: IteracionDijkstra[]
  solucionesMultiples: boolean
  detalleEmpates: string[]
}

/** Unión discriminada por `tipo`. Para Ford-Fulkerson/Floyd se suman variantes nuevas. */
export type Resultado = ResultadoArbol | ResultadoRuta

export interface Ejecucion<R extends Resultado = Resultado> {
  pasos: Paso[]
  resultado: R
}

// ---------- Estrategias ----------

export type ClaveParametro = 'inicio' | 'origen' | 'destino'

export type Parametros = Partial<Record<ClaveParametro, string>> // ids de nodo

export interface Validacion {
  errores: string[]
  advertencias: string[]
}

export interface Estrategia {
  id: string
  nombre: string
  grupo: string
  descripcion: string
  /** Orden en el selector. */
  orden: number
  parametros: { clave: ClaveParametro; etiqueta: string }[]
  /** Prim y Kruskal trabajan siempre sobre el grafo no dirigido. */
  forzarNoDirigido?: boolean
  validar(grafo: Grafo, parametros: Parametros): Validacion
  ejecutar(grafo: Grafo, parametros: Parametros): Ejecucion
}
