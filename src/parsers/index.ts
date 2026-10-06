import { parsearCsv } from './csv'
import { parsearJson } from './json'
import { parsearTexto } from './texto'
import type { Formato, ResultadoParseo } from './tipos'

export type { ErrorParseo, Formato, GrafoPlano, NodoPlano, AristaPlana, ResultadoParseo } from './tipos'
export { parsearCsv, parsearJson, parsearTexto }
export { exportarCsv, exportarJson } from './exportar'
export { leerPeso, leerTiempos, type Tiempos } from './tipos'

export function detectarFormato(texto: string, nombreArchivo?: string): Formato {
  const extension = nombreArchivo?.split('.').pop()?.toLowerCase()
  if (extension === 'json') return 'json'
  if (extension === 'csv') return 'csv'
  if (extension === 'txt') return 'texto'
  const inicio = texto.replace(/^﻿/, '').trimStart()
  if (inicio.startsWith('{')) return 'json'
  const primeraLinea = inicio.split(/\r?\n/)[0] ?? ''
  if (/^"?origen"?\s*[,;]/i.test(primeraLinea)) return 'csv'
  return 'texto'
}

export function parsear(texto: string, formato: Formato | 'auto' = 'auto', nombreArchivo?: string): ResultadoParseo {
  const f = formato === 'auto' ? detectarFormato(texto, nombreArchivo) : formato
  if (f === 'json') return parsearJson(texto)
  if (f === 'csv') return parsearCsv(texto)
  return parsearTexto(texto)
}
