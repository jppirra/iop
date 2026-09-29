import { describe, expect, it } from 'vitest'
import { desdePlano } from '../lib/grafo'
import { detectarFormato, exportarCsv, exportarJson, parsear, parsearCsv, parsearJson, parsearTexto } from './index'

describe('formato texto', () => {
  it('crea nodos a partir de las aristas', () => {
    const { grafo, errores } = parsearTexto('1 2 3\n2 3 4.5\n# comentario\n\n3 1 2,5')
    expect(errores).toEqual([])
    expect(grafo!.nodos.map((n) => n.nombre)).toEqual(['1', '2', '3'])
    expect(grafo!.aristas.map((a) => a.peso)).toEqual([3, 4.5, 2.5])
  })

  it('acepta nombres con espacios entre comillas', () => {
    const { grafo } = parsearTexto('"Casa 1" "Casa 2" 7')
    expect(grafo!.aristas[0]).toEqual({ origen: 'Casa 1', destino: 'Casa 2', peso: 7 })
  })

  it('informa errores por línea', () => {
    const { grafo, errores } = parsearTexto('1 2 3\n1 2\n2 3 x\n4 4 1\n1 2 5')
    expect(grafo).toBeNull()
    expect(errores.map((e) => e.ubicacion)).toEqual(['Línea 2', 'Línea 3', 'Línea 4', 'Línea 5'])
    expect(errores[0].mensaje).toContain('mal formada')
    expect(errores[1].mensaje).toContain('Peso no numérico')
    expect(errores[3].mensaje).toContain('repetida')
  })
})

describe('formato CSV', () => {
  it('lee encabezado origen,destino,peso', () => {
    const { grafo, errores } = parsearCsv('origen,destino,peso\nA,B,3\n"Casa, 1",B,2')
    expect(errores).toEqual([])
    expect(grafo!.nodos.map((n) => n.nombre)).toEqual(['A', 'B', 'Casa, 1'])
  })

  it('acepta columnas en otro orden y separador ;', () => {
    const { grafo } = parsearCsv('Peso;Origen;Destino\n2,5;A;B')
    expect(grafo!.aristas[0]).toEqual({ origen: 'A', destino: 'B', peso: 2.5 })
  })

  it('rechaza encabezado inválido y filas con peso no numérico', () => {
    expect(parsearCsv('a,b,c\n1,2,3').errores[0].mensaje).toContain('Encabezado inválido')
    const { errores } = parsearCsv('origen,destino,peso\nA,B,abc\nA')
    expect(errores).toHaveLength(2)
    expect(errores[0]).toEqual({ ubicacion: 'Línea 2', mensaje: 'Peso no numérico: "abc".' })
  })
})

describe('formato JSON', () => {
  it('lee dirigido, nodos y aristas', () => {
    const { grafo, errores } = parsearJson(
      JSON.stringify({ dirigido: true, nodos: ['A', { nombre: 'Z', x: 1, y: 2 }], aristas: [{ origen: 'A', destino: 'B', peso: 1 }] }),
    )
    expect(errores).toEqual([])
    expect(grafo!.dirigido).toBe(true)
    expect(grafo!.nodos).toEqual([{ nombre: 'A' }, { nombre: 'Z', x: 1, y: 2 }, { nombre: 'B' }])
  })

  it('reporta errores por arista', () => {
    const { errores } = parsearJson('{"aristas":[{"origen":"A","destino":"B","peso":"x"},{"origen":"A"}]}')
    expect(errores.map((e) => e.ubicacion)).toEqual(['aristas[0]', 'aristas[1]'])
  })

  it('reporta JSON inválido', () => {
    expect(parsearJson('{nope').errores[0].mensaje).toContain('JSON inválido')
  })
})

describe('detección y exportación', () => {
  it('detecta el formato por extensión o contenido', () => {
    expect(detectarFormato('{"aristas":[]}')).toBe('json')
    expect(detectarFormato('origen,destino,peso\n')).toBe('csv')
    expect(detectarFormato('1 2 3')).toBe('texto')
    expect(detectarFormato('1 2 3', 'grafo.csv')).toBe('csv')
  })

  it('exportar y volver a importar conserva el grafo', () => {
    const grafo = desdePlano(parsearTexto('A B 1\nB "C D" 2').grafo!, true)
    const json = parsear(exportarJson(grafo))
    expect(json.grafo!.dirigido).toBe(true)
    expect(json.grafo!.aristas).toEqual([
      { origen: 'A', destino: 'B', peso: 1 },
      { origen: 'B', destino: 'C D', peso: 2 },
    ])
    const csv = parsear(exportarCsv(grafo))
    expect(csv.errores).toEqual([])
    expect(csv.grafo!.aristas).toEqual(json.grafo!.aristas)
  })
})
