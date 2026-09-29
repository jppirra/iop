import type { Estrategia } from '../types/graph'

/**
 * Registro de estrategias.
 *
 * Cada archivo de esta carpeta que exporte `estrategia` se registra solo:
 * para sumar Ford-Fulkerson, Bellman-Ford o Floyd-Warshall alcanza con crear
 * `src/algorithms/<nombre>.ts` exportando `estrategia: Estrategia`
 * (y, si devuelve un nuevo `tipo` de resultado, su vista en ResultsPanel).
 */
const modulos = import.meta.glob<{ estrategia?: Estrategia }>(['./*.ts', '!./*.test.ts', '!./index.ts'], {
  eager: true,
})

export const estrategias: Record<string, Estrategia> = Object.fromEntries(
  Object.values(modulos)
    .map((m) => m.estrategia)
    .filter((e): e is Estrategia => !!e)
    .sort((a, b) => a.orden - b.orden)
    .map((e) => [e.id, e]),
)

export const listaEstrategias: Estrategia[] = Object.values(estrategias)
