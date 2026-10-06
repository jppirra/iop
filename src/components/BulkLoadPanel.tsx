import { useMemo, useRef, useState } from 'react'
import { EJEMPLO_JSON } from '../examples/libro'
import { detectarFormato, exportarCsv, exportarJson, parsear, type Formato, type GrafoPlano } from '../parsers'
import type { Grafo } from '../types/graph'

interface Props {
  grafo: Grafo
  mostrarExportar: boolean
  /** Enlace para descargar un JSON de ejemplo. */
  mostrarEjemplo: boolean
  onCargar: (plano: GrafoPlano, modo: 'reemplazar' | 'agregar') => void
}

const EJEMPLOS: Record<Formato, string> = {
  texto: '# origen destino peso\n1 2 3\n1 3 2\n2 3 3\n"Casa 1" 3 4',
  csv: 'origen,destino,peso\n1,2,3\n1,3,2\n2,3,3',
  json: '{\n  "dirigido": false,\n  "nodos": ["1", "2", "3"],\n  "aristas": [\n    { "origen": "1", "destino": "2", "peso": 3 },\n    { "origen": "1", "destino": "3", "peso": 2 }\n  ]\n}',
}

const NOMBRES: Record<Formato, string> = { texto: 'Texto', csv: 'CSV', json: 'JSON' }

function descargar(nombre: string, contenido: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

export function BulkLoadPanel({ grafo, mostrarExportar, mostrarEjemplo, onCargar }: Props) {
  const [texto, setTexto] = useState('')
  const [formato, setFormato] = useState<Formato | 'auto'>('auto')
  const [archivo, setArchivo] = useState<string | undefined>()
  const [mensaje, setMensaje] = useState<string | null>(null)
  const entradaArchivo = useRef<HTMLInputElement>(null)

  const formatoReal = formato === 'auto' ? detectarFormato(texto, archivo) : formato
  const resultado = useMemo(() => (texto.trim() ? parsear(texto, formatoReal) : null), [texto, formatoReal])
  const valido = !!resultado?.grafo

  const leerArchivo = async (f: File) => {
    const contenido = await f.text()
    setArchivo(f.name)
    setFormato('auto')
    setTexto(contenido)
    setMensaje(null)
  }

  const cargar = (modo: 'reemplazar' | 'agregar') => {
    if (!resultado?.grafo) return
    onCargar(resultado.grafo, modo)
    setMensaje(
      `${modo === 'reemplazar' ? 'Se cargaron' : 'Se agregaron'} ${resultado.grafo.nodos.length} nodos y ${resultado.grafo.aristas.length} aristas.`,
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end gap-2">
        <label className="block flex-1 text-sm font-medium text-slate-700">
          Formato
          <select value={formato} onChange={(e) => setFormato(e.target.value as Formato | 'auto')} className="campo mt-1">
            <option value="auto">Automático ({NOMBRES[formatoReal]})</option>
            <option value="texto">Texto: origen destino peso</option>
            <option value="csv">CSV: origen,destino,peso</option>
            <option value="json">JSON</option>
          </select>
        </label>
        <button className="btn" onClick={() => entradaArchivo.current?.click()}>
          Subir archivo
        </button>
        <input
          ref={entradaArchivo}
          type="file"
          accept=".txt,.csv,.json,text/plain,text/csv,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void leerArchivo(f)
            e.target.value = ''
          }}
        />
      </div>

      <textarea
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setArchivo(undefined)
          setMensaje(null)
        }}
        placeholder={EJEMPLOS[formatoReal]}
        spellCheck={false}
        rows={9}
        className="campo font-mono text-xs leading-relaxed"
        aria-label="Datos del grafo"
      />
      {archivo && <p className="text-xs text-slate-500">Archivo: {archivo}</p>}
      {mostrarEjemplo && (
        <p className="text-xs text-slate-500">
          ¿No tenés un archivo?{' '}
          <button
            className="font-medium text-teal-700 underline decoration-teal-700/40 hover:text-teal-800"
            onClick={() => descargar('grafo-ejemplo.json', EJEMPLO_JSON, 'application/json')}
          >
            Descargar JSON de ejemplo
          </button>{' '}
          para ver el formato, editarlo y subirlo.
        </p>
      )}

      {resultado && resultado.errores.length > 0 && (
        <div className="max-h-40 overflow-auto rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          <p className="mb-1 font-semibold">
            {resultado.errores.length} {resultado.errores.length === 1 ? 'error' : 'errores'}:
          </p>
          <ul className="space-y-0.5">
            {resultado.errores.map((e, i) => (
              <li key={i}>
                <span className="font-medium">{e.ubicacion}:</span> {e.mensaje}
              </li>
            ))}
          </ul>
        </div>
      )}
      {valido && (
        <p className="text-xs text-green-700">
          ✓ {resultado.grafo!.nodos.length} nodos y {resultado.grafo!.aristas.length} aristas listos para cargar.
        </p>
      )}
      {mensaje && <p className="text-xs text-teal-700">{mensaje}</p>}

      <div className="grid grid-cols-2 gap-2">
        <button className="btn btn-primario" disabled={!valido} onClick={() => cargar('reemplazar')}>
          Reemplazar grafo
        </button>
        <button className="btn" disabled={!valido} onClick={() => cargar('agregar')}>
          Agregar al grafo
        </button>
      </div>

      {mostrarExportar && (
      <div className="border-t border-slate-200 pt-3">
        <p className="mb-2 text-sm font-medium text-slate-700">Exportar grafo actual</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="btn"
            disabled={grafo.nodos.length === 0}
            onClick={() => descargar('grafo.json', exportarJson(grafo), 'application/json')}
          >
            JSON
          </button>
          <button
            className="btn"
            disabled={grafo.aristas.length === 0}
            onClick={() => descargar('grafo.csv', exportarCsv(grafo), 'text/csv')}
          >
            CSV
          </button>
        </div>
      </div>
      )}
    </section>
  )
}
