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

/** Arma la lista de nodos (en orden de aparición) y valida duplicados. */
export function completarNodos(
  aristas: (AristaPlana & { ubicacion: string })[],
  nodosDeclarados: NodoPlano[],
  errores: ErrorParseo[],
): GrafoPlano {
  const nodos = new Map<string, NodoPlano>()
  for (const n of nodosDeclarados) if (!nodos.has(n.nombre)) nodos.set(n.nombre, n)
  const vistas = new Set<string>()
  const resultado: AristaPlana[] = []
  for (const { ubicacion, ...a } of aristas) {
    const clave = `${a.origen}\u0000${a.destino}`
    if (vistas.has(clave)) {
      errores.push({ ubicacion, mensaje: `Arista repetida: ${a.origen} → ${a.destino}.` })
      continue
    }
    vistas.add(clave)
    for (const nombre of [a.origen, a.destino]) if (!nodos.has(nombre)) nodos.set(nombre, { nombre })
    resultado.push(a)
  }
  return { nodos: [...nodos.values()], aristas: resultado }
}
