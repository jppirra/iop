import type { Grafo } from '../types/graph'

export function exportarJson(grafo: Grafo): string {
  const nombre = new Map(grafo.nodos.map((n) => [n.id, n.nombre]))
  return JSON.stringify(
    {
      dirigido: grafo.dirigido,
      nodos: grafo.nodos.map((n) => ({ nombre: n.nombre, x: Math.round(n.x), y: Math.round(n.y) })),
      // optimista y pesimista solo se escriben si la arista los tiene (JSON.stringify omite los undefined)
      aristas: grafo.aristas.map((a) => ({
        origen: nombre.get(a.origen),
        destino: nombre.get(a.destino),
        peso: a.peso,
        optimista: a.optimista,
        pesimista: a.pesimista,
      })),
    },
    null,
    2,
  )
}

const campoCsv = (valor: string) => (/[",;\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor)

/**
 * CSV `origen,destino,peso`. Los nodos aislados no se exportan (el CSV solo describe aristas).
 * Si alguna arista tiene tiempos de PERT se agregan las columnas `optimista` y `pesimista`.
 */
export function exportarCsv(grafo: Grafo): string {
  const nombre = new Map(grafo.nodos.map((n) => [n.id, n.nombre]))
  const conTiempos = grafo.aristas.some((a) => a.optimista !== undefined)
  const filas = grafo.aristas.map((a) =>
    [
      campoCsv(nombre.get(a.origen)!),
      campoCsv(nombre.get(a.destino)!),
      String(a.peso),
      ...(conTiempos ? [String(a.optimista ?? ''), String(a.pesimista ?? '')] : []),
    ].join(','),
  )
  return [`origen,destino,peso${conTiempos ? ',optimista,pesimista' : ''}`, ...filas].join('\n') + '\n'
}
