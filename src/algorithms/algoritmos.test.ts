import { describe, expect, it } from 'vitest'
import { ejemplosLibro } from '../examples/libro'
import { grafoAleatorio } from '../lib/aleatorio'
import { desdePlano } from '../lib/grafo'
import { parsearTexto } from '../parsers'
import type { Grafo, ResultadoArbol, ResultadoRuta } from '../types/graph'
import { dijkstra, estrategia as estrategiaDijkstra } from './dijkstra'
import { estrategia as estrategiaFlujo, fordFulkerson } from './fordFulkerson'
import { estrategias } from './index'
import { kruskal } from './kruskal'
import { prim } from './prim'
import { nodoMasLejano } from './utils'

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
  it('registra los seis algoritmos en orden', () => {
    expect(Object.keys(estrategias)).toEqual(['prim', 'kruskal', 'dijkstra', 'ford-fulkerson', 'cpm', 'pert'])
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

describe('Flujo máximo - Ford-Fulkerson', () => {
  it('red de transmisión del apunte: S-A-T (8) y S-B-T (10), flujo máximo 18', () => {
    const { grafo, id } = ejemplo('red-transmision')
    const { resultado, pasos } = fordFulkerson(grafo, id('S'), id('T'))
    expect(resultado.flujoMaximo).toBe(18)
    expect(resultado.iteraciones.slice(1).map((it) => [it.camino.join('-'), it.cuello, it.flujoAcumulado])).toEqual([
      ['S-A-T', 8, 8],
      ['S-B-T', 10, 18],
    ])
    const flujos = Object.fromEntries(resultado.iteraciones.at(-1)!.arcos.map((a) => [`${a.desde}-${a.hasta}`, a.flujo]))
    expect(flujos).toEqual({ 'S-A': 8, 'A-T': 8, 'A-B': 0, 'S-B': 10, 'B-T': 10 })
    // inicio + 2 iteraciones (camino y aumento) + condición de parada + resultado
    expect(pasos).toHaveLength(7)
    expect(pasos[1].descripcion).toContain('k = min(10, 8) = 8')
    expect(pasos.at(-1)!.etiquetasAristas![grafo.aristas[0].id]).toBe('8/10')
  })

  it('el corte mínimo tiene la misma capacidad que el flujo máximo', () => {
    const { grafo, id } = ejemplo('red-transmision')
    const { corte, flujoMaximo } = fordFulkerson(grafo, id('S'), id('T')).resultado
    expect(corte.capacidad).toBe(flujoMaximo)
    expect(corte.ladoFuente).toEqual(['S', 'A', 'B'])
    expect(corte.arcos.map((a) => `${a.desde}-${a.hasta}`)).toEqual(['A-T', 'B-T'])
  })

  it('usa un arco inverso para corregir una asignación temprana', () => {
    // El camino más corto S-A-B-T ocupa A→B; para llegar a 2 hay que deshacer ese flujo.
    const { grafo, id } = desdeTexto('S A 1\nA B 1\nB T 1\nS C 1\nC B 1\nA D 1\nD E 1\nE T 1', true)
    const { resultado, pasos } = fordFulkerson(grafo, id('S'), id('T'))
    expect(resultado.flujoMaximo).toBe(2)
    expect(resultado.iteraciones[2].camino).toEqual(['S', 'C', 'B', 'A', 'D', 'E', 'T'])
    expect(pasos[3].descripcion).toContain('arco inverso')
    // El arco inverso B→A se vacía, no se satura.
    expect(pasos[4].descripcion).toContain('Se envía 1 unidad por')
    expect(pasos[4].descripcion).toContain('Se saturan S→C, C→B, A→D, D→E, E→T:')
    expect(resultado.iteraciones.at(-1)!.arcos.find((a) => a.desde === 'A' && a.hasta === 'B')!.flujo).toBe(0)
    expect(resultado.corte.capacidad).toBe(2)
  })

  it('cumple capacidad y conservación en cada nodo intermedio', () => {
    const { grafo, id } = desdeTexto('S A 16\nS C 13\nA B 12\nC A 4\nB C 9\nC D 14\nD B 7\nB T 20\nD T 4', true)
    const { resultado } = fordFulkerson(grafo, id('S'), id('T'))
    expect(resultado.flujoMaximo).toBe(23)
    const arcos = resultado.iteraciones.at(-1)!.arcos
    for (const a of arcos) expect(a.flujo).toBeLessThanOrEqual(a.capacidad)
    for (const n of ['A', 'B', 'C', 'D']) {
      const suma = (lado: 'desde' | 'hasta') => arcos.filter((a) => a[lado] === n).reduce((s, a) => s + a.flujo, 0)
      expect(suma('hasta')).toBe(suma('desde'))
    }
    expect(resultado.corte.capacidad).toBe(23)
  })

  it('en un grafo no dirigido cada arista sirve en los dos sentidos', () => {
    const { grafo, id } = desdeTexto('A S 5\nT A 3\nB S 2\nB T 4')
    const { resultado } = fordFulkerson(grafo, id('S'), id('T'))
    expect(resultado.flujoMaximo).toBe(5)
    expect(resultado.corte.capacidad).toBe(5)
    expect(resultado.iteraciones.at(-1)!.arcos.map((a) => `${a.desde}-${a.hasta}:${a.flujo}`)).toEqual(['S-A:3', 'A-T:3', 'S-B:2', 'B-T:2'])
  })

  it('respeta el sentido de los arcos: sin camino el flujo es 0', () => {
    const { grafo, id } = desdeTexto('A S 5\nA T 3', true)
    const { resultado, pasos } = fordFulkerson(grafo, id('S'), id('T'))
    expect(resultado.flujoMaximo).toBe(0)
    expect(resultado.corte.arcos).toEqual([])
    expect(pasos.at(-1)!.descripcion).toContain('el flujo máximo es 0')
  })

  it('no acumula errores de redondeo con capacidades decimales', () => {
    const { grafo, id } = desdeTexto('S A 0.1\nS B 0.2\nA T 0.1\nB T 0.2', true)
    expect(fordFulkerson(grafo, id('S'), id('T')).resultado.flujoMaximo).toBe(0.3)
  })

  it('valida fuente distinta del sumidero y capacidades no negativas', () => {
    const { grafo, id } = desdeTexto('S A 4\nA T -2', true)
    expect(estrategiaFlujo.validar(grafo, { origen: id('S'), destino: id('S') }).errores[0]).toContain('distintos')
    expect(estrategiaFlujo.validar(grafo, { origen: id('S'), destino: id('T') }).errores[0]).toContain('negativas')
    const noDirigido = { ...grafo, dirigido: false, aristas: grafo.aristas.slice(0, 1) }
    const v = estrategiaFlujo.validar(noDirigido, { origen: id('S'), destino: id('A') })
    expect(v.errores).toEqual([])
    expect(v.advertencias[0]).toContain('no es dirigido')
  })
})

describe('grafos grandes (200 nodos)', () => {
  const grande = (semilla: number) => {
    const grafo = desdePlano(grafoAleatorio({ minNodos: 200, maxNodos: 200, densidad: 0.6, semilla }), false)
    const origen = grafo.nodos[0].id
    return { grafo, origen, destino: nodoMasLejano(grafo, origen) }
  }

  it('Prim y Kruskal conectan los 200 nodos con 199 aristas y el mismo total', () => {
    for (const semilla of [1, 2, 3]) {
      const { grafo, origen } = grande(semilla)
      const p = prim(grafo, origen).resultado
      const k = kruskal(grafo).resultado
      expect(p.conexo).toBe(true)
      expect(p.aristas).toHaveLength(199)
      expect(k.aristas).toHaveLength(199)
      expect(k.total).toBe(p.total)
    }
  })

  it('Dijkstra devuelve una ruta válida y Ford-Fulkerson iguala flujo máximo y corte mínimo', () => {
    for (const semilla of [1, 2, 3]) {
      const { grafo, origen, destino } = grande(semilla)
      const ruta = dijkstra(grafo, origen, destino).resultado
      const pesos = new Map(grafo.aristas.map((a) => [a.id, a.peso]))
      expect(ruta.ruta).not.toBeNull()
      expect(ruta.aristasRuta.reduce((s, id) => s + pesos.get(id)!, 0)).toBe(ruta.distancia)
      const flujo = fordFulkerson(grafo, origen, destino).resultado
      expect(flujo.flujoMaximo).toBeGreaterThan(0)
      expect(flujo.corte.capacidad).toBe(flujo.flujoMaximo)
    }
  })
})
