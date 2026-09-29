import type { GrafoPlano } from '../parsers'
import type { Arista, Grafo, Nodo } from '../types/graph'

let contador = 0
export function nuevoId(prefijo: 'n' | 'e'): string {
  contador += 1
  return `${prefijo}${Date.now().toString(36)}${contador}`
}

export const grafoVacio = (dirigido = false): Grafo => ({ dirigido, nodos: [], aristas: [] })

/** Posiciones en círculo para `cantidad` nodos. */
export function posicionesEnCirculo(cantidad: number, centro = { x: 400, y: 300 }, radio?: number) {
  const r = radio ?? Math.max(150, cantidad * 22)
  return Array.from({ length: cantidad }, (_, i) => {
    const angulo = (2 * Math.PI * i) / Math.max(cantidad, 1) - Math.PI / 2
    return { x: centro.x + r * Math.cos(angulo), y: centro.y + r * Math.sin(angulo) }
  })
}

/**
 * Convierte un grafo plano (nombres) a un Grafo (ids). Si se pasa `base`, fusiona:
 * los nodos con el mismo nombre se reutilizan y las aristas repetidas actualizan su peso.
 */
export function desdePlano(plano: GrafoPlano, dirigido: boolean, base?: Grafo): Grafo {
  const nodos: Nodo[] = base ? [...base.nodos] : []
  const aristas: Arista[] = base ? [...base.aristas] : []
  const porNombre = new Map(nodos.map((n) => [n.nombre, n]))

  const nuevos = plano.nodos.filter((n) => !porNombre.has(n.nombre))
  const sinPosicion = nuevos.filter((n) => n.x === undefined || n.y === undefined)
  const circulo = posicionesEnCirculo(sinPosicion.length, base?.nodos.length ? { x: 400, y: 700 } : undefined)
  let k = 0
  for (const n of nuevos) {
    const pos = n.x !== undefined && n.y !== undefined ? { x: n.x, y: n.y } : circulo[k++]
    const nodo: Nodo = { id: nuevoId('n'), nombre: n.nombre, ...pos }
    nodos.push(nodo)
    porNombre.set(nodo.nombre, nodo)
  }

  for (const a of plano.aristas) {
    const origen = porNombre.get(a.origen)!.id
    const destino = porNombre.get(a.destino)!.id
    const existente = aristas.findIndex((e) => mismaConexion(e, origen, destino, dirigido))
    if (existente >= 0) aristas[existente] = { ...aristas[existente], peso: a.peso }
    else aristas.push({ id: nuevoId('e'), origen, destino, peso: a.peso })
  }
  return { dirigido, nodos, aristas }
}

export function mismaConexion(a: Arista, origen: string, destino: string, dirigido: boolean): boolean {
  return (a.origen === origen && a.destino === destino) || (!dirigido && a.origen === destino && a.destino === origen)
}

export function existeArista(grafo: Grafo, origen: string, destino: string): boolean {
  return grafo.aristas.some((a) => mismaConexion(a, origen, destino, grafo.dirigido))
}

export function agregarNodo(grafo: Grafo, nombre: string, x: number, y: number): Grafo {
  return { ...grafo, nodos: [...grafo.nodos, { id: nuevoId('n'), nombre, x, y }] }
}

export function renombrarNodo(grafo: Grafo, id: string, nombre: string): Grafo {
  return { ...grafo, nodos: grafo.nodos.map((n) => (n.id === id ? { ...n, nombre } : n)) }
}

export function moverNodos(grafo: Grafo, posiciones: Record<string, { x: number; y: number }>): Grafo {
  return { ...grafo, nodos: grafo.nodos.map((n) => (posiciones[n.id] ? { ...n, ...posiciones[n.id] } : n)) }
}

export function agregarArista(grafo: Grafo, origen: string, destino: string, peso: number): Grafo {
  return { ...grafo, aristas: [...grafo.aristas, { id: nuevoId('e'), origen, destino, peso }] }
}

export function editarPeso(grafo: Grafo, id: string, peso: number): Grafo {
  return { ...grafo, aristas: grafo.aristas.map((a) => (a.id === id ? { ...a, peso } : a)) }
}

export function eliminar(grafo: Grafo, nodos: string[], aristas: string[]): Grafo {
  const sinNodos = new Set(nodos)
  const sinAristas = new Set(aristas)
  return {
    ...grafo,
    nodos: grafo.nodos.filter((n) => !sinNodos.has(n.id)),
    aristas: grafo.aristas.filter((a) => !sinAristas.has(a.id) && !sinNodos.has(a.origen) && !sinNodos.has(a.destino)),
  }
}

/** Siguiente nombre sugerido: el menor entero positivo no usado. */
export function nombreSugerido(grafo: Grafo): string {
  const usados = new Set(grafo.nodos.map((n) => n.nombre))
  let i = 1
  while (usados.has(String(i))) i++
  return String(i)
}

/**
 * Firma estructural del grafo (sin posiciones): sirve para saber si una ejecución
 * sigue siendo válida después de mover nodos.
 */
export function firmaEstructural(grafo: Grafo): string {
  return JSON.stringify([
    grafo.dirigido,
    grafo.nodos.map((n) => [n.id, n.nombre]),
    grafo.aristas.map((a) => [a.id, a.origen, a.destino, a.peso]),
  ])
}
