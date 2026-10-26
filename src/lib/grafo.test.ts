import { describe, expect, it } from 'vitest'
import { cpm } from '../algorithms/cpm'
import { parsearCsv, parsearTexto } from '../parsers'
import type { GrafoPlano } from '../parsers'
import { desdePlano, existeAristaPorNombre } from './grafo'

describe('desdePlano: actividades paralelas (CPM/PERT)', () => {
  it('la segunda actividad paralela crea un evento intermedio y una ficticia de duración 0', () => {
    const { grafo: plano } = parsearTexto('1 2 5 actividad=A\n1 2 3 actividad=B')
    const grafo = desdePlano(plano!, true)

    expect(grafo.nodos.map((n) => n.nombre)).toEqual(['1', '2', "2'"])
    const porId = new Map(grafo.aristas.map((a) => [a.id, a]))
    const intermedio = grafo.nodos.find((n) => n.nombre === "2'")!

    const directa = grafo.aristas.find((a) => a.actividad === 'A')!
    expect(directa.origen).toBe(grafo.nodos[0].id)
    expect(directa.destino).toBe(grafo.nodos[1].id) // "2" (destino real), no el intermedio

    const paralela = grafo.aristas.find((a) => a.actividad === 'B')!
    expect(paralela.origen).toBe(grafo.nodos[0].id)
    expect(paralela.destino).toBe(intermedio.id)

    const ficticia = grafo.aristas.find((a) => a.ficticia)!
    expect(ficticia.origen).toBe(intermedio.id)
    expect(ficticia.destino).toBe(grafo.nodos[1].id)
    expect(ficticia.peso).toBe(0)
    expect(porId.size).toBe(3)
  })

  it('no choca con un nombre de nodo ya existente', () => {
    const plano: GrafoPlano = {
      dirigido: true,
      nodos: [{ nombre: '1' }, { nombre: '2' }, { nombre: "2'" }],
      aristas: [
        { origen: '1', destino: '2', peso: 5, actividad: 'A' },
        { origen: '1', destino: '2', peso: 3, actividad: 'B' },
      ],
    }
    const grafo = desdePlano(plano, true)
    expect(grafo.nodos.map((n) => n.nombre)).toEqual(['1', '2', "2'", "2''"])
  })

  it('tres actividades paralelas: dos eventos intermedios y la ruta crítica suma solo las reales', () => {
    const { grafo: plano } = parsearTexto(
      '1 2 10 actividad=A\n1 2 3 actividad=B\n1 2 7 actividad=C\n2 3 1 actividad=D',
    )
    const grafo = desdePlano(plano!, true)
    const { resultado } = cpm(grafo)
    // La ruta crítica pasa por la actividad más larga (A, 10) más D (1): 11.
    expect(resultado.duracion).toBe(11)
    expect(resultado.actividades.filter((a) => a.ficticia)).toHaveLength(2)
  })
})

describe('existeAristaPorNombre', () => {
  it('encuentra una arista por nombre de nodo, sin conocer los ids', () => {
    const grafo = desdePlano(parsearTexto('A B 1').grafo!, false)
    expect(existeAristaPorNombre(grafo, 'A', 'B')).toBe(true)
    expect(existeAristaPorNombre(grafo, 'B', 'A')).toBe(true) // no dirigido
    expect(existeAristaPorNombre(grafo, 'A', 'C')).toBe(false) // "C" no existe
  })
})

describe('desdePlano: rendimiento con un grafo completo de 200 nodos', () => {
  it('grafo completo (19.900 aristas) parseado + desdePlano en menos de 500 ms', () => {
    const n = 200
    const filas = ['origen,destino,peso']
    for (let i = 1; i <= n; i++) {
      for (let j = i + 1; j <= n; j++) filas.push(`${i},${j},${((i * 7 + j * 3) % 50) + 1}`)
    }
    const csv = filas.join('\n')

    const inicio = performance.now()
    const { grafo: plano, errores } = parsearCsv(csv)
    const grafo = desdePlano(plano!, false)
    const duracion = performance.now() - inicio

    expect(errores).toEqual([])
    expect(grafo.nodos).toHaveLength(200)
    expect(grafo.aristas).toHaveLength((n * (n - 1)) / 2)
    expect(duracion).toBeLessThan(500)
  })
})

describe('desdePlano: agregar al grafo existente', () => {
  it('una arista que ya existía actualiza su peso (no es una actividad paralela)', () => {
    const base = desdePlano(parsearTexto('A B 1\nB C 2').grafo!, false)
    const grafo = desdePlano(parsearTexto('A B 9').grafo!, false, base)
    expect(grafo.nodos.map((n) => n.nombre)).toEqual(['A', 'B', 'C'])
    expect(grafo.aristas.map((a) => a.peso)).toEqual([9, 2])
  })

  it('dos actividades paralelas sobre una arista existente: la primera la actualiza, la segunda crea el evento intermedio', () => {
    const base = desdePlano(parsearTexto('1 2 4').grafo!, true)
    const grafo = desdePlano(parsearTexto('1 2 5 actividad=A\n1 2 3 actividad=B').grafo!, true, base)
    expect(grafo.nodos.map((n) => n.nombre)).toEqual(['1', '2', "2'"])
    expect(grafo.aristas.map((a) => [a.peso, a.actividad, a.ficticia ?? false])).toEqual([
      [5, 'A', false],
      [3, 'B', false],
      [0, undefined, true],
    ])
  })
})
