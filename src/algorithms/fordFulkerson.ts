import type {
  ArcoFlujo,
  Arista,
  CorteMinimo,
  Ejecucion,
  Estrategia,
  Grafo,
  IteracionFlujo,
  Paso,
  ResultadoFlujo,
} from '../types/graph'
import {
  describirArista,
  mapaNombres,
  validacionVacia,
  validarGrafoNoVacio,
  validarParametroNodo,
} from './utils'

const EPS = 1e-9
/** Evita arrastrar errores de punto flotante con capacidades decimales (0,1 + 0,2). */
const limpiar = (x: number) => Math.round(x * 1e9) / 1e9

/** Tramo de un camino en la red residual. `sentido` 1: se recorre la arista de origen a destino; -1: al revés. */
interface Tramo {
  desde: string
  hasta: string
  arista: Arista
  sentido: 1 | -1
}

/**
 * Flujo máximo (Ford-Fulkerson).
 * En cada iteración busca un camino de aumento de la fuente al sumidero en la red residual,
 * calcula su cuello de botella k (la menor capacidad residual del camino) y envía k unidades.
 * Termina cuando no queda ningún camino: el flujo alcanzado es igual a la capacidad del corte mínimo.
 *
 * El camino se busca con BFS (el más corto en cantidad de arcos), así que siempre termina,
 * incluso con capacidades decimales. Si el grafo no es dirigido, cada arista puede llevar flujo
 * en cualquiera de los dos sentidos hasta su capacidad.
 */
export function fordFulkerson(grafo: Grafo, fuente: string, sumidero: string): Ejecucion<ResultadoFlujo> {
  const nombre = mapaNombres(grafo)
  const aristas = grafo.aristas.filter((a) => a.origen !== a.destino)
  // Flujo neto de cada arista: positivo si va de origen a destino.
  const flujo = new Map(aristas.map((a) => [a.id, 0]))
  const pasos: Paso[] = []
  const iteraciones: IteracionFlujo[] = []
  let total = 0

  const salidas = new Map<string, Tramo[]>(grafo.nodos.map((n) => [n.id, []]))
  for (const a of aristas) {
    salidas.get(a.origen)?.push({ desde: a.origen, hasta: a.destino, arista: a, sentido: 1 })
    salidas.get(a.destino)?.push({ desde: a.destino, hasta: a.origen, arista: a, sentido: -1 })
  }

  /** Cuánto flujo más se puede enviar por el tramo. El arco inverso de un grafo dirigido solo deshace flujo. */
  const residual = ({ arista, sentido }: Tramo) => {
    const f = flujo.get(arista.id)!
    if (sentido === 1) return limpiar(arista.peso - f)
    return limpiar(grafo.dirigido ? f : arista.peso + f)
  }
  /** El tramo va en contra del flujo ya asignado: enviar por él deshace (reencauza) ese flujo. */
  const esInverso = ({ arista, sentido }: Tramo) => sentido * flujo.get(arista.id)! < -EPS
  const flecha = (t: Tramo) => `${nombre(t.desde)}→${nombre(t.hasta)}`

  /** BFS en la red residual. Devuelve el camino (o null) y los nodos alcanzados desde la fuente. */
  const buscarCamino = () => {
    const previo = new Map<string, Tramo | null>([[fuente, null]])
    const cola = [fuente]
    while (cola.length && !previo.has(sumidero)) {
      const actual = cola.shift()!
      for (const t of salidas.get(actual) ?? []) {
        if (previo.has(t.hasta) || residual(t) <= EPS) continue
        previo.set(t.hasta, t)
        cola.push(t.hasta)
      }
    }
    const alcanzados = new Set(previo.keys())
    if (!previo.has(sumidero)) return { camino: null, alcanzados }
    const camino: Tramo[] = []
    for (let t = previo.get(sumidero); t; t = previo.get(t.desde)) camino.unshift(t)
    return { camino, alcanzados }
  }

  const arcos = (): ArcoFlujo[] =>
    aristas.map((a) => {
      const f = flujo.get(a.id)!
      const [desde, hasta] = f < 0 ? [a.destino, a.origen] : [a.origen, a.destino]
      return { aristaId: a.id, desde: nombre(desde), hasta: nombre(hasta), capacidad: a.peso, flujo: Math.abs(f) }
    })
  const etiquetas = () => Object.fromEntries(aristas.map((a) => [a.id, `${Math.abs(flujo.get(a.id)!)}/${a.peso}`]))
  const conFlujo = () => aristas.filter((a) => Math.abs(flujo.get(a.id)!) > EPS).map((a) => a.id)

  iteraciones.push({ numero: 0, camino: [], cuello: 0, flujoAcumulado: 0, arcos: arcos() })
  pasos.push({
    titulo: 'Inicio',
    descripcion: `Todos los arcos arrancan con flujo 0. Cada arco muestra flujo/capacidad. Se busca cuánto se puede enviar desde la fuente ${nombre(fuente)} hasta el sumidero ${nombre(sumidero)}.`,
    nodosActuales: [fuente, sumidero],
    aristasEvaluadas: [],
    nodosIncluidos: [],
    aristasIncluidas: [],
    aristasDescartadas: [],
    etiquetasAristas: etiquetas(),
    iteracion: 0,
  })

  let busqueda = buscarCamino()
  while (busqueda.camino) {
    const camino = busqueda.camino
    const numero = iteraciones.length
    const nodosCamino = [fuente, ...camino.map((t) => t.hasta)]
    const textoCamino = nodosCamino.map(nombre).join(' → ')
    const idsCamino = camino.map((t) => t.arista.id)
    const residuales = camino.map(residual)
    const k = Math.min(...residuales)
    const inversos = camino.filter(esInverso)

    pasos.push({
      titulo: `Iteración ${numero}: camino de aumento`,
      descripcion:
        `Camino de aumento en la red residual: ${textoCamino}. ` +
        `Capacidad residual de cada tramo: ${camino.map((t, i) => `${flecha(t)} = ${residuales[i]}`).join(', ')}. ` +
        `Cuello de botella: k = ${camino.length > 1 ? `min(${residuales.join(', ')}) = ` : ''}${k}.` +
        (inversos.length > 0
          ? ` ${inversos.map(flecha).join(', ')} va en contra del flujo ya asignado (arco inverso): enviar por ahí deshace esa decisión y reencauza el flujo.`
          : ''),
      nodosActuales: nodosCamino,
      aristasEvaluadas: idsCamino,
      nodosIncluidos: [],
      aristasIncluidas: conFlujo().filter((id) => !idsCamino.includes(id)),
      aristasDescartadas: [],
      etiquetasAristas: etiquetas(),
      iteracion: numero - 1,
    })

    for (const t of camino) flujo.set(t.arista.id, limpiar(flujo.get(t.arista.id)! + t.sentido * k))
    total = limpiar(total + k)
    // Saturado: quedó con flujo igual a su capacidad (un arco inverso que se vacía no cuenta).
    const saturados = camino.filter((t) => Math.abs(flujo.get(t.arista.id)!) >= t.arista.peso - EPS && residual(t) <= EPS)
    const estado = arcos()
    const detalle = (id: string) => {
      const a = estado.find((x) => x.aristaId === id)!
      return `${a.desde}→${a.hasta} ${a.flujo}/${a.capacidad}`
    }

    iteraciones.push({ numero, camino: nodosCamino.map(nombre), cuello: k, flujoAcumulado: total, arcos: estado })
    pasos.push({
      titulo: `Iteración ${numero}: aumentar el flujo`,
      descripcion:
        `${k === 1 ? 'Se envía 1 unidad' : `Se envían ${k} unidades`} por ${textoCamino}. Flujo actualizado: ${idsCamino.map(detalle).join(', ')}. ` +
        (saturados.length > 0
          ? `${saturados.length > 1 ? 'Se saturan' : 'Se satura'} ${saturados.map(flecha).join(', ')}: ya no admite${saturados.length > 1 ? 'n' : ''} más flujo. `
          : '') +
        `Flujo acumulado: ${total}.`,
      nodosActuales: [],
      aristasEvaluadas: [],
      nodosIncluidos: [],
      aristasIncluidas: conFlujo(),
      aristasDescartadas: [],
      etiquetasAristas: etiquetas(),
      iteracion: numero,
    })

    busqueda = buscarCamino()
  }

  // Sin camino de aumento: lo alcanzable desde la fuente define el corte mínimo.
  const lado = busqueda.alcanzados
  const cruzan = aristas
    .map((a) => (lado.has(a.origen) && !lado.has(a.destino) ? a : !grafo.dirigido && lado.has(a.destino) && !lado.has(a.origen) ? { ...a, origen: a.destino, destino: a.origen } : null))
    .filter((a): a is Arista => !!a)
  const corte: CorteMinimo = {
    ladoFuente: grafo.nodos.filter((n) => lado.has(n.id)).map((n) => n.nombre),
    ladoSumidero: grafo.nodos.filter((n) => !lado.has(n.id)).map((n) => n.nombre),
    arcos: cruzan.map((a) => ({ aristaId: a.id, desde: nombre(a.origen), hasta: nombre(a.destino), capacidad: a.peso })),
    capacidad: limpiar(cruzan.reduce((s, a) => s + a.peso, 0)),
  }
  const idsCorte = corte.arcos.map((a) => a.aristaId)
  const ultima = iteraciones.length - 1
  const sumaCorte = corte.arcos.map((a) => a.capacidad).join(' + ')

  pasos.push({
    titulo: 'Condición de parada',
    descripcion:
      `Ya no queda ningún camino de ${nombre(fuente)} a ${nombre(sumidero)} con capacidad residual positiva. ` +
      `Desde la fuente todavía se alcanza {${corte.ladoFuente.join(', ')}}; no se alcanza {${corte.ladoSumidero.join(', ')}}. ` +
      (corte.arcos.length > 0
        ? `Los arcos que cruzan de un lado al otro están saturados y forman el corte mínimo: ${corte.arcos.map((a) => `${a.desde}→${a.hasta} (${a.capacidad})`).join(', ')}.`
        : 'Ningún arco cruza de un lado al otro.'),
    nodosActuales: [],
    aristasEvaluadas: [],
    nodosIncluidos: [...lado],
    aristasIncluidas: conFlujo(),
    aristasDescartadas: [],
    aristasCorte: idsCorte,
    etiquetasAristas: etiquetas(),
    iteracion: ultima,
  })

  const aportes = iteraciones.slice(1).map((it) => it.cuello)
  pasos.push({
    titulo: 'Resultado',
    descripcion:
      total > 0
        ? `Flujo máximo de ${nombre(fuente)} a ${nombre(sumidero)}: ${aportes.length > 1 ? `${aportes.join(' + ')} = ` : ''}${total}. ` +
          `Coincide con la capacidad del corte mínimo${corte.arcos.length > 1 ? ` (${sumaCorte} = ${corte.capacidad})` : ''}: ninguna otra asignación puede superarlo.`
        : `No hay ningún camino de ${nombre(fuente)} a ${nombre(sumidero)}${grafo.dirigido ? ' respetando el sentido de los arcos' : ''}: el flujo máximo es 0.`,
    nodosActuales: [],
    aristasEvaluadas: [],
    nodosIncluidos: [],
    aristasIncluidas: [],
    aristasDescartadas: [],
    aristasResultado: conFlujo(),
    aristasCorte: idsCorte,
    etiquetasAristas: etiquetas(),
    iteracion: ultima,
  })

  return {
    pasos,
    resultado: {
      tipo: 'flujo',
      fuente: nombre(fuente),
      sumidero: nombre(sumidero),
      flujoMaximo: total,
      iteraciones,
      corte,
    },
  }
}

export const estrategia: Estrategia = {
  id: 'ford-fulkerson',
  nombre: 'Flujo máximo - Ford-Fulkerson',
  grupo: 'Flujo máximo',
  descripcion: 'Envía flujo por caminos de aumento de la fuente al sumidero hasta que no queda ninguno. El peso de cada arco es su capacidad.',
  orden: 40,
  parametros: [
    { clave: 'origen', etiqueta: 'fuente (S)' },
    { clave: 'destino', etiqueta: 'sumidero (T)' },
  ],
  leyenda: {
    evaluada: 'Camino de aumento',
    incluida: 'Arco con flujo',
    resultado: 'Flujo final',
    corte: 'Corte mínimo (arcos saturados)',
  },
  validar(grafo, parametros) {
    const v = validacionVacia()
    validarGrafoNoVacio(grafo, v)
    if (v.errores.length) return v
    validarParametroNodo(grafo, parametros, 'origen', 'nodo fuente', v)
    validarParametroNodo(grafo, parametros, 'destino', 'nodo sumidero', v)
    if (parametros.origen && parametros.origen === parametros.destino)
      v.errores.push('La fuente y el sumidero tienen que ser nodos distintos.')
    const nombre = mapaNombres(grafo)
    const negativas = grafo.aristas.filter((a) => a.peso < 0)
    if (negativas.length > 0)
      v.errores.push(
        `Las capacidades no pueden ser negativas: ${negativas.map((a) => `${describirArista(a, nombre, grafo.dirigido)} (${a.peso})`).join(', ')}.`,
      )
    if (!grafo.dirigido)
      v.advertencias.push('El grafo no es dirigido: cada arista puede llevar flujo en cualquiera de los dos sentidos, hasta su capacidad.')
    return v
  },
  ejecutar: (grafo, parametros) => fordFulkerson(grafo, parametros.origen!, parametros.destino!),
}
