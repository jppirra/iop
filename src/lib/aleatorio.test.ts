import { describe, expect, it } from 'vitest'
import { esConexo, nodoMasLejano } from '../algorithms/utils'
import { grafoAleatorio } from './aleatorio'
import { parsearTexto } from '../parsers'
import { desdePlano } from './grafo'

describe('grafo aleatorio', () => {
  it('es conexo, sin aristas repetidas y con pesos en rango', () => {
    for (let semilla = 1; semilla <= 50; semilla++) {
      const plano = grafoAleatorio({ semilla, minNodos: 5, maxNodos: 10, pesoMin: 1, pesoMax: 20 })
      const n = plano.nodos.length
      expect(n).toBeGreaterThanOrEqual(5)
      expect(n).toBeLessThanOrEqual(10)
      expect(plano.aristas.length).toBeGreaterThanOrEqual(n - 1)
      expect(esConexo(desdePlano(plano, false))).toBe(true)

      const pares = plano.aristas.map((a) => [a.origen, a.destino].sort().join('-'))
      expect(new Set(pares).size).toBe(pares.length)
      for (const a of plano.aristas) {
        expect(Number.isInteger(a.peso)).toBe(true)
        expect(a.peso).toBeGreaterThanOrEqual(1)
        expect(a.peso).toBeLessThanOrEqual(20)
      }
    }
  })

  it('con la misma semilla genera el mismo grafo', () => {
    expect(grafoAleatorio({ semilla: 42 })).toEqual(grafoAleatorio({ semilla: 42 }))
  })
})

describe('nodo más lejano', () => {
  it('elige el nodo con mayor distancia acumulada', () => {
    const g = desdePlano(parsearTexto('A B 1\nB C 5\nA D 3').grafo!, false)
    expect(g.nodos.find((n) => n.id === nodoMasLejano(g, g.nodos[0].id))!.nombre).toBe('C')
  })
})
