import { completarNodos, leerTiempos, LINEA_DIRIGIDO, type AristaPlana, type ErrorParseo, type ResultadoParseo } from './tipos'

const TOKEN = /"([^"]*)"|'([^']*)'|(\S+)/g

/** Separa una línea en tokens; los nombres con espacios van entre comillas: "Casa 1" "Casa 2" 4 */
export function tokenizar(linea: string): string[] {
  return [...linea.matchAll(TOKEN)].map((m) => m[1] ?? m[2] ?? m[3])
}

const ACTIVIDAD = /^actividad=(.+)$/i

/**
 * Formato texto: una arista por línea `origen destino peso`.
 * Para PERT, cinco valores: `origen destino optimista masProbable pesimista`.
 * Para CPM/PERT con actividades paralelas, un token final opcional `actividad=Nombre`
 * (no un token suelto: con 5 valores de PERT ya sería ambiguo si entra en la cuenta).
 * Antes de las aristas se acepta una línea opcional `dirigido=true`/`dirigido=false`.
 * Líneas vacías o que empiezan con # se ignoran. Una línea con un solo nombre crea un nodo aislado.
 */
export function parsearTexto(texto: string): ResultadoParseo {
  const errores: ErrorParseo[] = []
  const aristas: (AristaPlana & { ubicacion: string })[] = []
  const aislados: { nombre: string }[] = []
  const lineas = texto.split(/\r?\n/)

  let dirigido: boolean | undefined
  let desde = 0
  for (let i = 0; i < lineas.length; i++) {
    const limpia = lineas[i].trim()
    if (limpia === '' || limpia.startsWith('#') || limpia.startsWith('//')) continue
    const m = LINEA_DIRIGIDO.exec(limpia)
    if (m) {
      dirigido = m[1].toLowerCase() === 'true'
      desde = i + 1
    }
    break
  }

  for (let i = desde; i < lineas.length; i++) {
    const ubicacion = `Línea ${i + 1}`
    const limpia = lineas[i].trim()
    if (limpia === '' || limpia.startsWith('#') || limpia.startsWith('//')) continue

    const tokens = tokenizar(limpia)
    if (tokens.length === 1) {
      aislados.push({ nombre: tokens[0] })
      continue
    }
    let valores = tokens.slice(2)
    let actividad: string | undefined
    const mActividad = valores.length > 0 ? ACTIVIDAD.exec(valores.at(-1)!) : null
    if (mActividad) {
      actividad = mActividad[1]
      valores = valores.slice(0, -1)
    }
    if (valores.length !== 1 && valores.length !== 3) {
      errores.push({
        ubicacion,
        mensaje: `Línea mal formada: se esperaban 3 valores (origen destino peso) o 5 (origen destino optimista másProbable pesimista), con "actividad=Nombre" opcional al final, y hay ${tokens.length}.`,
      })
      continue
    }
    const [origen, destino] = tokens
    const tiempos = leerTiempos(valores, true)
    if (typeof tiempos === 'string') {
      errores.push({ ubicacion, mensaje: tiempos })
      continue
    }
    if (origen === destino) {
      errores.push({ ubicacion, mensaje: `La arista une el nodo ${origen} consigo mismo.` })
      continue
    }
    aristas.push({ origen, destino, ...tiempos, actividad, ubicacion })
  }

  const grafo = completarNodos(aristas, aislados, errores, dirigido)
  if (grafo.nodos.length === 0 && errores.length === 0)
    errores.push({ ubicacion: 'General', mensaje: 'No se encontró ninguna arista.' })
  return { grafo: errores.length ? null : { ...grafo, dirigido }, errores }
}
