import { useCallback, useEffect, useState } from 'react'
import { listaEstrategias } from '../algorithms'
import {
  CLAVE_ALMACENAMIENTO,
  configDelProyecto,
  guardarConfig,
  leerConfig,
  tieneConfigLocal,
  type Configuracion,
} from './configuracion'

/**
 * Configuración vigente: la local de este navegador si existe, si no la del proyecto (config.json).
 * Se sincroniza entre pestañas (editar /config actualiza la app abierta).
 */
export function useConfiguracion() {
  const [config, setConfig] = useState<Configuracion>(() => leerConfig(listaEstrategias))
  const [esLocal, setEsLocal] = useState(tieneConfigLocal)

  useEffect(() => {
    const alCambiar = (e: StorageEvent) => {
      if (e.key !== CLAVE_ALMACENAMIENTO && e.key !== null) return
      setConfig(leerConfig(listaEstrategias))
      setEsLocal(tieneConfigLocal())
    }
    window.addEventListener('storage', alCambiar)
    return () => window.removeEventListener('storage', alCambiar)
  }, [])

  const actualizar = useCallback((cambio: (c: Configuracion) => Configuracion) => {
    setConfig((actual) => {
      const nueva = cambio(actual)
      guardarConfig(nueva, listaEstrategias)
      setEsLocal(tieneConfigLocal())
      return nueva
    })
  }, [])

  /** Descarta los cambios locales y vuelve a la configuración del proyecto. */
  const usarDelProyecto = useCallback(() => actualizar(() => configDelProyecto(listaEstrategias)), [actualizar])

  return { config, esLocal, actualizar, usarDelProyecto }
}
