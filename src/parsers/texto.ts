import { completarNodos, leerTiempos, type AristaPlana, type ErrorParseo, type ResultadoParseo } from './tipos'

const TOKEN = /"([^"]*)"|'([^']*)'|(\S+)/g

/** Separa una línea en tokens; los nombres con espacios van entre comillas: "Casa 1" "Casa 2" 4 */
export function tokenizar(linea: string): string[] {
  return [...linea.matchAll(TOKEN)].map((m) => m[1] ?? m[2] ?? m[3])
}

/**
 * Formato texto: una arista por línea `origen destino peso`.
 * Para PERT, cinco valores: `origen destino optimista masProbable pesimista`.
 * Líneas vacías o que empiezan con # se ignoran. Una línea con un solo nombre crea un nodo aislado.
 */
export function parsearTexto(texto: string): ResultadoParseo {
  const errores: ErrorParseo[] = []
  const aristas: (AristaPlana & { ubicacion: string })[] = []
  const aislados: { nombre: string }[] = []

  texto.split(/\r?\n/).forEach((linea, i) => {
    const ubicacion = `Línea ${i + 1}`
    const limpia = linea.trim()
    if (limpia === '' || limpia.startsWith('#') || limpia.startsWith('//')) return

    const tokens = tokenizar(limpia)
    if (tokens.length === 1) {
      aislados.push({ nombre: tokens[0] })
      return
    }
    if (tokens.length !== 3 && tokens.length !== 5) {
      errores.push({
        ubicacion,
        mensaje: `Línea mal formada: se esperaban 3 valores (origen destino peso) o 5 (origen destino optimista másProbable pesimista) y hay ${tokens.length}.`,
      })
      return
    }
    const [origen, destino, ...valores] = tokens
    const tiempos = leerTiempos(valores, true)
    if (typeof tiempos === 'string') {
      errores.push({ ubicacion, mensaje: tiempos })
      return
    }
    if (origen === destino) {
      errores.push({ ubicacion, mensaje: `La arista une el nodo ${origen} consigo mismo.` })
      return
    }
    aristas.push({ origen, destino, ...tiempos, ubicacion })
  })

  const grafo = completarNodos(aristas, aislados, errores)
  if (grafo.nodos.length === 0 && errores.length === 0)
    errores.push({ ubicacion: 'General', mensaje: 'No se encontró ninguna arista.' })
  return { grafo: errores.length ? null : grafo, errores }
}
