import { marked } from 'marked'
import { useMemo } from 'react'
import textoInforme from '../../INFORME.md?raw'
import { NOMBRE_APP, VERSION } from '../examples/integrantes'

/** Los comentarios HTML del markdown son notas para quienes editan: no se muestran. */
const sinComentarios = (texto: string) => texto.replace(/<!--[\s\S]*?-->/g, '')

/** Estilos del documento Word, con la misma paleta que la pantalla (teal y grises). */
const ESTILOS_WORD = `
  @page { size: A4; margin: 2cm; }
  body { font-family: Calibri, Arial, sans-serif; font-size: 10.5pt; color: #334155; line-height: 1.35; }
  h1 { font-size: 20pt; color: #115e59; border-bottom: 3pt solid #0f766e; padding-bottom: 4pt; }
  h2 { font-size: 14pt; color: #115e59; border-bottom: 1pt solid #e2e8f0; margin-top: 16pt; }
  h3 { font-size: 12pt; color: #1e293b; }
  strong { color: #0f172a; }
  a { color: #0f766e; }
  code { font-family: Consolas, monospace; font-size: 9.5pt; background: #f1f5f9; }
  table { border-collapse: collapse; width: 100%; margin-top: 6pt; }
  th { background: #f0fdfa; color: #134e4a; border-bottom: 1.5pt solid #0f766e; padding: 4pt 6pt; text-align: left; font-size: 9.5pt; }
  td { border-bottom: 0.75pt solid #e2e8f0; padding: 4pt 6pt; vertical-align: top; font-size: 9.5pt; }
`

/**
 * Arma un .doc que Word abre y permite editar: es el mismo HTML del informe con los estilos embebidos.
 * Así el archivo siempre tiene todo el contenido de INFORME.md, sin mantener una segunda copia.
 */
function descargarWord(html: string) {
  const documento =
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">` +
    `<head><meta charset="utf-8"><title>Informe - ${NOMBRE_APP}</title>` +
    `<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->` +
    `<style>${ESTILOS_WORD}</style></head><body>${html}</body></html>`
  // El BOM hace que Word lea los acentos como UTF-8.
  const url = URL.createObjectURL(new Blob(['﻿', documento], { type: 'application/msword' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'Informe - Grupo 3 IOP.doc'
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Pantalla /informe: muestra INFORME.md (raíz del repo) con el estilo de la app.
 * No hay enlaces a ella desde la app. Para cambiar el contenido se edita el .md.
 */
export function InformePage() {
  const html = useMemo(() => marked.parse(sinComentarios(textoInforme), { async: false }), [])

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <img src="/logo-utn.png" alt="UTN" className="h-10 w-auto" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Informe</p>
              <h1 className="text-lg font-bold text-teal-800">{NOMBRE_APP}</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => descargarWord(html)}>
              Descargar Word
            </button>
            <button className="btn" onClick={() => window.print()}>
              Imprimir / PDF
            </button>
            <a href="/" className="btn btn-primario">
              Ir a la app
            </a>
          </div>
        </header>

        <article className="informe rounded-xl bg-white p-6 shadow-sm sm:p-10 print:rounded-none print:p-0 print:shadow-none" dangerouslySetInnerHTML={{ __html: html }} />

        <footer className="flex flex-wrap justify-between gap-2 text-xs text-slate-500 print:hidden">
          <span>
            El contenido sale de <code className="rounded bg-slate-200 px-1">INFORME.md</code>, en la raíz del repositorio.
          </span>
          <span className="font-mono">{VERSION}</span>
        </footer>
      </div>
    </div>
  )
}
