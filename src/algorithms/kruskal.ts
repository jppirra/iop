import type { Arista, AristaElegida, Ejecucion, Estrategia, Grafo, Paso, ResultadoArbol } from '../types/graph'
import {
  describirArista,
  esConexo,
  mapaNombres,
  reemplazosEquivalentes,
  validacionVacia,
  validarGrafoNoVacio,
} from './utils'

class ConjuntosDisjuntos {
  private padre = new Map<string, string>()

  constructor(ids: string[]) {
    for (const id of ids) this.padre.set(id, id)
  }

  buscar(id: string): string {
    let raiz = id
    while (this.padre.get(raiz) !== raiz) raiz = this.padre.get(raiz)!
    // compresión de caminos
    let actual = id
    while (actual !== raiz) {
      const siguiente = this.padre.get(actual)!
      this.padre.set(actual, raiz)
      actual = siguiente
    }
    return raiz
  }

  unir(a: string, b: string): void {
    this.padre.set(this.buscar(a), this.buscar(b))
  }
}

/**
 * Árbol de expansión mínima con Kruskal: se recorren las aristas de menor a mayor
 * y se agrega cada una que no forme ciclo. El orden entre aristas de igual peso
 * respeta el orden de carga (ordenamiento estable).
 */
export function kruskal(grafoOriginal: Grafo): Ejecucion<ResultadoArbol> {
  const grafo: Grafo = { ...grafoOriginal, dirigido: false }
  const nombre = mapaNombres(grafo)
  const ordenadas = grafo.aristas.filter((a) => a.origen !== a.destino).sort((a, b) => a.peso - b.peso)
  const conjuntos = new ConjuntosDisjuntos(grafo.nodos.map((n) => n.id))
  const elegidas: Arista[] = []
  const descartadas: Arista[] = []
  const aristasElegidas: AristaElegida[] = []
  const incluidos = new Set<string>()
  const pasos: Paso[] = []
  const objetivo = Math.max(grafo.nodos.length - 1, 0)
  let total = 0

  const estado = () => ({
    nodosIncluidos: [...incluidos],
    aristasIncluidas: elegidas.map((a) => a.id),
    aristasDescartadas: descartadas.map((a) => a.id),
  })

  pasos.push({
    titulo: 'Inicio',
    descripcion:
      ordenadas.length > 0
        ? `Se ordenan las aristas de menor a mayor distancia: ${ordenadas.map((a) => `${describirArista(a, nombre)} (${a.peso})`).join(', ')}.`
        : 'El grafo no tiene aristas.',
    nodosActuales: [],
    aristasEvaluadas: ordenadas.map((a) => a.id),
    ...estado(),
  })

  for (let i = 0; i < ordenadas.length && elegidas.length < objetivo; i++) {
    const a = ordenadas[i]
    const grupoOrigen = conjuntos.buscar(a.origen)
    const grupoDestino = conjuntos.buscar(a.destino)
    const desc = describirArista(a, nombre)

    if (grupoOrigen === grupoDestino) {
      descartadas.push(a)
      pasos.push({
        titulo: `Evaluar ${desc}`,
        descripcion: `Se descarta la arista ${desc} (distancia ${a.peso}) porque sus nodos ya están conectados: formaría un ciclo.`,
        nodosActuales: [a.origen, a.destino],
        aristasEvaluadas: [a.id],
        ...estado(),
      })
      continue
    }

    // ¿Hay otra arista pendiente con el mismo peso que uniría los mismos dos grupos?
    const alternativas = ordenadas.slice(i + 1).filter((b) => {
      if (b.peso !== a.peso) return false
      const g1 = conjuntos.buscar(b.origen)
      const g2 = conjuntos.buscar(b.destino)
      return (g1 === grupoOrigen && g2 === grupoDestino) || (g1 === grupoDestino && g2 === grupoOrigen)
    })

    conjuntos.unir(a.origen, a.destino)
    elegidas.push(a)
    incluidos.add(a.origen)
    incluidos.add(a.destino)
    total += a.peso
    aristasElegidas.push({ aristaId: a.id, desde: nombre(a.origen), hasta: nombre(a.destino), peso: a.peso })

    pasos.push({
      titulo: `Agregar ${desc}`,
      descripcion: `Se agrega la arista ${desc} porque es la más corta que queda (distancia ${a.peso}) y no forma ciclo. Distancia acumulada: ${total}.`,
      nodosActuales: [a.origen, a.destino],
      aristasEvaluadas: [a.id],
      empate:
        alternativas.length > 0
          ? `Empate: ${alternativas.map((b) => describirArista(b, nombre)).join(', ')} también tiene distancia ${a.peso} y une los mismos grupos. Hay más de una solución óptima.`
          : undefined,
      ...estado(),
    })
  }

  const conexo = esConexo(grafo)
  const nodosSinConectar = conexo
    ? []
    : grafo.nodos.filter((n) => conjuntos.buscar(n.id) !== conjuntos.buscar(grafo.nodos[0].id)).map((n) => n.nombre)
  const detalleEmpates = reemplazosEquivalentes(grafo, elegidas)

  pasos.push({
    titulo: 'Resultado',
    descripcion: conexo
      ? `Se eligieron ${elegidas.length} aristas (n − 1) y todos los nodos quedaron conectados. Distancia total mínima: ${total}.`
      : `El grafo no es conexo: se obtuvo un bosque (varios árboles separados) con distancia ${total}. Nodos fuera del componente de ${grafo.nodos[0]?.nombre}: ${nodosSinConectar.join(', ')}.`,
    nodosActuales: [],
    aristasEvaluadas: [],
    ...estado(),
    aristasResultado: elegidas.map((a) => a.id),
    empate:
      detalleEmpates.length > 0
        ? 'Existen soluciones óptimas múltiples (otro árbol con la misma distancia total).'
        : undefined,
  })

  return {
    pasos,
    resultado: {
      tipo: 'arbol',
      aristas: aristasElegidas,
      total,
      conexo,
      nodosSinConectar,
      solucionesMultiples: detalleEmpates.length > 0,
      detalleEmpates,
    },
  }
}

export const estrategia: Estrategia = {
  id: 'kruskal',
  nombre: 'Árbol mínimo - Kruskal',
  grupo: 'Árbol de expansión mínima',
  descripcion: 'Recorre las aristas de menor a mayor y agrega cada una que no forme un ciclo.',
  orden: 20,
  parametros: [],
  forzarNoDirigido: true,
  validar(grafo) {
    const v = validacionVacia()
    validarGrafoNoVacio(grafo, v)
    if (v.errores.length) return v
    if (!esConexo(grafo)) v.advertencias.push('El grafo no es conexo: el resultado será un bosque, no un árbol.')
    return v
  },
  ejecutar: (grafo) => kruskal(grafo),
}
