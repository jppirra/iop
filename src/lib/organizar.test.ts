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

describe('organizar', () => {
  it('dirigido: toda arista va hacia la derecha y cada columna queda en orden numérico', () => {
    const g = grafo(true, ['10', '3', '1', '2', '4'], [['1', '2'], ['1', '3'], ['2', '4'], ['3', '4'], ['4', '10'], ['1', '10']])
    const pos = organizar(g, true)
    for (const a of g.aristas) expect(pos[a.destino].x).toBeGreaterThan(pos[a.origen].x)
    expect(pos['2'].x).toBe(pos['3'].x)
    expect(pos['2'].y).toBeLessThan(pos['3'].y)
    sinSuperposiciones(pos)
  })

  it('dirigido con ciclo y no dirigido: ubica todos los nodos sin superponerlos', () => {
    const aristas: [string, string][] = [['1', '2'], ['2', '3'], ['3', '1'], ['3', '4']]
    for (const dirigido of [true, false]) {
      const pos = organizar(grafo(dirigido, ['1', '2', '3', '4', '5'], aristas), dirigido)
      expect(Object.keys(pos)).toHaveLength(5)
      sinSuperposiciones(pos)
    }
  })

  it('no dirigido: arranca desde el nodo de menor número', () => {
    const pos = organizar(grafo(false, ['B', 'A', 'C'], [['B', 'A'], ['B', 'C']]), false)
    expect(pos['A'].x).toBeLessThan(pos['B'].x)
    expect(pos['B'].x).toBeLessThan(pos['C'].x)
  })

  it('sin aristas: grilla en orden numérico', () => {
    const pos = organizar(grafo(false, ['10', '2', '1', '3'], []), false)
    expect(pos['1']).toEqual({ x: 0, y: 0 })
    expect(pos['2'].x).toBeGreaterThan(0)
    expect(pos['3'].y).toBeGreaterThan(0)
    expect(pos['10'].x).toBe(pos['2'].x)
    sinSuperposiciones(pos)
  })
})
