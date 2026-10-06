import type { Ejecucion, Estrategia, Grafo, ResultadoProyecto } from '../types/graph'
import { calcularProyecto, tiemposCpm, validarProyecto } from './proyecto'

/**
 * CPM (método de la ruta crítica).
 * Cada arco es una actividad de duración fija (su peso). Calcula los tiempos más tempranos y
 * más tardíos, la holgura de cada actividad y la ruta crítica. El cálculo está en proyecto.ts.
 */
export function cpm(grafo: Grafo): Ejecucion<ResultadoProyecto> {
  return calcularProyecto({ ...grafo, dirigido: true }, 'cpm', tiemposCpm)
}

export const estrategia: Estrategia = {
  id: 'cpm',
  nombre: 'Proyectos - CPM',
  grupo: 'Administración de proyectos',
  descripcion: 'Ruta crítica de un proyecto: cada arco es una actividad y su peso es la duración. Da la duración total y las holguras.',
  orden: 50,
  parametros: [],
  forzarDirigido: true,
  leyenda: {
    evaluada: 'Actividades que definen el evento',
    incluida: 'Evento ya calculado',
    resultado: 'Ruta crítica',
  },
  validar: (grafo) => validarProyecto({ ...grafo, dirigido: true }, 'cpm'),
  ejecutar: (grafo) => cpm(grafo),
}
