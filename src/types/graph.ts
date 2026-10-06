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
  /** Aristas del corte mínimo (flujo máximo). */
  aristasCorte?: string[]
  /** Texto a mostrar sobre cada arista en lugar del peso (flujo/capacidad). Clave: id de arista. */
  etiquetasAristas?: Record<string, string>
  /** Texto de aviso si hubo un empate en este paso. */
  empate?: string
  /** Índice de iteración asociada (tabla de etiquetas de Dijkstra, flujo por arco de Ford-Fulkerson). */
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

export interface ArcoFlujo {
  aristaId: string
  desde: string // nombre; el flujo va de `desde` a `hasta`
  hasta: string // nombre
  capacidad: number
  flujo: number
}

export interface IteracionFlujo {
  numero: number // 0 = estado inicial (sin flujo)
  camino: string[] // nombres del camino de aumento
  cuello: number // cuello de botella k
  flujoAcumulado: number
  /** Flujo de cada arco al terminar la iteración. */
  arcos: ArcoFlujo[]
}

export interface CorteMinimo {
  ladoFuente: string[] // nombres
  ladoSumidero: string[] // nombres
  arcos: { aristaId: string; desde: string; hasta: string; capacidad: number }[]
  capacidad: number
}

export interface ResultadoFlujo {
  tipo: 'flujo'
  fuente: string // nombre
  sumidero: string // nombre
  flujoMaximo: number
  iteraciones: IteracionFlujo[]
  corte: CorteMinimo
}

/** Unión discriminada por `tipo`. Para Floyd/Bellman-Ford se suman variantes nuevas. */
export type Resultado = ResultadoArbol | ResultadoRuta | ResultadoFlujo

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

/** Colores con los que se resalta un paso sobre el grafo. */
export type ClaseLeyenda = 'evaluada' | 'incluida' | 'resultado' | 'descartada' | 'corte'

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
  /** Textos de la leyenda de colores, si no sirven los generales. */
  leyenda?: Partial<Record<ClaseLeyenda, string>>
  validar(grafo: Grafo, parametros: Parametros): Validacion
  ejecutar(grafo: Grafo, parametros: Parametros): Ejecucion
}
