import type {
  Arista,
  Ejecucion,
  Estrategia,
  Grafo,
  IteracionDijkstra,
  Paso,
  ResultadoRuta,
} from '../types/graph'
import {
  describirArista,
  listaAdyacencia,
  mapaNombres,
  validacionVacia,
  validarGrafoNoVacio,
  validarParametroNodo,
} from './utils'

const fmt = (d: number) => (Number.isFinite(d) ? String(d) : '∞')

/**
 * Ruta más corta (Dijkstra, técnica de la ruta más corta del libro).
 * En cada iteración se fija (etiqueta permanente) el nodo no fijado con menor
 * distancia acumulada y se actualizan las etiquetas de sus vecinos.
 * Termina al fijar el destino o cuando no quedan nodos alcanzables.
 */
export function dijkstra(grafo: Grafo, origen: string, destino: string): Ejecucion<ResultadoRuta> {
  const nombre = mapaNombres(grafo)
  const ady = listaAdyacencia(grafo)
  const dist = new Map(grafo.nodos.map((n) => [n.id, Infinity]))
  const previo = new Map<string, { nodo: string; arista: Arista } | null>(grafo.nodos.map((n) => [n.id, null]))
  const alternativas = new Map<string, string[]>() // nodo -> otros previos con igual distancia
  const permanentes = new Set<string>()
  const pasos: Paso[] = []
  const iteraciones: IteracionDijkstra[] = []
  dist.set(origen, 0)

  const foto = (numero: number, fijado: string | null): IteracionDijkstra => ({
    numero,
    nodoFijado: fijado ? nombre(fijado) : null,
    etiquetas: grafo.nodos.map((n) => ({
      nodo: n.nombre,
      distancia: dist.get(n.id)!,
      previo: previo.get(n.id) ? nombre(previo.get(n.id)!.nodo) : null,
      permanente: permanentes.has(n.id),
    })),
  })

  const arbolActual = () =>
    [...permanentes].map((id) => previo.get(id)?.arista.id).filter((id): id is string => !!id)

  iteraciones.push(foto(0, null))
  pasos.push({
    titulo: 'Inicio',
    descripcion: `El origen ${nombre(origen)} recibe distancia 0; el resto de los nodos arranca con distancia ∞ (todavía no se alcanzaron).`,
    nodosActuales: [origen],
    aristasEvaluadas: [],
    nodosIncluidos: [],
    aristasIncluidas: [],
    aristasDescartadas: [],
    iteracion: 0,
  })

  while (!permanentes.has(destino)) {
    const candidatos = grafo.nodos.filter((n) => !permanentes.has(n.id) && Number.isFinite(dist.get(n.id)!))
    if (candidatos.length === 0) break

    const minimo = Math.min(...candidatos.map((n) => dist.get(n.id)!))
    const u = candidatos.find((n) => dist.get(n.id) === minimo)!.id
    permanentes.add(u)

    const cambios: string[] = []
    const empates: string[] = []
    const evaluadas: string[] = []
    for (const { nodo: v, arista } of ady.get(u) ?? []) {
      if (permanentes.has(v)) continue
      evaluadas.push(arista.id)
      const nueva = minimo + arista.peso
      const actual = dist.get(v)!
      if (nueva < actual) {
        dist.set(v, nueva)
        previo.set(v, { nodo: u, arista })
        alternativas.delete(v)
        cambios.push(`${nombre(v)}: ${fmt(actual)} → ${nueva}`)
      } else if (nueva === actual) {
        alternativas.set(v, [...(alternativas.get(v) ?? []), u])
        empates.push(
          `llegar a ${nombre(v)} por ${nombre(u)} también cuesta ${nueva}, igual que por ${nombre(previo.get(v)!.nodo)}`,
        )
      }
    }

    const numero = iteraciones.length
    iteraciones.push(foto(numero, u))

    const porQue =
      u === origen
        ? `Se fija el origen ${nombre(u)} con distancia 0.`
        : `Se fija el nodo ${nombre(u)} con distancia ${minimo} (llegando desde ${nombre(previo.get(u)!.nodo)}) porque es el nodo sin fijar más cercano al origen.`
    const actualizacion =
      cambios.length > 0 ? ` Se actualizan las etiquetas: ${cambios.join('; ')}.` : ' No mejora ninguna etiqueta.'

    pasos.push({
      titulo: `Iteración ${numero}`,
      descripcion: porQue + actualizacion,
      nodosActuales: [u],
      aristasEvaluadas: evaluadas,
      nodosIncluidos: [...permanentes],
      aristasIncluidas: arbolActual(),
      aristasDescartadas: [],
      empate: empates.length > 0 ? `Empate: ${empates.join('; ')}.` : undefined,
      iteracion: numero,
    })
  }

  let ruta: string[] | null = null
  const aristasRuta: string[] = []
  let distancia: number | null = null
  const detalleEmpates: string[] = []

  if (permanentes.has(destino)) {
    const ids: string[] = []
    let actual: string = destino
    while (true) {
      ids.unshift(actual)
      const p = previo.get(actual)
      if (!p) break
      aristasRuta.unshift(p.arista.id)
      actual = p.nodo
    }
    ruta = ids.map(nombre)
    distancia = dist.get(destino)!
    for (const id of ids) {
      for (const otro of alternativas.get(id) ?? []) {
        detalleEmpates.push(
          `A ${nombre(id)} se llega con la misma distancia (${dist.get(id)}) desde ${nombre(otro)} o desde ${nombre(previo.get(id)!.nodo)}.`,
        )
      }
    }
  }

  pasos.push({
    titulo: 'Resultado',
    descripcion: ruta
      ? `Ruta más corta de ${nombre(origen)} a ${nombre(destino)}: ${ruta.join(' → ')}, con distancia total ${distancia}.`
      : `No hay ruta desde ${nombre(origen)} hasta ${nombre(destino)}${grafo.dirigido ? ' respetando el sentido de los arcos' : ''}.`,
    nodosActuales: [],
    aristasEvaluadas: [],
    nodosIncluidos: [...permanentes],
    aristasIncluidas: arbolActual(),
    aristasDescartadas: [],
    aristasResultado: aristasRuta,
    empate: detalleEmpates.length > 0 ? 'Existen rutas óptimas múltiples (misma distancia total).' : undefined,
    iteracion: iteraciones.length - 1,
  })

  return {
    pasos,
    resultado: {
      tipo: 'ruta',
      origen: nombre(origen),
      destino: nombre(destino),
      ruta,
      distancia,
      aristasRuta,
      iteraciones,
      solucionesMultiples: detalleEmpates.length > 0,
      detalleEmpates,
    },
  }
}

export const estrategia: Estrategia = {
  id: 'dijkstra',
  nombre: 'Ruta más corta - Dijkstra',
  grupo: 'Ruta más corta',
  descripcion: 'Fija en cada iteración el nodo más cercano al origen y actualiza las distancias de sus vecinos.',
  orden: 30,
  parametros: [
    { clave: 'origen', etiqueta: 'nodo origen' },
    { clave: 'destino', etiqueta: 'nodo destino' },
  ],
  validar(grafo, parametros) {
    const v = validacionVacia()
    validarGrafoNoVacio(grafo, v)
    if (v.errores.length) return v
    validarParametroNodo(grafo, parametros, 'origen', 'nodo origen', v)
    validarParametroNodo(grafo, parametros, 'destino', 'nodo destino', v)
    if (parametros.origen && parametros.origen === parametros.destino)
      v.errores.push('El origen y el destino tienen que ser nodos distintos.')
    const nombre = mapaNombres(grafo)
    const negativas = grafo.aristas.filter((a) => a.peso < 0)
    if (negativas.length > 0)
      v.errores.push(
        `Dijkstra no admite pesos negativos: ${negativas.map((a) => `${describirArista(a, nombre, grafo.dirigido)} (${a.peso})`).join(', ')}.`,
      )
    return v
  },
  ejecutar: (grafo, parametros) => dijkstra(grafo, parametros.origen!, parametros.destino!),
}
