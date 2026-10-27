import type { Grafo } from '../types/graph'

type Posiciones = Record<string, { x: number; y: number }>

const SEPARACION_X = 110
const SEPARACION_Y = 80

/** Orden natural: "2" antes que "10", "A2" antes que "A10"; los nombres no numéricos, alfabéticos. */
const compararNombres = (a: string, b: string) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' })

/** Mismo ancho que dibuja el lienzo (ver `GraphCanvas`). */
const anchoNodo = (nombre: string) => Math.max(34, nombre.length * 8 + 18)

/**
 * Acomoda los nodos en columnas de izquierda a derecha siguiendo las aristas, y dentro de cada
 * columna los ordena por nombre (numérico si son números). Determinístico y sin superposiciones.
 *
 * - Dirigido: la columna de un nodo es el camino más largo desde un nodo sin predecesores, así
 *   toda arista va hacia la derecha (redes CPM/PERT, flujo). Los ciclos se resuelven con BFS.
 * - No dirigido: BFS desde el nodo de menor nombre de cada componente.
 * - Sin aristas: grilla en orden.
 */
export function organizar(grafo: Grafo, dirigido: boolean): Posiciones {
  const orden = [...grafo.nodos].sort((a, b) => compararNombres(a.nombre, b.nombre))
  const posiciones: Posiciones = {}
  if (orden.length === 0) return posiciones

  if (grafo.aristas.length === 0) {
    const columnas = Math.ceil(Math.sqrt(orden.length))
    const paso = Math.max(...orden.map((n) => anchoNodo(n.nombre))) + SEPARACION_X / 2
    orden.forEach((n, i) => {
      posiciones[n.id] = { x: (i % columnas) * paso, y: Math.floor(i / columnas) * SEPARACION_Y }
    })
    return posiciones
  }

  const salientes = new Map<string, string[]>(orden.map((n) => [n.id, []]))
  const entrantes = new Map<string, string[]>(orden.map((n) => [n.id, []]))
  for (const a of grafo.aristas) {
    if (a.origen === a.destino) continue
    salientes.get(a.origen)?.push(a.destino)
    entrantes.get(a.destino)?.push(a.origen)
    if (!dirigido) {
      salientes.get(a.destino)?.push(a.origen)
      entrantes.get(a.origen)?.push(a.destino)
    }
  }

  const capa = new Map<string, number>()

  if (dirigido) {
    // Kahn con camino más largo.
    const pendientes = new Map(orden.map((n) => [n.id, entrantes.get(n.id)!.length]))
    const cola = orden.filter((n) => pendientes.get(n.id) === 0).map((n) => n.id)
    cola.forEach((id) => capa.set(id, 0))
    while (cola.length > 0) {
      const id = cola.shift()!
      for (const v of salientes.get(id)!) {
        capa.set(v, Math.max(capa.get(v) ?? 0, capa.get(id)! + 1))
        pendientes.set(v, pendientes.get(v)! - 1)
        if (pendientes.get(v) === 0) cola.push(v)
      }
    }
  }

  // BFS para lo que quedó (grafo no dirigido, o nodos en ciclos).
  for (const inicio of orden) {
    if (capa.has(inicio.id)) continue
    const previas = entrantes.get(inicio.id)!.filter((u) => capa.has(u)).map((u) => capa.get(u)! + 1)
    capa.set(inicio.id, Math.max(0, ...previas))
    const cola = [inicio.id]
    while (cola.length > 0) {
      const id = cola.shift()!
      for (const v of salientes.get(id)!) {
        if (capa.has(v)) continue
        capa.set(v, capa.get(id)! + 1)
        cola.push(v)
      }
    }
  }

  const columnas: (typeof orden)[] = []
  for (const n of orden) (columnas[capa.get(n.id)!] ??= []).push(n)

  let x = 0
  let anchoPrevio = 0
  for (const columna of columnas.filter(Boolean)) {
    const ancho = Math.max(...columna.map((n) => anchoNodo(n.nombre)))
    if (anchoPrevio > 0) x += anchoPrevio / 2 + SEPARACION_X + ancho / 2
    columna.forEach((n, i) => {
      posiciones[n.id] = { x, y: (i - (columna.length - 1) / 2) * SEPARACION_Y }
    })
    anchoPrevio = ancho
  }
  return posiciones
}
