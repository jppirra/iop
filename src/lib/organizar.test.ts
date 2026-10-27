import { describe, expect, it } from 'vitest'
import type { Grafo } from '../types/graph'
import { organizar } from './organizar'

const grafo = (dirigido: boolean, nombres: string[], aristas: [string, string][]): Grafo => ({
  dirigido,
  nodos: nombres.map((n) => ({ id: n, nombre: n, x: 0, y: 0 })),
  aristas: aristas.map(([o, d], i) => ({ id: `a${i}`, origen: o, destino: d, peso: 1 })),
})

const sinSuperposiciones = (pos: Record<string, { x: number; y: number }>) => {
  const claves = Object.values(pos).map((p) => `${p.x},${p.y}`)
  expect(new Set(claves).size).toBe(claves.length)
}

const caja = (pos: Record<string, { x: number; y: number }>) => {
  const xs = Object.values(pos).map((p) => p.x)
  const ys = Object.values(pos).map((p) => p.y)
  return { ancho: Math.max(...xs) - Math.min(...xs), alto: Math.max(...ys) - Math.min(...ys) }
}

describe('organizar', () => {
  it('una cadena larga queda en matriz (no en una sola fila)', () => {
    const nombres = Array.from({ length: 60 }, (_, i) => String(i + 1))
    const aristas = nombres.slice(1).map((n, i): [string, string] => [nombres[i], n])
    const pos = organizar(grafo(true, nombres, aristas), true, 16 / 9)
    const { ancho, alto } = caja(pos)
    expect(alto).toBeGreaterThan(0)
    expect(ancho / alto).toBeGreaterThan(0.8)
    expect(ancho / alto).toBeLessThan(4)
    sinSuperposiciones(pos)
  })

  it('nombres numéricos: se llena por filas en orden numérico', () => {
    const pos = organizar(grafo(false, ['10', '3', '1', '2', '4', '5', '6', '7', '8', '9'], [['10', '1']]), false, 1)
    expect(pos['1'].x).toBeLessThan(pos['2'].x)
    expect(pos['2'].x).toBeLessThan(pos['3'].x)
    expect(pos['10'].y).toBeGreaterThan(pos['1'].y)
    sinSuperposiciones(pos)
  })

  it('nombres no numéricos: sigue el orden de las aristas', () => {
    const pos = organizar(grafo(true, ['A', 'B', 'C'], [['C', 'B'], ['B', 'A']]), true, 10)
    expect(pos['C'].x).toBeLessThan(pos['B'].x)
    expect(pos['B'].x).toBeLessThan(pos['A'].x)
  })

  it('grafos con ciclos, no dirigidos o sin aristas: ubica todos sin superponerlos', () => {
    const aristas: [string, string][] = [['A', 'B'], ['B', 'C'], ['C', 'A'], ['C', 'D']]
    for (const dirigido of [true, false]) {
      const pos = organizar(grafo(dirigido, ['A', 'B', 'C', 'D', 'E'], aristas), dirigido)
      expect(Object.keys(pos)).toHaveLength(5)
      sinSuperposiciones(pos)
    }
    sinSuperposiciones(organizar(grafo(false, ['x', 'y', 'z'], []), false))
  })
})
