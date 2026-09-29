import { describe, expect, it } from 'vitest'
import { ejemplosLibro } from '../examples/libro'
import { desdePlano } from '../lib/grafo'
import { parsearTexto } from '../parsers'
import type { Grafo, ResultadoArbol, ResultadoRuta } from '../types/graph'
import { dijkstra, estrategia as estrategiaDijkstra } from './dijkstra'
import { estrategias } from './index'
import { kruskal } from './kruskal'
import { prim } from './prim'

const ejemplo = (id: string) => {
  const e = ejemplosLibro.find((x) => x.id === id)!
  const grafo = desdePlano(e.grafo, e.grafo.dirigido ?? false)
  return { grafo, id: (nombre: string) => grafo.nodos.find((n) => n.nombre === nombre)!.id }
}

const desdeTexto = (texto: string, dirigido = false): { grafo: Grafo; id: (n: string) => string } => {
  const { grafo: plano, errores } = parsearTexto(texto)
  expect(errores).toEqual([])
  const grafo = desdePlano(plano!, dirigido)
  return { grafo, id: (nombre) => grafo.nodos.find((n) => n.nombre === nombre)!.id }
}

const pares = (r: ResultadoArbol) => r.aristas.map((a) => `${a.desde}-${a.hasta}`)

describe('registro de estrategias', () => {
  it('registra Prim, Kruskal y Dijkstra en orden', () => {
    expect(Object.keys(estrategias)).toEqual(['prim', 'kruskal', 'dijkstra'])
  })
})

describe('Lauderdale Construction (fig. 11.1)', () => {
  it('Prim desde el nodo 1 reproduce la tabla 11.1 con distancia total 16', () => {
    const { grafo, id } = ejemplo('lauderdale')
    const { resultado, pasos } = prim(grafo, id('1'))
    expect(resultado.total).toBe(16)
    expect(resultado.conexo).toBe(true)
    expect(pares(resultado)).toEqual(['1-3', '3-4', '3-2', '2-5', '3-6', '6-8', '8-7'])
    // inicio + 7 conexiones + resultado
    expect(pasos).toHaveLength(9)
    expect(pasos[6].descripcion).toContain('Se conecta el nodo 8 con el 6')
  })

  it('avisa empates y soluciones óptimas múltiples, como el libro', () => {
    const { grafo, id } = ejemplo('lauderdale')
    const { resultado, pasos } = prim(grafo, id('1'))
    expect(pasos[3].empate).toBeDefined() // paso 3: nodo 2 o 6
    expect(pasos[4].empate).toBeDefined() // paso 4: nodo 5 o 6
    expect(resultado.solucionesMultiples).toBe(true)
  })

  it('Kruskal obtiene la misma distancia total 16', () => {
    const { grafo } = ejemplo('lauderdale')
    const { resultado } = kruskal(grafo)
    expect(resultado.total).toBe(16)
    expect(resultado.aristas).toHaveLength(7)
    expect(resultado.solucionesMultiples).toBe(true)
  })

  it('Prim da 16 empiece donde empiece', () => {
    const { grafo } = ejemplo('lauderdale')
    for (const n of grafo.nodos) expect(prim(grafo, n.id).resultado.total).toBe(16)
  })
})

describe('árbol mínimo: casos borde', () => {
  it('detecta grafo no conexo', () => {
    const { grafo, id } = desdeTexto('A B 1\nC D 2')
    const r = prim(grafo, id('A')).resultado
    expect(r.conexo).toBe(false)
    expect(r.nodosSinConectar).toEqual(['C', 'D'])
    expect(kruskal(grafo).resultado.conexo).toBe(false)
    expect(estrategias.prim.validar(grafo, { inicio: id('A') }).advertencias).toHaveLength(1)
  })

  it('Kruskal descarta aristas que forman ciclo', () => {
    const { grafo } = desdeTexto('A B 1\nB C 2\nA C 3\nC D 4')
    const { resultado, pasos } = kruskal(grafo)
    expect(resultado.total).toBe(7)
    expect(pasos.some((p) => p.descripcion.includes('formaría un ciclo'))).toBe(true)
  })

  it('árbol único no marca soluciones múltiples', () => {
    const { grafo, id } = desdeTexto('A B 1\nB C 2\nA C 3')
    expect(prim(grafo, id('A')).resultado.solucionesMultiples).toBe(false)
  })

  it('ignora la dirección de las aristas', () => {
    const { grafo, id } = desdeTexto('A B 1\nC B 1', true)
    expect(prim(grafo, id('A')).resultado.conexo).toBe(true)
  })
})

describe('Leadville → Dillon (fig. 11.19)', () => {
  it('ruta más corta 1-2-3-6-7 con distancia 32', () => {
    const { grafo, id } = ejemplo('leadville')
    const r: ResultadoRuta = dijkstra(grafo, id('1'), id('7')).resultado
    expect(r.ruta).toEqual(['1', '2', '3', '6', '7'])
    expect(r.distancia).toBe(32)
    expect(r.aristasRuta).toHaveLength(4)
    expect(r.solucionesMultiples).toBe(false)
  })

  it('fija los nodos en el orden del libro con sus distancias', () => {
    const { grafo, id } = ejemplo('leadville')
    const r = dijkstra(grafo, id('1'), id('7')).resultado
    const fijados = r.iteraciones.slice(1).map((it) => {
      const e = it.etiquetas.find((x) => x.nodo === it.nodoFijado)!
      return `${it.nodoFijado}:${e.distancia}`
    })
    expect(fijados).toEqual(['1:0', '2:8', '3:14', '4:18', '5:22', '6:26', '7:32'])
  })
})

describe('Ray Design (fig. 11.10)', () => {
  it('ruta 1-2-3-5-6 con distancia 290', () => {
    const { grafo, id } = ejemplo('ray-design')
    const r = dijkstra(grafo, id('1'), id('6')).resultado
    expect(r.ruta).toEqual(['1', '2', '3', '5', '6'])
    expect(r.distancia).toBe(290)
  })
})

describe('Dijkstra: casos borde', () => {
  it('avisa si no hay ruta al destino', () => {
    const { grafo, id } = desdeTexto('A B 1\nC D 1')
    const { resultado, pasos } = dijkstra(grafo, id('A'), id('D'))
    expect(resultado.ruta).toBeNull()
    expect(pasos.at(-1)!.descripcion).toContain('No hay ruta')
  })

  it('respeta el sentido en grafos dirigidos', () => {
    const { grafo, id } = desdeTexto('A B 1\nC B 1', true)
    expect(dijkstra(grafo, id('A'), id('C')).resultado.ruta).toBeNull()
    expect(dijkstra({ ...grafo, dirigido: false }, id('A'), id('C')).resultado.distancia).toBe(2)
  })

  it('bloquea pesos negativos', () => {
    const { grafo, id } = desdeTexto('A B -1\nB C 2')
    const v = estrategiaDijkstra.validar(grafo, { origen: id('A'), destino: id('C') })
    expect(v.errores.join(' ')).toContain('pesos negativos')
  })

  it('exige origen y destino distintos', () => {
    const { grafo, id } = desdeTexto('A B 1')
    expect(estrategiaDijkstra.validar(grafo, { origen: id('A'), destino: id('A') }).errores).toHaveLength(1)
  })

  it('detecta rutas óptimas múltiples', () => {
    const { grafo, id } = desdeTexto('A B 1\nA C 1\nB D 1\nC D 1')
    const r = dijkstra(grafo, id('A'), id('D')).resultado
    expect(r.distancia).toBe(2)
    expect(r.solucionesMultiples).toBe(true)
  })
})
