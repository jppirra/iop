import type { Arista, Grafo, Parametros, Validacion } from '../types/graph'

export interface Vecino {
  nodo: string
  arista: Arista
}

export function mapaNombres(grafo: Grafo): (id: string) => string {
  const nombres = new Map(grafo.nodos.map((n) => [n.id, n.nombre]))
  return (id) => nombres.get(id) ?? id
}

/** Lista de adyacencia. Si el grafo no es dirigido, cada arista se recorre en ambos sentidos. */
export function listaAdyacencia(grafo: Grafo): Map<string, Vecino[]> {
  const ady = new Map<string, Vecino[]>(grafo.nodos.map((n) => [n.id, []]))
  for (const a of grafo.aristas) {
    ady.get(a.origen)?.push({ nodo: a.destino, arista: a })
    if (!grafo.dirigido && a.origen !== a.destino) ady.get(a.destino)?.push({ nodo: a.origen, arista: a })
  }
  return ady
}

/** Nodos alcanzables desde `inicio` ignorando la dirección de las aristas. */
export function alcanzablesNoDirigido(grafo: Grafo, inicio: string): Set<string> {
  const ady = listaAdyacencia({ ...grafo, dirigido: false })
  const vistos = new Set([inicio])
  const pila = [inicio]
  while (pila.length) {
    const actual = pila.pop()!
    for (const { nodo } of ady.get(actual) ?? []) {
      if (!vistos.has(nodo)) {
        vistos.add(nodo)
        pila.push(nodo)
      }
    }
  }
  return vistos
}

export function esConexo(grafo: Grafo): boolean {
  if (grafo.nodos.length === 0) return true
  return alcanzablesNoDirigido(grafo, grafo.nodos[0].id).size === grafo.nodos.length
}

export function describirArista(a: Arista, nombre: (id: string) => string, dirigido = false): string {
  return `${nombre(a.origen)}${dirigido ? '→' : '–'}${nombre(a.destino)}`
}

/**
 * Detecta soluciones óptimas múltiples de un árbol de expansión mínima:
 * una arista fuera del árbol puede reemplazar a otra del árbol si su peso es igual
 * al peso máximo del camino (dentro del árbol) que une sus extremos.
 */
export function reemplazosEquivalentes(grafo: Grafo, arbol: Arista[]): string[] {
  const nombre = mapaNombres(grafo)
  const idsArbol = new Set(arbol.map((a) => a.id))
  const adyArbol = listaAdyacencia({ dirigido: false, nodos: grafo.nodos, aristas: arbol })
  const detalles: string[] = []

  for (const e of grafo.aristas) {
    if (idsArbol.has(e.id) || e.origen === e.destino) continue
    const camino = caminoEnArbol(adyArbol, e.origen, e.destino)
    if (!camino) continue
    const maxima = camino.reduce((m, a) => (a.peso > m.peso ? a : m))
    if (maxima.peso === e.peso) {
      detalles.push(
        `La arista ${describirArista(e, nombre)} (${e.peso}) puede reemplazar a ${describirArista(maxima, nombre)} (${maxima.peso}) sin cambiar la distancia total.`,
      )
    }
  }
  return detalles
}

function caminoEnArbol(ady: Map<string, Vecino[]>, desde: string, hasta: string): Arista[] | null {
  const previo = new Map<string, Vecino | null>([[desde, null]])
  const cola = [desde]
  while (cola.length) {
    const actual = cola.shift()!
    if (actual === hasta) break
    for (const v of ady.get(actual) ?? []) {
      if (!previo.has(v.nodo)) {
        previo.set(v.nodo, { nodo: actual, arista: v.arista })
        cola.push(v.nodo)
      }
    }
  }
  if (!previo.has(hasta)) return null
  const camino: Arista[] = []
  let actual = hasta
  while (actual !== desde) {
    const p = previo.get(actual)!
    camino.push(p.arista)
    actual = p.nodo
  }
  return camino
}

// ---------- Validaciones comunes ----------

export function validacionVacia(): Validacion {
  return { errores: [], advertencias: [] }
}

export function validarParametroNodo(
  grafo: Grafo,
  parametros: Parametros,
  clave: keyof Parametros,
  etiqueta: string,
  v: Validacion,
): void {
  const id = parametros[clave]
  if (!id) v.errores.push(`Elegí el ${etiqueta}.`)
  else if (!grafo.nodos.some((n) => n.id === id)) v.errores.push(`El ${etiqueta} no existe en el grafo.`)
}

export function validarGrafoNoVacio(grafo: Grafo, v: Validacion): void {
  if (grafo.nodos.length === 0) v.errores.push('El grafo está vacío: agregá nodos y aristas.')
}

/** Nodo alcanzable más lejano (por distancia acumulada) desde `origen`. */
export function nodoMasLejano(grafo: Grafo, origen: string): string {
  const ady = listaAdyacencia(grafo)
  const dist = new Map([[origen, 0]])
  const pendientes = new Set([origen])
  const fijados = new Set<string>()
  while (pendientes.size) {
    const u = [...pendientes].reduce((a, b) => (dist.get(a)! <= dist.get(b)! ? a : b))
    pendientes.delete(u)
    fijados.add(u)
    for (const { nodo, arista } of ady.get(u) ?? []) {
      if (fijados.has(nodo)) continue
      const d = dist.get(u)! + arista.peso
      if (d < (dist.get(nodo) ?? Infinity)) {
        dist.set(nodo, d)
        pendientes.add(nodo)
      }
    }
  }
  return [...dist.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0]
}
