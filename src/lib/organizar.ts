import type { Grafo, Nodo } from '../types/graph'

type Posiciones = Record<string, { x: number; y: number }>

const SEPARACION_X = 80
const SEPARACION_Y = 70
const ALTO_NODO = 34
/** Las columnas impares bajan un poco: así una arista entre dos nodos de la misma fila no atraviesa el del medio. */
const ESCALON = 0.35

/** Orden natural: "2" antes que "10", "A2" antes que "A10"; los nombres no numéricos, alfabéticos. */
const compararNombres = (a: string, b: string) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' })

/** Mismo ancho que dibuja el lienzo (ver `GraphCanvas`). */
const anchoNodo = (nombre: string) => Math.max(34, nombre.length * 8 + 18)

/**
 * Nivel de cada nodo siguiendo las aristas.
 * - Dirigido: camino más largo desde un nodo sin predecesores (toda arista avanza de nivel).
 * - No dirigido, o nodos en ciclos: BFS desde el nodo de menor nombre de cada componente.
 */
function niveles(grafo: Grafo, dirigido: boolean, orden: Nodo[]): Map<string, number> {
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

  const nivel = new Map<string, number>()
  if (dirigido) {
    const pendientes = new Map(orden.map((n) => [n.id, entrantes.get(n.id)!.length]))
    const cola = orden.filter((n) => pendientes.get(n.id) === 0).map((n) => n.id)
    cola.forEach((id) => nivel.set(id, 0))
    while (cola.length > 0) {
      const id = cola.shift()!
      for (const v of salientes.get(id)!) {
        nivel.set(v, Math.max(nivel.get(v) ?? 0, nivel.get(id)! + 1))
        pendientes.set(v, pendientes.get(v)! - 1)
        if (pendientes.get(v) === 0) cola.push(v)
      }
    }
  }
  for (const inicio of orden) {
    if (nivel.has(inicio.id)) continue
    const previos = entrantes.get(inicio.id)!.filter((u) => nivel.has(u)).map((u) => nivel.get(u)! + 1)
    nivel.set(inicio.id, Math.max(0, ...previos))
    const cola = [inicio.id]
    while (cola.length > 0) {
      const id = cola.shift()!
      for (const v of salientes.get(id)!) {
        if (nivel.has(v)) continue
        nivel.set(v, nivel.get(id)! + 1)
        cola.push(v)
      }
    }
  }
  return nivel
}

/**
 * Acomoda los nodos en una matriz con la proporción del lienzo (`proporcion` = ancho / alto),
 * para que todo entre en pantalla. Se llena por filas, de izquierda a derecha:
 * - si todos los nombres son números, en orden numérico;
 * - si no, siguiendo las aristas (nivel) y, dentro del mismo nivel, por nombre.
 * Cada nodo ocupa su propia celda, así que nunca se superponen. Determinístico.
 */
export function organizar(grafo: Grafo, dirigido: boolean, proporcion = 16 / 9): Posiciones {
  const posiciones: Posiciones = {}
  if (grafo.nodos.length === 0) return posiciones

  let orden = [...grafo.nodos].sort((a, b) => compararNombres(a.nombre, b.nombre))
  if (!orden.every((n) => /^\d+$/.test(n.nombre.trim()))) {
    const nivel = niveles(grafo, dirigido, orden)
    orden = orden.map((n, i) => ({ n, i })).sort((a, b) => nivel.get(a.n.id)! - nivel.get(b.n.id)! || a.i - b.i).map((e) => e.n)
  }

  const anchoCelda = Math.max(...orden.map((n) => anchoNodo(n.nombre))) + SEPARACION_X
  const altoCelda = ALTO_NODO + SEPARACION_Y
  const total = orden.length
  const columnas = Math.min(total, Math.max(1, Math.round(Math.sqrt((total * proporcion * altoCelda) / anchoCelda))))

  orden.forEach((n, i) => {
    const columna = i % columnas
    const fila = Math.floor(i / columnas)
    posiciones[n.id] = {
      x: columna * anchoCelda,
      y: fila * altoCelda + (columna % 2) * altoCelda * ESCALON,
    }
  })
  return posiciones
}
