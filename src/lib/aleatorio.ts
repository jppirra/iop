import type { GrafoPlano } from '../parsers'

export interface OpcionesAleatorio {
  minNodos?: number
  maxNodos?: number
  pesoMin?: number
  pesoMax?: number
  /** Probabilidad de agregar cada arista extra (además del árbol que garantiza conexidad). */
  densidad?: number
  /** Semilla opcional para resultados reproducibles (tests). */
  semilla?: number
}

/** Generador pseudoaleatorio con semilla (mulberry32). */
function crearRng(semilla: number): () => number {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Grafo no dirigido, conexo y con pesos enteros positivos, apto para todos los algoritmos.
 * Primero arma un árbol al azar (garantiza que sea conexo) y después suma aristas
 * entre nodos cercanos para que haya alternativas que comparar.
 */
export function grafoAleatorio(opciones: OpcionesAleatorio = {}): GrafoPlano {
  const { minNodos = 6, maxNodos = 9, pesoMin = 1, pesoMax = 20, densidad = 0.45 } = opciones
  const rng = crearRng(opciones.semilla ?? Math.floor(Math.random() * 2 ** 32))
  const entero = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1))

  const n = entero(minNodos, maxNodos)
  const radio = 90 + n * 22
  const nodos = Array.from({ length: n }, (_, i) => {
    const angulo = (2 * Math.PI * i) / n - Math.PI / 2 + (rng() - 0.5) * 0.35
    const r = radio * (0.8 + rng() * 0.3)
    return { nombre: String(i + 1), x: Math.round(400 + r * Math.cos(angulo)), y: Math.round(300 + r * Math.sin(angulo)) }
  })

  const clave = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`)
  const usadas = new Set<string>()
  const aristas: GrafoPlano['aristas'] = []
  // Los arcos van siempre del nodo de menor número al de mayor: así, visto como dirigido, no tiene ciclos (sirve para CPM y PERT).
  const agregar = (a: number, b: number) => {
    usadas.add(clave(a, b))
    aristas.push({ origen: nodos[Math.min(a, b)].nombre, destino: nodos[Math.max(a, b)].nombre, peso: entero(pesoMin, pesoMax) })
  }

  // Árbol aleatorio: cada nodo nuevo se une a uno ya conectado, preferentemente cercano.
  const orden = nodos.map((_, i) => i).sort(() => rng() - 0.5)
  for (let k = 1; k < n; k++) {
    const actual = orden[k]
    const conectados = orden.slice(0, k)
    const cercanos = [...conectados].sort((a, b) => distancia(nodos[a], nodos[actual]) - distancia(nodos[b], nodos[actual]))
    agregar(actual, cercanos[Math.min(Math.floor(rng() * 2), cercanos.length - 1)])
  }

  // Aristas extra entre vecinos cercanos (evita un dibujo con muchos cruces).
  for (let i = 0; i < n; i++) {
    const vecinos = nodos
      .map((_, j) => j)
      .filter((j) => j !== i)
      .sort((a, b) => distancia(nodos[a], nodos[i]) - distancia(nodos[b], nodos[i]))
      .slice(0, 3)
    for (const j of vecinos) if (!usadas.has(clave(i, j)) && rng() < densidad) agregar(i, j)
  }

  return { dirigido: false, nodos, aristas }
}

function distancia(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
