import type { Ejecucion, Estrategia, Grafo, ResultadoProyecto } from '../types/graph'
import { calcularProyecto, tiemposPert, validarProyecto } from './proyecto'

/**
 * PERT.
 * Igual que CPM, pero cada actividad tiene tres tiempos (optimista, más probable y pesimista).
 * La duración es el tiempo esperado te = (a + 4m + b) / 6 y además se obtiene la varianza del
 * proyecto, con la que se calcula la probabilidad de terminar en un plazo. El cálculo está en proyecto.ts.
 */
export function pert(grafo: Grafo): Ejecucion<ResultadoProyecto> {
  return calcularProyecto({ ...grafo, dirigido: true }, 'pert', tiemposPert)
}

export const estrategia: Estrategia = {
  id: 'pert',
  nombre: 'Proyectos - PERT',
  grupo: 'Administración de proyectos',
  descripcion:
    'Ruta crítica con tiempos inciertos: cada actividad tiene tiempo optimista, más probable y pesimista. Da la duración esperada y la probabilidad de cumplir un plazo.',
  orden: 60,
  parametros: [],
  forzarDirigido: true,
  leyenda: {
    evaluada: 'Actividades que definen el evento',
    incluida: 'Evento ya calculado',
    resultado: 'Ruta crítica',
  },
  validar: (grafo) => validarProyecto({ ...grafo, dirigido: true }, 'pert'),
  ejecutar: (grafo) => pert(grafo),
}
