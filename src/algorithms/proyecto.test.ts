import { describe, expect, it } from 'vitest'
import { ejemplosLibro } from '../examples/libro'
import { grafoAleatorio } from '../lib/aleatorio'
import { desdePlano } from '../lib/grafo'
import { exportarCsv, exportarJson, parsear, parsearTexto } from '../parsers'
import type { ResultadoProyecto } from '../types/graph'
import { cpm, estrategia as estrategiaCpm } from './cpm'
import { estrategia as estrategiaPert, pert } from './pert'
import { probabilidadDeTerminar, probabilidadNormal } from './proyecto'

const ejemplo = (id: string) => {
  const e = ejemplosLibro.find((x) => x.id === id)!
  return desdePlano(e.grafo, true)
}
const desdeTexto = (texto: string) => {
  const { grafo, errores } = parsearTexto(texto)
  expect(errores).toEqual([])
  return desdePlano(grafo!, true)
}
const actividad = (r: ResultadoProyecto, desde: string, hasta: string) => r.actividades.find((a) => a.desde === desde && a.hasta === hasta)!
const tiempos = (r: ResultadoProyecto, desde: string, hasta: string) => {
  const a = actividad(r, desde, hasta)
  return [a.es, a.ef, a.ls, a.lf, a.holgura]
}

describe('CPM - General Foundry', () => {
  it('el proyecto dura 15 semanas y la ruta crítica es A-C-E-G-H', () => {
    const { resultado, pasos } = cpm(ejemplo('general-foundry-cpm'))
    expect(resultado.duracion).toBe(15)
    expect(resultado.rutaCritica).toEqual(['1', '2', '4', '5', '6', '7'])
    expect(resultado.rutasCriticas).toBe(1)
    expect(resultado.actividades.filter((a) => a.critica).map((a) => `${a.desde}-${a.hasta}`)).toEqual(['1-2', '2-4', '4-5', '5-6', '6-7'])
    // inicio + 7 eventos hacia adelante + duración + 7 hacia atrás + holguras + resultado
    expect(pasos).toHaveLength(18)
    expect(pasos.at(-1)!.aristasResultado).toHaveLength(5)
  })

  it('reproduce inicio y terminación más cercanos y más lejanos, y las holguras del libro', () => {
    const { resultado } = cpm(ejemplo('general-foundry-cpm'))
    // [IC, TC, IL, TL, holgura]
    expect(tiempos(resultado, '1', '2')).toEqual([0, 2, 0, 2, 0]) // A
    expect(tiempos(resultado, '1', '3')).toEqual([0, 3, 1, 4, 1]) // B
    expect(tiempos(resultado, '2', '4')).toEqual([2, 4, 2, 4, 0]) // C
    expect(tiempos(resultado, '3', '5')).toEqual([3, 7, 4, 8, 1]) // D
    expect(tiempos(resultado, '4', '5')).toEqual([4, 8, 4, 8, 0]) // E
    expect(tiempos(resultado, '4', '6')).toEqual([4, 7, 10, 13, 6]) // F
    expect(tiempos(resultado, '5', '6')).toEqual([8, 13, 8, 13, 0]) // G
    expect(tiempos(resultado, '6', '7')).toEqual([13, 15, 13, 15, 0]) // H
  })

  it('explica cada evento con el mayor de los tiempos que llegan', () => {
    const { pasos } = cpm(ejemplo('general-foundry-cpm'))
    const evento5 = pasos.find((p) => p.titulo === 'Hacia adelante: evento 5')!
    expect(evento5.descripcion).toContain('el mayor de 3 + 4 (3→5), 4 + 4 (4→5) = 8')
    const evento4 = pasos.find((p) => p.titulo === 'Hacia atrás: evento 4')!
    expect(evento4.descripcion).toContain('el menor de 8 − 4 (4→5), 13 − 3 (4→6) = 4')
  })
})

describe('PERT - General Foundry', () => {
  it('calcula el tiempo esperado y la varianza de cada actividad', () => {
    const { resultado } = pert(ejemplo('general-foundry-pert'))
    expect(resultado.actividades.map((a) => a.duracion)).toEqual([2, 3, 2, 4, 4, 3, 5, 2])
    expect(actividad(resultado, '4', '6').varianza).toBeCloseTo(64 / 36, 9) // F: ((9 − 1) / 6)²
    expect(actividad(resultado, '1', '2').varianza).toBeCloseTo(4 / 36, 9) // A
  })

  it('duración esperada 15, varianza 3,11 y desvío 1,76 sobre la ruta crítica', () => {
    const { resultado, pasos } = pert(ejemplo('general-foundry-pert'))
    expect(resultado.duracion).toBe(15)
    expect(resultado.rutaCritica).toEqual(['1', '2', '4', '5', '6', '7'])
    expect(resultado.varianza).toBeCloseTo(112 / 36, 9)
    expect(resultado.desvio).toBeCloseTo(1.76, 2)
    // Durante la ejecución cada arco muestra su tiempo esperado.
    expect(Object.values(pasos[0].etiquetasAristas!)).toEqual(['2', '3', '2', '4', '4', '3', '5', '2'])
  })

  it('la probabilidad de terminar en 16 semanas es 71,5 %', () => {
    const { resultado } = pert(ejemplo('general-foundry-pert'))
    const { z, probabilidad } = probabilidadDeTerminar(resultado.duracion, resultado.desvio!, 16)
    expect(z).toBeCloseTo(0.57, 2)
    expect(probabilidad).toBeCloseTo(0.7146, 3)
    expect(probabilidadDeTerminar(15, 1.76, 15).probabilidad).toBeCloseTo(0.5, 6)
  })

  it('sin tiempos optimista y pesimista coincide con CPM y la varianza es 0', () => {
    const grafo = ejemplo('general-foundry-cpm')
    const r = pert(grafo).resultado
    expect(r.duracion).toBe(cpm(grafo).resultado.duracion)
    expect(r.varianza).toBe(0)
    expect(estrategiaPert.validar(grafo, {}).advertencias[0]).toContain('Ninguna actividad tiene tiempos optimista y pesimista')
    expect(probabilidadDeTerminar(15, 0, 14)).toEqual({ z: null, probabilidad: 0 })
  })
})

describe('CPM y PERT - casos generales', () => {
  it('la normal estándar da los valores de tabla', () => {
    expect(probabilidadNormal(0)).toBeCloseTo(0.5, 6)
    expect(probabilidadNormal(1)).toBeCloseTo(0.8413, 4)
    expect(probabilidadNormal(-1.96)).toBeCloseTo(0.025, 4)
  })

  it('detecta un ciclo y lo muestra', () => {
    const grafo = desdeTexto('A B 2\nB C 3\nC A 1\nC D 4')
    const { errores } = estrategiaCpm.validar(grafo, {})
    expect(errores[0]).toContain('La red tiene un ciclo (')
    expect(errores[0]).toMatch(/A → B → C → A|B → C → A → B|C → A → B → C/)
  })

  it('rechaza duraciones negativas y tiempos desordenados', () => {
    expect(estrategiaCpm.validar(desdeTexto('A B -2'), {}).errores[0]).toContain('no pueden ser negativas')
    const grafo = desdeTexto('A B 4')
    const desordenado = { ...grafo, aristas: [{ ...grafo.aristas[0], optimista: 5, pesimista: 6 }] }
    expect(estrategiaPert.validar(desordenado, {}).errores[0]).toContain('optimista ≤ más probable ≤ pesimista')
  })

  it('con dos rutas críticas iguales avisa y PERT informa la de mayor varianza', () => {
    // S→A→T y S→B→T duran 10; la de B tiene más dispersión.
    const grafo = desdeTexto('S A 4 5 6\nA T 4 5 6\nS B 1 5 9\nB T 4 5 6')
    const { resultado, pasos } = pert(grafo)
    expect(resultado.duracion).toBe(10)
    expect(resultado.rutasCriticas).toBe(2)
    expect(resultado.rutaCritica).toEqual(['S', 'B', 'T'])
    expect(pasos.at(-1)!.empate).toContain('Hay 2 rutas críticas')
    expect(pasos.at(-1)!.aristasResultado).toHaveLength(4)
  })

  it('acepta actividades ficticias de duración 0 y varios eventos iniciales o finales', () => {
    const grafo = desdeTexto('1 3 5\n2 3 2\n3 4 0\n3 5 6\n4 6 3')
    const v = estrategiaCpm.validar(grafo, {})
    expect(v.errores).toEqual([])
    expect(v.advertencias.join(' ')).toContain('más de un evento inicial (1, 2)')
    expect(v.advertencias.join(' ')).toContain('más de un evento final (5, 6)')
    const { resultado } = cpm(grafo)
    expect(resultado.duracion).toBe(11)
    expect(resultado.rutaCritica).toEqual(['1', '3', '5'])
    expect(actividad(resultado, '2', '3').holgura).toBe(3)
    expect(actividad(resultado, '4', '6').holgura).toBe(3)
  })

  it('en una red de 200 eventos la ruta crítica suma la duración y ninguna holgura es negativa', () => {
    for (const semilla of [1, 2, 3]) {
      const grafo = desdePlano(grafoAleatorio({ minNodos: 200, maxNodos: 200, densidad: 0.6, semilla }), true)
      expect(estrategiaCpm.validar(grafo, {}).errores).toEqual([])
      const { resultado } = cpm(grafo)
      const pesos = new Map(grafo.aristas.map((a) => [a.id, a.peso]))
      expect(resultado.arcosRutaCritica.reduce((s, id) => s + pesos.get(id)!, 0)).toBe(resultado.duracion)
      expect(Math.min(...resultado.actividades.map((a) => a.holgura))).toBe(0)
      for (const a of resultado.actividades) expect(a.lf).toBeLessThanOrEqual(resultado.duracion)
    }
  })
})

describe('carga de los tres tiempos de PERT', () => {
  it('texto: cinco valores por línea', () => {
    const { grafo, errores } = parsearTexto('1 2 1 2 3\n2 3 4')
    expect(errores).toEqual([])
    expect(grafo!.aristas).toEqual([
      { origen: '1', destino: '2', peso: 2, optimista: 1, pesimista: 3 },
      { origen: '2', destino: '3', peso: 4 },
    ])
    expect(parsearTexto('1 2 5 2 3').errores[0].mensaje).toContain('optimista ≤ más probable ≤ pesimista')
    expect(parsearTexto('1 2 3 4').errores[0].mensaje).toContain('3 valores (origen destino peso) o 5')
  })

  it('CSV y JSON: columnas optimista y pesimista, y exportar los conserva', () => {
    const csv = parsear('origen,destino,peso,optimista,pesimista\n1,2,2,1,3\n2,3,4,,', 'csv')
    expect(csv.errores).toEqual([])
    expect(csv.grafo!.aristas[0]).toEqual({ origen: '1', destino: '2', peso: 2, optimista: 1, pesimista: 3 })
    expect(csv.grafo!.aristas[1]).toEqual({ origen: '2', destino: '3', peso: 4 })

    const grafo = ejemplo('general-foundry-pert')
    for (const texto of [exportarJson(grafo), exportarCsv(grafo)]) {
      const vuelta = parsear(texto)
      expect(vuelta.errores).toEqual([])
      expect(pert(desdePlano(vuelta.grafo!, true)).resultado.varianza).toBeCloseTo(112 / 36, 9)
    }
    expect(parsear('{"aristas":[{"origen":"1","destino":"2","peso":2,"optimista":3,"pesimista":4}]}', 'json').errores[0].mensaje).toContain('optimista ≤ peso')
  })
})
