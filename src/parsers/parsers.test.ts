import { describe, expect, it } from 'vitest'
import { desdePlano } from '../lib/grafo'
import { detectarFormato, erroresDireccion, exportarCsv, exportarJson, parsear, parsearCsv, parsearJson, parsearTexto } from './index'

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

describe('línea "dirigido=" (CSV y texto)', () => {
  it('texto: dirigido=true antes de las aristas', () => {
    const { grafo, errores } = parsearTexto('dirigido=true\nA B 1\nB A 2')
    expect(errores).toEqual([])
    expect(grafo!.dirigido).toBe(true)
    expect(grafo!.aristas).toHaveLength(2) // dirigido: A→B y B→A son aristas distintas
  })

  it('texto: dirigido=FALSE sin distinguir mayúsculas y con espacios', () => {
    const { grafo, errores } = parsearTexto('dirigido = FALSE\nA B 1')
    expect(errores).toEqual([])
    expect(grafo!.dirigido).toBe(false)
  })

  it('texto: sin la línea, dirigido queda sin declarar', () => {
    const { grafo } = parsearTexto('A B 1')
    expect(grafo!.dirigido).toBeUndefined()
  })

  it('CSV: dirigido=false antes del encabezado', () => {
    const { grafo, errores } = parsearCsv('dirigido=false\norigen,destino,peso\nA,B,3')
    expect(errores).toEqual([])
    expect(grafo!.dirigido).toBe(false)
    expect(detectarFormato('dirigido=false\norigen,destino,peso\nA,B,3')).toBe('csv')
  })

  it('exportar → importar conserva la dirección (CSV y JSON)', () => {
    const grafo = desdePlano(parsearTexto('A B 1').grafo!, true)
    expect(exportarCsv(grafo).split('\n')[0]).toBe('dirigido=true')
    expect(parsear(exportarCsv(grafo)).grafo!.dirigido).toBe(true)
    expect(parsear(exportarJson(grafo)).grafo!.dirigido).toBe(true)
  })
})

describe('A→B y B→A en una red no dirigida', () => {
  it('texto: error si la red declarada es no dirigida', () => {
    const { grafo, errores } = parsearTexto('dirigido=false\nA B 1\nB A 2')
    expect(grafo).toBeNull()
    expect(errores).toHaveLength(1)
    expect(errores[0].ubicacion).toBe('Línea 3')
    expect(errores[0].mensaje).toContain('misma arista')
    expect(errores[0].mensaje).toContain('dirigido=true')
  })

  it('texto: válido si la red es dirigida', () => {
    const { grafo, errores } = parsearTexto('dirigido=true\nA B 1\nB A 2')
    expect(errores).toEqual([])
    expect(grafo!.aristas).toHaveLength(2)
  })

  it('JSON: mismo error con "dirigido": false', () => {
    const { errores } = parsearJson(
      JSON.stringify({ dirigido: false, aristas: [{ origen: 'A', destino: 'B', peso: 1 }, { origen: 'B', destino: 'A', peso: 2 }] }),
    )
    expect(errores).toHaveLength(1)
    expect(errores[0].ubicacion).toBe('aristas[1]')
    expect(errores[0].mensaje).toContain('misma arista')
  })

  it('sin declarar: erroresDireccion detecta el conflicto una vez resuelta la dirección final', () => {
    const { grafo } = parsearTexto('A B 1\nB A 2')
    expect(grafo!.dirigido).toBeUndefined()
    expect(erroresDireccion(grafo!, true)).toEqual([]) // dirigido: no hay conflicto
    const errores = erroresDireccion(grafo!, false)
    expect(errores).toHaveLength(1)
    expect(errores[0].ubicacion).toBe('aristas[1]')
    expect(errores[0].mensaje).toContain('misma arista')
  })
})

describe('actividades paralelas (CPM/PERT)', () => {
  it('texto: dos actividades con el mismo origen y destino, con nombres distintos', () => {
    const { grafo, errores } = parsearTexto('1 2 5 actividad=A\n1 2 3 actividad=B')
    expect(errores).toEqual([])
    expect(grafo!.aristas).toHaveLength(2)
    expect(grafo!.aristas.map((a) => a.actividad)).toEqual(['A', 'B'])
    expect(grafo!.aristas.every((a) => a.origen === '1' && a.destino === '2')).toBe(true)
  })

  it('texto: repetida sin actividad sigue siendo error, con la guía de actividades paralelas', () => {
    const { grafo, errores } = parsearTexto('1 2 5\n1 2 3')
    expect(grafo).toBeNull()
    expect(errores[0].mensaje).toContain('Arista repetida')
    expect(errores[0].mensaje).toContain('actividad=Nombre')
  })

  it('texto: repetida con el mismo nombre de actividad también es error', () => {
    const { errores } = parsearTexto('1 2 5 actividad=A\n1 2 3 actividad=A')
    expect(errores[0].mensaje).toContain('Ya existe una actividad "A"')
  })

  it('texto: "actividad=" no es ambiguo con los 5 valores de PERT', () => {
    const { grafo, errores } = parsearTexto('1 2 2 4 6 actividad=A')
    expect(errores).toEqual([])
    expect(grafo!.aristas[0]).toMatchObject({ optimista: 2, peso: 4, pesimista: 6, actividad: 'A' })
  })

  it('CSV: columna actividad', () => {
    const { grafo, errores } = parsearCsv('origen,destino,peso,actividad\n1,2,5,A\n1,2,3,B')
    expect(errores).toEqual([])
    expect(grafo!.aristas.map((a) => a.actividad)).toEqual(['A', 'B'])
  })

  it('JSON: campo actividad', () => {
    const { grafo, errores } = parsearJson(
      JSON.stringify({ aristas: [{ origen: '1', destino: '2', peso: 5, actividad: 'A' }, { origen: '1', destino: '2', peso: 3, actividad: 'B' }] }),
    )
    expect(errores).toEqual([])
    expect(grafo!.aristas.map((a) => a.actividad)).toEqual(['A', 'B'])
  })

  it('exportar → importar conserva la actividad', () => {
    // Con distinto origen/destino cada una, desdePlano no necesita crear un evento intermedio.
    const grafo = desdePlano(parsearTexto('1 2 5 actividad=A\n2 3 3 actividad=B').grafo!, true)
    expect(parsear(exportarCsv(grafo)).grafo!.aristas.map((a) => a.actividad)).toEqual(['A', 'B'])
    expect(parsear(exportarJson(grafo)).grafo!.aristas.map((a) => a.actividad)).toEqual(['A', 'B'])
  })
})

describe('JSON de ejemplo para descargar', () => {
  it('se puede volver a subir sin errores', async () => {
    const { EJEMPLO_JSON } = await import('../examples/libro')
    const { grafo, errores } = parsear(EJEMPLO_JSON, detectarFormato(EJEMPLO_JSON, 'grafo-ejemplo.json'))
    expect(errores).toEqual([])
    expect(grafo!.nodos).toHaveLength(7)
    expect(grafo!.aristas).toHaveLength(11)
    expect(grafo!.nodos[0]).toEqual({ nombre: '1', x: 90, y: 300 })
  })
})
