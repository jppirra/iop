import { completarNodos, leerTiempos, type AristaPlana, type ErrorParseo, type ResultadoParseo } from './tipos'

/** Separa una fila CSV respetando comillas dobles ("a, b" y "" como comilla escapada). */
export function separarFilaCsv(fila: string, separador: string): string[] {
  const campos: string[] = []
  let actual = ''
  let entreComillas = false
  for (let i = 0; i < fila.length; i++) {
    const c = fila[i]
    if (entreComillas) {
      if (c === '"' && fila[i + 1] === '"') {
        actual += '"'
        i++
      } else if (c === '"') entreComillas = false
      else actual += c
    } else if (c === '"') entreComillas = true
    else if (c === separador) {
      campos.push(actual)
      actual = ''
    } else actual += c
  }
  campos.push(actual)
  return campos.map((c) => c.trim())
}

/**
 * CSV con encabezado `origen,destino,peso` (en cualquier orden, sin distinguir mayúsculas).
 * Para PERT se suman las columnas `optimista` y `pesimista` (el peso es el tiempo más probable).
 * También acepta `;` como separador (Excel en español); en ese caso el peso puede usar coma decimal.
 */
export function parsearCsv(texto: string): ResultadoParseo {
  const errores: ErrorParseo[] = []
  const lineas = texto.split(/\r?\n/)
  const iEncabezado = lineas.findIndex((l) => l.trim() !== '')
  if (iEncabezado === -1) return { grafo: null, errores: [{ ubicacion: 'General', mensaje: 'El CSV está vacío.' }] }

  const encabezadoCrudo = lineas[iEncabezado].replace(/^﻿/, '')
  const separador = encabezadoCrudo.includes(';') && !encabezadoCrudo.includes(',') ? ';' : ','
  const encabezado = separarFilaCsv(encabezadoCrudo, separador).map((c) => c.toLowerCase())
  const columnas = { origen: encabezado.indexOf('origen'), destino: encabezado.indexOf('destino'), peso: encabezado.indexOf('peso') }
  const iOptimista = encabezado.indexOf('optimista')
  const iPesimista = encabezado.indexOf('pesimista')
  const faltantes = Object.entries(columnas).filter(([, i]) => i === -1).map(([k]) => k)
  if (faltantes.length > 0) {
    return {
      grafo: null,
      errores: [
        {
          ubicacion: `Línea ${iEncabezado + 1}`,
          mensaje: `Encabezado inválido: se esperaba "origen${separador}destino${separador}peso" (falta: ${faltantes.join(', ')}).`,
        },
      ],
    }
  }

  const aristas: (AristaPlana & { ubicacion: string })[] = []
  for (let i = iEncabezado + 1; i < lineas.length; i++) {
    const ubicacion = `Línea ${i + 1}`
    if (lineas[i].trim() === '') continue
    const campos = separarFilaCsv(lineas[i], separador)
    if (campos.length < encabezado.length) {
      errores.push({ ubicacion, mensaje: `Línea mal formada: se esperaban ${encabezado.length} columnas y hay ${campos.length}.` })
      continue
    }
    const origen = campos[columnas.origen]
    const destino = campos[columnas.destino]
    const pesoTexto = campos[columnas.peso]
    if (!origen || !destino) {
      errores.push({ ubicacion, mensaje: 'Falta el nombre del nodo origen o destino.' })
      continue
    }
    // Con las dos columnas de PERT completas se leen los tres tiempos; si no, solo el peso.
    const conTiempos = iOptimista !== -1 && iPesimista !== -1 && campos[iOptimista] !== '' && campos[iPesimista] !== ''
    const tiempos = leerTiempos(conTiempos ? [campos[iOptimista], pesoTexto, campos[iPesimista]] : [pesoTexto], separador === ';')
    if (typeof tiempos === 'string') {
      errores.push({ ubicacion, mensaje: tiempos })
      continue
    }
    if (origen === destino) {
      errores.push({ ubicacion, mensaje: `La arista une el nodo ${origen} consigo mismo.` })
      continue
    }
    aristas.push({ origen, destino, ...tiempos, ubicacion })
  }

  const grafo = completarNodos(aristas, [], errores)
  if (grafo.aristas.length === 0 && errores.length === 0)
    errores.push({ ubicacion: 'General', mensaje: 'El CSV no tiene filas de aristas.' })
  return { grafo: errores.length ? null : grafo, errores }
}
