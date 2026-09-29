import type { Grafo } from '../types/graph'

export function exportarJson(grafo: Grafo): string {
  const nombre = new Map(grafo.nodos.map((n) => [n.id, n.nombre]))
  return JSON.stringify(
    {
      dirigido: grafo.dirigido,
      nodos: grafo.nodos.map((n) => ({ nombre: n.nombre, x: Math.round(n.x), y: Math.round(n.y) })),
      aristas: grafo.aristas.map((a) => ({ origen: nombre.get(a.origen), destino: nombre.get(a.destino), peso: a.peso })),
    },
    null,
    2,
  )
}

const campoCsv = (valor: string) => (/[",;\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor)

/** CSV `origen,destino,peso`. Los nodos aislados no se exportan (el CSV solo describe aristas). */
export function exportarCsv(grafo: Grafo): string {
  const nombre = new Map(grafo.nodos.map((n) => [n.id, n.nombre]))
  const filas = grafo.aristas.map((a) =>
    [campoCsv(nombre.get(a.origen)!), campoCsv(nombre.get(a.destino)!), String(a.peso)].join(','),
  )
  return ['origen,destino,peso', ...filas].join('\n') + '\n'
}
