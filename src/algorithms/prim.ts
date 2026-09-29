import type { Arista, AristaElegida, Ejecucion, Estrategia, Grafo, Paso, ResultadoArbol } from '../types/graph'
import {
  describirArista,
  esConexo,
  mapaNombres,
  reemplazosEquivalentes,
  validacionVacia,
  validarGrafoNoVacio,
  validarParametroNodo,
} from './utils'

/**
 * Árbol de expansión mínima con el método del libro (Prim):
 * desde los nodos conectados, se conecta el nodo no conectado más cercano.
 * El grafo se trata siempre como no dirigido. Los empates se resuelven
 * tomando la primera arista en el orden de carga.
 */
export function prim(grafoOriginal: Grafo, inicio: string): Ejecucion<ResultadoArbol> {
  const grafo: Grafo = { ...grafoOriginal, dirigido: false }
  const nombre = mapaNombres(grafo)
  const conectados = new Set([inicio])
  const elegidas: Arista[] = []
  const aristasElegidas: AristaElegida[] = []
  const pasos: Paso[] = []
  let total = 0

  const estado = () => ({
    nodosIncluidos: [...conectados],
    aristasIncluidas: elegidas.map((a) => a.id),
    aristasDescartadas: [],
  })

  pasos.push({
    titulo: 'Inicio',
    descripcion: `Se elige el nodo ${nombre(inicio)} como punto de partida. Es el único nodo conectado por ahora.`,
    nodosActuales: [inicio],
    aristasEvaluadas: [],
    ...estado(),
  })

  while (conectados.size < grafo.nodos.length) {
    const candidatas = grafo.aristas.filter((a) => conectados.has(a.origen) !== conectados.has(a.destino))
    if (candidatas.length === 0) break

    const minimo = Math.min(...candidatas.map((a) => a.peso))
    const empatadas = candidatas.filter((a) => a.peso === minimo)
    const elegida = empatadas[0]
    const desde = conectados.has(elegida.origen) ? elegida.origen : elegida.destino
    const hacia = desde === elegida.origen ? elegida.destino : elegida.origen

    conectados.add(hacia)
    elegidas.push(elegida)
    total += elegida.peso
    aristasElegidas.push({ aristaId: elegida.id, desde: nombre(desde), hasta: nombre(hacia), peso: elegida.peso })

    let empate: string | undefined
    if (empatadas.length > 1) {
      const lista = empatadas.map((a) => describirArista(a, nombre)).join(', ')
      empate = `Empate: las aristas ${lista} tienen la misma distancia (${minimo}). Se eligió ${describirArista(elegida, nombre)} de forma arbitraria; un empate sugiere que puede existir más de una solución óptima.`
    }

    pasos.push({
      titulo: `Paso ${elegidas.length}`,
      descripcion: `Se conecta el nodo ${nombre(hacia)} con el ${nombre(desde)} porque es el nodo no conectado más cercano a los ya conectados, distancia ${minimo}. Distancia acumulada: ${total}.`,
      nodosActuales: [hacia],
      aristasEvaluadas: candidatas.map((a) => a.id),
      empate,
      ...estado(),
    })
  }

  const conexo = conectados.size === grafo.nodos.length
  const nodosSinConectar = grafo.nodos.filter((n) => !conectados.has(n.id)).map((n) => n.nombre)
  const detalleEmpates = reemplazosEquivalentes(grafo, elegidas)

  pasos.push({
    titulo: 'Resultado',
    descripcion: conexo
      ? `Todos los nodos quedaron conectados con ${elegidas.length} aristas. Distancia total mínima: ${total}.`
      : `No se pueden conectar los nodos ${nodosSinConectar.join(', ')}: el grafo no es conexo. Árbol parcial con distancia ${total}.`,
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
  id: 'prim',
  nombre: 'Árbol mínimo - Prim',
  grupo: 'Árbol de expansión mínima',
  descripcion: 'Conecta, uno por uno, el nodo no conectado más cercano a los ya conectados.',
  orden: 10,
  parametros: [{ clave: 'inicio', etiqueta: 'nodo inicial' }],
  forzarNoDirigido: true,
  validar(grafo, parametros) {
    const v = validacionVacia()
    validarGrafoNoVacio(grafo, v)
    if (v.errores.length) return v
    validarParametroNodo(grafo, parametros, 'inicio', 'nodo inicial', v)
    if (!esConexo(grafo)) v.advertencias.push('El grafo no es conexo: no existe un árbol que conecte todos los nodos.')
    return v
  },
  ejecutar: (grafo, parametros) => prim(grafo, parametros.inicio!),
}
