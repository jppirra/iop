import type {
  ActividadProyecto,
  Arista,
  Ejecucion,
  Grafo,
  Paso,
  ResultadoProyecto,
  Validacion,
} from '../types/graph'
import { describirArista, mapaNombres, validacionVacia, validarGrafoNoVacio } from './utils'

// Base común de CPM y PERT. No exporta `estrategia`: no se registra como algoritmo.
//
// La red es de "actividad en el arco": cada arco es una actividad (su peso es la duración)
// y cada nodo es un evento (el momento en que terminaron todas las actividades que llegan a él).

const EPS = 1e-9
const limpiar = (x: number) => Math.round(x * 1e9) / 1e9
/** Los tiempos se muestran con hasta 2 decimales. */
export const fmt = (x: number) => String(Math.round(x * 100) / 100)

export interface TiemposActividad {
  duracion: number
  optimista?: number
  masProbable?: number
  pesimista?: number
  varianza?: number
}

/** CPM: la duración es el peso del arco. */
export const tiemposCpm = (a: Arista): TiemposActividad => ({ duracion: a.peso })

/**
 * PERT: tiempo esperado te = (a + 4m + b) / 6 y varianza ((b − a) / 6)².
 * El peso del arco es el tiempo más probable (m); sin optimista/pesimista la actividad es de tiempo fijo.
 */
export function tiemposPert(a: Arista): TiemposActividad {
  const optimista = a.optimista ?? a.peso
  const pesimista = a.pesimista ?? a.peso
  return {
    duracion: limpiar((optimista + 4 * a.peso + pesimista) / 6),
    optimista,
    masProbable: a.peso,
    pesimista,
    varianza: limpiar(((pesimista - optimista) / 6) ** 2),
  }
}

/** Orden topológico (cada evento después de todos los que lo preceden). Devuelve null si hay un ciclo. */
export function ordenTopologico(grafo: Grafo): string[] | null {
  const entrantes = new Map(grafo.nodos.map((n) => [n.id, 0]))
  for (const a of grafo.aristas) entrantes.set(a.destino, entrantes.get(a.destino)! + 1)
  const cola = grafo.nodos.filter((n) => entrantes.get(n.id) === 0).map((n) => n.id)
  const orden: string[] = []
  while (cola.length) {
    const actual = cola.shift()!
    orden.push(actual)
    for (const a of grafo.aristas) {
      if (a.origen !== actual) continue
      entrantes.set(a.destino, entrantes.get(a.destino)! - 1)
      if (entrantes.get(a.destino) === 0) cola.push(a.destino)
    }
  }
  return orden.length === grafo.nodos.length ? orden : null
}

/** Un ciclo de la red (ids de nodo, el primero se repite al final), para mostrarlo en el error. */
function buscarCiclo(grafo: Grafo): string[] {
  // Se sacan los eventos que no pueden estar en un ciclo; a los que quedan siempre les llega un arco de otro que queda.
  const quedan = new Set(grafo.nodos.map((n) => n.id))
  for (let cambio = true; cambio; ) {
    cambio = false
    for (const id of quedan) {
      if (!grafo.aristas.some((a) => a.destino === id && quedan.has(a.origen))) {
        quedan.delete(id)
        cambio = true
      }
    }
  }
  const camino: string[] = []
  let actual = [...quedan][0]
  while (!camino.includes(actual)) {
    camino.unshift(actual)
    actual = grafo.aristas.find((a) => a.destino === actual && quedan.has(a.origen))!.origen
  }
  return [actual, ...camino.slice(0, camino.indexOf(actual) + 1)]
}

export function validarProyecto(grafo: Grafo, metodo: 'cpm' | 'pert'): Validacion {
  const v = validacionVacia()
  validarGrafoNoVacio(grafo, v)
  if (v.errores.length) return v
  const nombre = mapaNombres(grafo)
  if (grafo.aristas.length === 0) {
    v.errores.push('La red no tiene actividades: cada arco es una actividad y su peso es la duración.')
    return v
  }
  const negativas = grafo.aristas.filter((a) => a.peso < 0 || (a.optimista ?? 0) < 0)
  if (negativas.length > 0)
    v.errores.push(`Las duraciones no pueden ser negativas: ${negativas.map((a) => describirArista(a, nombre, true)).join(', ')}.`)
  if (metodo === 'pert') {
    const desordenadas = grafo.aristas.filter((a) => (a.optimista ?? a.peso) > a.peso || (a.pesimista ?? a.peso) < a.peso)
    if (desordenadas.length > 0)
      v.errores.push(
        `Los tiempos tienen que cumplir optimista ≤ más probable ≤ pesimista: ${desordenadas.map((a) => describirArista(a, nombre, true)).join(', ')}.`,
      )
  }
  if (!ordenTopologico(grafo)) {
    v.errores.push(
      `La red tiene un ciclo (${buscarCiclo(grafo).map(nombre).join(' → ')}): una actividad no puede depender de sí misma. Revisá el sentido de los arcos.`,
    )
    return v
  }

  const inicios = grafo.nodos.filter((n) => !grafo.aristas.some((a) => a.destino === n.id))
  const finales = grafo.nodos.filter((n) => !grafo.aristas.some((a) => a.origen === n.id))
  if (inicios.length > 1)
    v.advertencias.push(`Hay más de un evento inicial (${inicios.map((n) => n.nombre).join(', ')}): todos arrancan en el tiempo 0.`)
  if (finales.length > 1)
    v.advertencias.push(`Hay más de un evento final (${finales.map((n) => n.nombre).join(', ')}): el proyecto termina cuando termina el último.`)
  if (metodo === 'pert') {
    const fijas = grafo.aristas.filter((a) => a.optimista === undefined || a.pesimista === undefined).length
    if (fijas > 0)
      v.advertencias.push(
        `${fijas === grafo.aristas.length ? 'Ninguna actividad tiene' : `${fijas} ${fijas === 1 ? 'actividad no tiene' : 'actividades no tienen'}`} tiempos optimista y pesimista: se ${fijas === 1 ? 'toma' : 'toman'} como de tiempo fijo (varianza 0). Cargalos como "optimista más probable pesimista".`,
      )
  }
  return v
}

/**
 * Cálculo de la red de un proyecto. Supone una red válida (dirigida y sin ciclos).
 * 1. Recorrido hacia adelante: tiempo más temprano de cada evento = el mayor (temprano del origen + duración).
 * 2. La duración del proyecto es el mayor tiempo más temprano.
 * 3. Recorrido hacia atrás: tiempo más tardío de cada evento = el menor (tardío del destino − duración).
 * 4. Holgura de cada actividad = inicio más tardío − inicio más temprano. Las de holgura 0 forman la ruta crítica.
 */
export function calcularProyecto(
  grafo: Grafo,
  metodo: 'cpm' | 'pert',
  tiempos: (a: Arista) => TiemposActividad,
): Ejecucion<ResultadoProyecto> {
  const nombre = mapaNombres(grafo)
  const orden = ordenTopologico(grafo)!
  const n = orden.length
  const t = new Map(grafo.aristas.map((a) => [a.id, tiempos(a)]))
  const dur = (a: Arista) => t.get(a.id)!.duracion
  const flecha = (a: Arista) => `${nombre(a.origen)}→${nombre(a.destino)}`
  const temprano = new Map<string, number>()
  const tardio = new Map<string, number>()
  const pasos: Paso[] = []
  const etiquetas = metodo === 'pert' ? Object.fromEntries(grafo.aristas.map((a) => [a.id, fmt(dur(a))])) : undefined
  const paso = (p: Pick<Paso, 'titulo' | 'descripcion' | 'iteracion'> & Partial<Paso>) =>
    pasos.push({
      nodosActuales: [],
      aristasEvaluadas: [],
      nodosIncluidos: [],
      aristasIncluidas: [],
      aristasDescartadas: [],
      etiquetasAristas: etiquetas,
      ...p,
    })
  const lista = (textos: string[], maximo = 12) =>
    textos.length > maximo ? `${textos.slice(0, maximo).join('; ')}; y ${textos.length - maximo} más` : textos.join('; ')

  paso({
    titulo: 'Inicio',
    descripcion:
      metodo === 'pert'
        ? `Cada arco es una actividad con tres tiempos: optimista (a), más probable (m) y pesimista (b). Se calcula el tiempo esperado te = (a + 4m + b) / 6, que pasa a ser la duración: ${lista(grafo.aristas.map((a) => `${flecha(a)} = ${fmt(dur(a))}`))}.`
        : 'Cada arco es una actividad y su peso es la duración; cada nodo es un evento. Se busca la duración mínima del proyecto y qué actividades no se pueden atrasar.',
    iteracion: 0,
  })

  // 1. Hacia adelante
  orden.forEach((u, i) => {
    const entran = grafo.aristas.filter((a) => a.destino === u)
    const valores = entran.map((a) => limpiar(temprano.get(a.origen)! + dur(a)))
    temprano.set(u, entran.length ? Math.max(...valores) : 0)
    paso({
      titulo: `Hacia adelante: evento ${nombre(u)}`,
      descripcion: entran.length
        ? `Tiempo más temprano del evento ${nombre(u)} = ${entran.length > 1 ? 'el mayor de ' : ''}${entran.map((a) => `${fmt(temprano.get(a.origen)!)} + ${fmt(dur(a))} (${flecha(a)})`).join(', ')} = ${fmt(temprano.get(u)!)}. Recién ahí terminaron todas las actividades que llegan a él.`
        : `El evento ${nombre(u)} no tiene actividades previas: es un inicio del proyecto y su tiempo más temprano es 0.`,
      nodosActuales: [u],
      aristasEvaluadas: entran.map((a) => a.id),
      nodosIncluidos: orden.slice(0, i + 1),
      iteracion: i + 1,
    })
  })

  // 2. Duración del proyecto
  const duracion = Math.max(...orden.map((u) => temprano.get(u)!))
  paso({
    titulo: 'Duración del proyecto',
    descripcion: `El mayor tiempo más temprano es ${fmt(duracion)}: es la duración ${metodo === 'pert' ? 'esperada ' : ''}del proyecto. Ahora se recorre la red hacia atrás para ver cuánto se puede atrasar cada evento sin atrasar el final.`,
    nodosIncluidos: orden,
    iteracion: n,
  })

  // 3. Hacia atrás
  ;[...orden].reverse().forEach((u, i) => {
    const salen = grafo.aristas.filter((a) => a.origen === u)
    const valores = salen.map((a) => limpiar(tardio.get(a.destino)! - dur(a)))
    tardio.set(u, salen.length ? Math.min(...valores) : duracion)
    paso({
      titulo: `Hacia atrás: evento ${nombre(u)}`,
      descripcion: salen.length
        ? `Tiempo más tardío del evento ${nombre(u)} = ${salen.length > 1 ? 'el menor de ' : ''}${salen.map((a) => `${fmt(tardio.get(a.destino)!)} − ${fmt(dur(a))} (${flecha(a)})`).join(', ')} = ${fmt(tardio.get(u)!)}. Si ocurre después, se atrasa el proyecto.`
        : `El evento ${nombre(u)} no tiene actividades posteriores: es un final del proyecto y su tiempo más tardío es la duración, ${fmt(duracion)}.`,
      nodosActuales: [u],
      aristasEvaluadas: salen.map((a) => a.id),
      nodosIncluidos: orden.slice(n - 1 - i),
      iteracion: n + i + 1,
    })
  })

  // 4. Holguras y ruta crítica
  const actividades: ActividadProyecto[] = grafo.aristas.map((a) => {
    const es = temprano.get(a.origen)!
    const lf = tardio.get(a.destino)!
    const ls = limpiar(lf - dur(a))
    const holgura = limpiar(ls - es)
    return {
      aristaId: a.id,
      desde: nombre(a.origen),
      hasta: nombre(a.destino),
      ...t.get(a.id)!,
      es,
      ef: limpiar(es + dur(a)),
      ls,
      lf,
      holgura,
      critica: holgura <= EPS,
    }
  })
  const criticas = grafo.aristas.filter((_, i) => actividades[i].critica)
  const idsCriticas = criticas.map((a) => a.id)

  // Si hay más de una ruta crítica se informa la de mayor varianza (en CPM, la primera).
  const mejor = new Map<string, { varianza: number; arco: Arista | null; rutas: number }>()
  for (const u of [...orden].reverse()) {
    let actual = { varianza: 0, arco: null as Arista | null, rutas: 0 }
    for (const a of criticas.filter((c) => c.origen === u)) {
      const sigue = mejor.get(a.destino)!
      const varianza = limpiar((t.get(a.id)!.varianza ?? 0) + sigue.varianza)
      actual = { ...(actual.arco === null || varianza > actual.varianza + EPS ? { varianza, arco: a } : actual), rutas: actual.rutas + sigue.rutas }
    }
    mejor.set(u, actual.arco ? actual : { varianza: 0, arco: null, rutas: 1 })
  }
  const inicios = orden.filter((u) => !grafo.aristas.some((a) => a.destino === u) && mejor.get(u)!.arco)
  const inicio = inicios.reduce((a, b) => (mejor.get(b)!.varianza > mejor.get(a)!.varianza + EPS ? b : a))
  const rutaCritica = [inicio]
  const arcosRuta: string[] = []
  for (let arco = mejor.get(inicio)!.arco; arco; arco = mejor.get(arco.destino)!.arco) {
    arcosRuta.push(arco.id)
    rutaCritica.push(arco.destino)
  }
  const cantidadRutas = inicios.reduce((s, u) => s + mejor.get(u)!.rutas, 0)
  const varianza = metodo === 'pert' ? mejor.get(inicio)!.varianza : undefined
  const desvio = varianza === undefined ? undefined : limpiar(Math.sqrt(varianza))
  const conHolgura = actividades.filter((a) => !a.critica)

  paso({
    titulo: 'Holguras',
    descripcion:
      `La holgura de una actividad es lo que se puede atrasar sin atrasar el proyecto: inicio más tardío − inicio más temprano. ` +
      `Tienen holgura 0 (críticas): ${lista(actividades.filter((a) => a.critica).map((a) => `${a.desde}→${a.hasta}`))}.` +
      (conHolgura.length > 0 ? ` Con holgura: ${lista(conHolgura.map((a) => `${a.desde}→${a.hasta} (${fmt(a.holgura)})`))}.` : ''),
    nodosIncluidos: orden,
    aristasIncluidas: idsCriticas,
    iteracion: 2 * n + 1,
  })

  paso({
    titulo: 'Resultado',
    descripcion:
      `Duración ${metodo === 'pert' ? 'esperada ' : ''}del proyecto: ${fmt(duracion)}. Ruta crítica: ${rutaCritica.map(nombre).join(' → ')}. ` +
      `Cualquier atraso en una actividad de la ruta crítica atrasa todo el proyecto.` +
      (varianza !== undefined ? ` Varianza del proyecto (suma de las varianzas de la ruta crítica): ${fmt(varianza)}; desvío estándar: ${fmt(desvio!)}.` : ''),
    aristasResultado: idsCriticas,
    empate: cantidadRutas > 1 ? `Hay ${cantidadRutas} rutas críticas: todas duran ${fmt(duracion)}.` : undefined,
    iteracion: 2 * n + 1,
  })

  return {
    pasos,
    resultado: {
      tipo: 'proyecto',
      metodo,
      duracion,
      actividades,
      eventos: orden.map((u) => ({ nodo: nombre(u), temprano: temprano.get(u)!, tardio: tardio.get(u)! })),
      rutaCritica: rutaCritica.map(nombre),
      arcosRutaCritica: arcosRuta,
      rutasCriticas: cantidadRutas,
      varianza,
      desvio,
    },
  }
}

/** Probabilidad acumulada de la normal estándar, P(Z ≤ z). Aproximación de Abramowitz y Stegun (error < 1e-7). */
export function probabilidadNormal(z: number): number {
  const x = Math.abs(z) / Math.SQRT2
  const k = 1 / (1 + 0.3275911 * x)
  const erf = 1 - ((((1.061405429 * k - 1.453152027) * k + 1.421413741) * k - 0.284496736) * k + 0.254829592) * k * Math.exp(-x * x)
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2
}

/** PERT: probabilidad de terminar el proyecto en `plazo` o antes, con Z = (plazo − duración esperada) / desvío. */
export function probabilidadDeTerminar(duracion: number, desvio: number, plazo: number): { z: number | null; probabilidad: number } {
  if (desvio <= EPS) return { z: null, probabilidad: plazo >= duracion - EPS ? 1 : 0 }
  const z = (plazo - duracion) / desvio
  return { z, probabilidad: probabilidadNormal(z) }
}
