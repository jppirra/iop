import { completarNodos, leerPeso, type AristaPlana, type ErrorParseo, type NodoPlano, type ResultadoParseo } from './tipos'

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const esNombre = (v: unknown): v is string | number =>
  (typeof v === 'string' && v.trim() !== '') || (typeof v === 'number' && Number.isFinite(v))

/**
 * JSON: { "dirigido": false, "nodos": [...], "aristas": [{ "origen", "destino", "peso" }] }
 * Los nodos pueden ser strings/números o objetos { "nombre", "x", "y" }. "nodos" es opcional.
 */
export function parsearJson(texto: string): ResultadoParseo {
  let datos: unknown
  try {
    datos = JSON.parse(texto)
  } catch (e) {
    return { grafo: null, errores: [{ ubicacion: 'JSON', mensaje: `JSON inválido: ${(e as Error).message}` }] }
  }
  if (!esObjeto(datos))
    return { grafo: null, errores: [{ ubicacion: 'JSON', mensaje: 'Se esperaba un objeto con "aristas".' }] }

  const errores: ErrorParseo[] = []
  let dirigido: boolean | undefined
  if (datos.dirigido !== undefined) {
    if (typeof datos.dirigido === 'boolean') dirigido = datos.dirigido
    else errores.push({ ubicacion: 'dirigido', mensaje: '"dirigido" tiene que ser true o false.' })
  }

  const nodos: NodoPlano[] = []
  if (datos.nodos !== undefined) {
    if (!Array.isArray(datos.nodos)) errores.push({ ubicacion: 'nodos', mensaje: '"nodos" tiene que ser una lista.' })
    else
      datos.nodos.forEach((n, i) => {
        if (esNombre(n)) nodos.push({ nombre: String(n).trim() })
        else if (esObjeto(n) && esNombre(n.nombre ?? n.id)) {
          const nodo: NodoPlano = { nombre: String(n.nombre ?? n.id).trim() }
          if (typeof n.x === 'number' && typeof n.y === 'number') Object.assign(nodo, { x: n.x, y: n.y })
          nodos.push(nodo)
        } else errores.push({ ubicacion: `nodos[${i}]`, mensaje: 'Nodo inválido: usá un nombre o { "nombre": ... }.' })
      })
  }

  const aristas: (AristaPlana & { ubicacion: string })[] = []
  if (!Array.isArray(datos.aristas)) {
    errores.push({ ubicacion: 'aristas', mensaje: 'Falta la lista "aristas".' })
  } else {
    datos.aristas.forEach((a, i) => {
      const ubicacion = `aristas[${i}]`
      if (!esObjeto(a)) {
        errores.push({ ubicacion, mensaje: 'Arista mal formada: se esperaba { "origen", "destino", "peso" }.' })
        return
      }
      if (!esNombre(a.origen) || !esNombre(a.destino)) {
        errores.push({ ubicacion, mensaje: 'Falta "origen" o "destino".' })
        return
      }
      const peso = typeof a.peso === 'number' ? a.peso : typeof a.peso === 'string' ? leerPeso(a.peso, true) : null
      if (peso === null || !Number.isFinite(peso)) {
        errores.push({ ubicacion, mensaje: `Peso no numérico: ${JSON.stringify(a.peso)}.` })
        return
      }
      const origen = String(a.origen).trim()
      const destino = String(a.destino).trim()
      if (origen === destino) {
        errores.push({ ubicacion, mensaje: `La arista une el nodo ${origen} consigo mismo.` })
        return
      }
      aristas.push({ origen, destino, peso, ubicacion })
    })
  }

  const grafo = completarNodos(aristas, nodos, errores)
  return { grafo: errores.length ? null : { ...grafo, dirigido }, errores }
}
