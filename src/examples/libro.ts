import type { GrafoPlano } from '../parsers'
import type { ClaveParametro } from '../types/graph'

export interface EjemploLibro {
  id: string
  titulo: string
  referencia: string
  descripcion: string
  estrategia: string
  /** Parámetros por nombre de nodo. */
  parametros: Partial<Record<ClaveParametro, string>>
  grafo: GrafoPlano
}

/**
 * Ejemplos del cap. 11 "Modelos de redes" (Render, Métodos cuantitativos para los negocios).
 *
 * Lauderdale: la tabla 11.1 fija las 7 aristas del árbol y el texto fija 1–2 = 3; el resto de
 * las distancias (1–4, 3–5, 4–6, 5–7, 6–7) se reconstruyó de los números de la figura 11.1.
 * Leadville: todas las distancias salen de la figura 11.19 y la solución 11-3.
 * El orden de las aristas define cómo se rompen los empates (igual que en el libro).
 */
export const ejemplosLibro: EjemploLibro[] = [
  {
    id: 'lauderdale',
    titulo: 'Lauderdale Construction',
    referencia: 'Fig. 11.1 · 8 casas',
    descripcion: 'Árbol de expansión mínima para llevar agua y electricidad a 8 casas (cientos de pies). Distancia total: 16.',
    estrategia: 'prim',
    parametros: { inicio: '1' },
    grafo: {
      dirigido: false,
      nodos: [
        { nombre: '1', x: 90, y: 300 },
        { nombre: '2', x: 250, y: 110 },
        { nombre: '3', x: 260, y: 300 },
        { nombre: '4', x: 180, y: 480 },
        { nombre: '5', x: 460, y: 90 },
        { nombre: '6', x: 450, y: 440 },
        { nombre: '7', x: 660, y: 230 },
        { nombre: '8', x: 620, y: 420 },
      ],
      aristas: [
        { origen: '1', destino: '3', peso: 2 },
        { origen: '3', destino: '4', peso: 2 },
        { origen: '2', destino: '3', peso: 3 },
        { origen: '1', destino: '2', peso: 3 },
        { origen: '2', destino: '5', peso: 3 },
        { origen: '3', destino: '6', peso: 3 },
        { origen: '6', destino: '8', peso: 1 },
        { origen: '7', destino: '8', peso: 2 },
        { origen: '1', destino: '4', peso: 5 },
        { origen: '3', destino: '5', peso: 5 },
        { origen: '4', destino: '6', peso: 6 },
        { origen: '5', destino: '7', peso: 7 },
        { origen: '6', destino: '7', peso: 4 },
      ],
    },
  },
  {
    id: 'leadville',
    titulo: 'Leadville → Dillon',
    referencia: 'Fig. 11.19 · 7 nodos',
    descripcion: 'Problema resuelto 11-3: ruta más corta de Leadville (1) a Dillon (7). Resultado: 1-2-3-6-7, distancia 32.',
    estrategia: 'dijkstra',
    parametros: { origen: '1', destino: '7' },
    grafo: {
      dirigido: false,
      nodos: [
        { nombre: '1', x: 90, y: 300 },
        { nombre: '2', x: 260, y: 130 },
        { nombre: '3', x: 320, y: 300 },
        { nombre: '4', x: 260, y: 470 },
        { nombre: '5', x: 500, y: 130 },
        { nombre: '6', x: 500, y: 470 },
        { nombre: '7', x: 680, y: 300 },
      ],
      aristas: [
        { origen: '1', destino: '2', peso: 8 },
        { origen: '1', destino: '3', peso: 16 },
        { origen: '1', destino: '4', peso: 18 },
        { origen: '2', destino: '3', peso: 6 },
        { origen: '2', destino: '5', peso: 14 },
        { origen: '3', destino: '4', peso: 8 },
        { origen: '3', destino: '5', peso: 10 },
        { origen: '3', destino: '6', peso: 12 },
        { origen: '4', destino: '6', peso: 16 },
        { origen: '5', destino: '7', peso: 12 },
        { origen: '6', destino: '7', peso: 6 },
      ],
    },
  },
  {
    id: 'ray-design',
    titulo: 'Ray Design, Inc.',
    referencia: 'Fig. 11.10 · 6 nodos',
    descripcion: 'Ruta más corta de la fábrica (1) al almacén (6), en millas. Resultado: 1-2-3-5-6, distancia 290.',
    estrategia: 'dijkstra',
    parametros: { origen: '1', destino: '6' },
    grafo: {
      dirigido: false,
      nodos: [
        { nombre: '1', x: 90, y: 300 },
        { nombre: '2', x: 280, y: 140 },
        { nombre: '3', x: 280, y: 460 },
        { nombre: '4', x: 500, y: 140 },
        { nombre: '5', x: 500, y: 460 },
        { nombre: '6', x: 690, y: 300 },
      ],
      aristas: [
        { origen: '1', destino: '2', peso: 100 },
        { origen: '1', destino: '3', peso: 200 },
        { origen: '2', destino: '3', peso: 50 },
        { origen: '2', destino: '4', peso: 200 },
        { origen: '2', destino: '5', peso: 100 },
        { origen: '3', destino: '5', peso: 40 },
        { origen: '4', destino: '5', peso: 150 },
        { origen: '4', destino: '6', peso: 100 },
        { origen: '5', destino: '6', peso: 100 },
      ],
    },
  },
  {
    id: 'red-transmision',
    titulo: 'Red de transmisión',
    referencia: 'Apunte Ford-Fulkerson · 4 nodos',
    descripcion: 'Flujo máximo de S a T en una red dirigida (Mbps). Resultado: 8 + 10 = 18, igual al corte mínimo.',
    estrategia: 'ford-fulkerson',
    parametros: { origen: 'S', destino: 'T' },
    grafo: {
      dirigido: true,
      nodos: [
        { nombre: 'S', x: 90, y: 300 },
        { nombre: 'A', x: 380, y: 140 },
        { nombre: 'B', x: 380, y: 460 },
        { nombre: 'T', x: 670, y: 300 },
      ],
      aristas: [
        { origen: 'S', destino: 'A', peso: 10 },
        { origen: 'A', destino: 'T', peso: 8 },
        { origen: 'A', destino: 'B', peso: 2 },
        { origen: 'S', destino: 'B', peso: 10 },
        { origen: 'B', destino: 'T', peso: 10 },
      ],
    },
  },
]
