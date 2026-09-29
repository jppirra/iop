import { useCallback, useReducer } from 'react'

const LIMITE = 100

interface Estado<T> {
  pasado: T[]
  actual: T
}

type Accion<T> = { tipo: 'aplicar'; cambio: (actual: T) => T } | { tipo: 'deshacer' }

function reducir<T>(estado: Estado<T>, accion: Accion<T>): Estado<T> {
  if (accion.tipo === 'deshacer') {
    if (estado.pasado.length === 0) return estado
    return { pasado: estado.pasado.slice(0, -1), actual: estado.pasado[estado.pasado.length - 1] }
  }
  const siguiente = accion.cambio(estado.actual)
  if (siguiente === estado.actual) return estado
  return { pasado: [...estado.pasado, estado.actual].slice(-LIMITE), actual: siguiente }
}

/** Estado con historial para Deshacer. `aplicar` recibe una función del estado actual al siguiente. */
export function useHistorial<T>(inicial: T) {
  const [estado, despachar] = useReducer(reducir<T>, { pasado: [], actual: inicial })
  const aplicar = useCallback((cambio: (actual: T) => T) => despachar({ tipo: 'aplicar', cambio }), [])
  const deshacer = useCallback(() => despachar({ tipo: 'deshacer' }), [])
  return { actual: estado.actual, aplicar, deshacer, puedeDeshacer: estado.pasado.length > 0 }
}
