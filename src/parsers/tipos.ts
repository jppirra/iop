/** Grafo "plano": nodos referenciados por nombre, tal como se escriben en un archivo. */
export interface NodoPlano {
  nombre: string
  x?: number
  y?: number
}

export interface AristaPlana {
  origen: string
  destino: string
  peso: number
  /** PERT: tiempos optimista y pesimista (el peso es el más probable). */
  optimista?: number
  pesimista?: number
  /** CPM/PERT: nombre de la actividad, para distinguir actividades paralelas (mismo origen y destino). */
  actividad?: string
  /** CPM/PERT: actividad ficticia (duración 0, generada al resolver actividades paralelas). */
  ficticia?: boolean
}

export interface GrafoPlano {
  dirigido?: boolean
  nodos: NodoPlano[]
  aristas: AristaPlana[]
}

export interface ErrorParseo {
  /** "Línea 3", "aristas[2]", etc. */
  ubicacion: string
  mensaje: string
}

export interface ResultadoParseo {
  grafo: GrafoPlano | null
  errores: ErrorParseo[]
}

export type Formato = 'texto' | 'csv' | 'json'

/** Convierte un peso escrito por el usuario a número. Acepta coma decimal si se pide. */
export function leerPeso(valor: string, comaDecimal: boolean): number | null {
  const limpio = valor.trim()
  if (limpio === '') return null
  const normalizado = comaDecimal ? limpio.replace(',', '.') : limpio
  if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(normalizado)) return null
  return Number(normalizado)
}

export interface Tiempos {
  peso: number
  optimista?: number
  pesimista?: number
}

/**
 * Lee el peso de una arista. Acepta un solo número, o los tres tiempos de PERT
 * "optimista más probable pesimista" (el peso es el más probable). Devuelve un mensaje si no es válido.
 */
export function leerTiempos(valores: string[], comaDecimal: boolean): Tiempos | string {
  const numeros = valores.map((v) => leerPeso(v, comaDecimal))
  const malo = numeros.indexOf(null)
  if (malo !== -1) return `Peso no numérico: "${valores[malo]}".`
  if (numeros.length === 1) return { peso: numeros[0]! }
  const [optimista, peso, pesimista] = numeros as number[]
  if (optimista > peso || peso > pesimista)
    return `Los tiempos tienen que cumplir optimista ≤ más probable ≤ pesimista (hay ${valores.join(', ')}).`
  return { peso, optimista, pesimista }
}

/** Reconoce la línea opcional `dirigido=true`/`dirigido=false` (CSV y texto), sin distinguir mayúsculas. */
export const LINEA_DIRIGIDO = /^dirigido\s*=\s*(true|false)\s*$/i

/**
 * Arma la lista de nodos (en orden de aparición) y valida duplicados.
 *
 * Dos aristas con el mismo origen y destino son "actividad repetida" salvo que cada una
 * tenga su propia `actividad` (actividades paralelas de CPM/PERT: se resuelven más adelante,
 * en `desdePlano`, con un evento intermedio y una actividad ficticia). Si `dirigido` es `false`,
 * además se detectan A→B y B→A como la misma conexión (no tiene sentido declararlas dos veces
 * en una red no dirigida).
 */
export function completarNodos(
  aristas: (AristaPlana & { ubicacion: string })[],
  nodosDeclarados: NodoPlano[],
  errores: ErrorParseo[],
  dirigido?: boolean,
): GrafoPlano {
  const nodos = new Map<string, NodoPlano>()
  for (const n of nodosDeclarados) if (!nodos.has(n.nombre)) nodos.set(n.nombre, n)
  const porClave = new Map<string, (AristaPlana & { ubicacion: string })[]>()
  const resultado: AristaPlana[] = []

  for (const entrada of aristas) {
    const { ubicacion, ...a } = entrada
    const clave = dirigido === false ? [a.origen, a.destino].sort().join('\u0000') : `${a.origen}\u0000${a.destino}`
    const previas = porClave.get(clave)

    if (previas) {
      const mismoSentido = previas[0].origen === a.origen && previas[0].destino === a.destino
      const colisionActividad = previas.find((p) => (p.actividad ?? null) === (a.actividad ?? null))
      if (!mismoSentido || colisionActividad) {
        const anterior = colisionActividad ?? previas[0]
        errores.push({
          ubicacion,
          mensaje: !mismoSentido
            ? `En una red no dirigida ${a.origen}–${a.destino} y ${anterior.origen}–${anterior.destino} son la misma arista; si tienen capacidades distintas por sentido, cargá la red como dirigida (dirigido=true).`
            : anterior.actividad
              ? `Ya existe una actividad "${anterior.actividad}" entre ${a.origen} y ${a.destino}: para cargar actividades paralelas, dale a cada una un nombre distinto con "actividad=Nombre".`
              : `Arista repetida: ${a.origen} → ${a.destino}. Si son actividades paralelas de un proyecto, dale a cada una un nombre distinto con "actividad=Nombre".`,
        })
        continue
      }
      previas.push(entrada)
    } else {
      porClave.set(clave, [entrada])
    }
    for (const nombre of [a.origen, a.destino]) if (!nodos.has(nombre)) nodos.set(nombre, { nombre })
    resultado.push(a)
  }
  return { nodos: [...nodos.values()], aristas: resultado }
}

/**
 * Errores de A→B / B→A duplicadas cuando la dirección final (no declarada en el archivo)
 * se resuelve recién al cargar, fuera del parser — por ejemplo porque depende del toggle
 * de la pantalla. Usa la posición en `aristas` como ubicación, porque ya no hay número de línea.
 */
export function erroresDireccion(plano: GrafoPlano, dirigido: boolean): ErrorParseo[] {
  if (dirigido) return []
  const vistas = new Map<string, number>()
  const errores: ErrorParseo[] = []
  plano.aristas.forEach((a, i) => {
    const clave = [a.origen, a.destino].sort().join('\u0000')
    const previa = vistas.get(clave)
    if (previa === undefined) {
      vistas.set(clave, i)
      return
    }
    const b = plano.aristas[previa]
    if (a.origen === b.origen && a.destino === b.destino) return // misma actividad repetida: ya la informó el parser
    errores.push({
      ubicacion: `aristas[${i}]`,
      mensaje: `En una red no dirigida ${a.origen}–${a.destino} y ${b.origen}–${b.destino} son la misma arista; si tienen capacidades distintas por sentido, cargá la red como dirigida (dirigido=true).`,
    })
  })
  return errores
}
