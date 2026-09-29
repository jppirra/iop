import { useCallback, useEffect, useState } from 'react'
import { listaEstrategias } from '../algorithms'
import { CLAVE_ALMACENAMIENTO, guardarConfig, leerConfig, type Configuracion } from './configuracion'

/** Configuración persistida; se sincroniza entre pestañas (editar /config actualiza la app abierta). */
export function useConfiguracion() {
  const [config, setConfig] = useState<Configuracion>(() => leerConfig(listaEstrategias))

  useEffect(() => {
    const alCambiar = (e: StorageEvent) => {
      if (e.key === CLAVE_ALMACENAMIENTO || e.key === null) setConfig(leerConfig(listaEstrategias))
    }
    window.addEventListener('storage', alCambiar)
    return () => window.removeEventListener('storage', alCambiar)
  }, [])

  const actualizar = useCallback((cambio: (c: Configuracion) => Configuracion) => {
    setConfig((actual) => {
      const nueva = cambio(actual)
      guardarConfig(nueva)
      return nueva
    })
  }, [])

  return { config, actualizar }
}
