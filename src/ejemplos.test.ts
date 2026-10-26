import { describe, expect, it } from 'vitest'
import { estrategias } from './algorithms'
import { cpm } from './algorithms/cpm'
import { desdePlano } from './lib/grafo'
import { parsear } from './parsers'

import primKruskalCsv from '../ejemplos/prim-kruskal.csv?raw'
import primKruskalJson from '../ejemplos/prim-kruskal.json?raw'
import dijkstraCsv from '../ejemplos/dijkstra.csv?raw'
import dijkstraJson from '../ejemplos/dijkstra.json?raw'
import flujoMaximoCsv from '../ejemplos/flujo-maximo.csv?raw'
import flujoMaximoJson from '../ejemplos/flujo-maximo.json?raw'
import cpmParalelasCsv from '../ejemplos/cpm-paralelas.csv?raw'
import cpmParalelasJson from '../ejemplos/cpm-paralelas.json?raw'
import pertCsv from '../ejemplos/pert.csv?raw'
import pertJson from '../ejemplos/pert.json?raw'

/** Prueba de humo: los archivos de `ejemplos/` (documentación) cargan sin errores. */
const archivos = [
  [primKruskalCsv, 'csv', 'prim'],
  [primKruskalJson, 'json', 'kruskal'],
  [dijkstraCsv, 'csv', 'dijkstra'],
  [dijkstraJson, 'json', 'dijkstra'],
  [flujoMaximoCsv, 'csv', 'ford-fulkerson'],
  [flujoMaximoJson, 'json', 'ford-fulkerson'],
  [cpmParalelasCsv, 'csv', 'cpm'],
  [cpmParalelasJson, 'json', 'cpm'],
  [pertCsv, 'csv', 'pert'],
  [pertJson, 'json', 'pert'],
] as const

describe('ejemplos/ cargan sin errores y validan para su algoritmo', () => {
  for (const [texto, formato, idEstrategia] of archivos) {
    it(`${idEstrategia} (${formato})`, () => {
      const { grafo: plano, errores } = parsear(texto, formato)
      expect(errores).toEqual([])
      const estrategia = estrategias[idEstrategia]
      const dirigido = estrategia.forzarDirigido ? true : estrategia.forzarNoDirigido ? false : (plano!.dirigido ?? false)
      const grafo = desdePlano(plano!, dirigido)
      const parametros = Object.fromEntries(
        estrategia.parametros.map((p, i) => [p.clave, grafo.nodos[i === 0 ? 0 : grafo.nodos.length - 1].id]),
      )
      const v = estrategia.validar(grafo, parametros)
      expect(v.errores).toEqual([])
      const ejecucion = estrategia.ejecutar(grafo, parametros)
      expect(ejecucion.pasos.length).toBeGreaterThan(0)
    })
  }
})

describe('ejemplos/cpm-paralelas.csv resuelve la actividad paralela', () => {
  it('crea el evento intermedio y da la duración total correcta', () => {
    const { grafo: plano } = parsear(cpmParalelasCsv, 'csv')
    const grafo = desdePlano(plano!, true)
    expect(grafo.nodos.map((n) => n.nombre)).toEqual(['1', '2', '3', "2'"])
    const { resultado } = cpm(grafo)
    // A(4)+C(5)=9 por 1→2→3, contra B(2)+ficticia(0)+C(5)=7 por 1→2'→2→3, y D(6) por 1→3.
    expect(resultado.duracion).toBe(9)
    expect(resultado.actividades.filter((a) => a.ficticia)).toHaveLength(1)
  })
})
