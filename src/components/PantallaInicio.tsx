import { useEffect, useState } from 'react'
import { NOMBRE_APP, SUBTITULO_APP } from '../examples/integrantes'
import type { Estrategia } from '../types/graph'

export type ModoCarga = 'manual' | 'masiva' | 'aleatorio'

interface Props {
  estrategias: Estrategia[]
  /** Modos de carga habilitados en /config (la carga manual siempre está). */
  modos: { masiva: boolean; aleatorio: boolean }
  /** Menú "Ejemplos del libro" visible (según /config). */
  mostrarEjemplos: boolean
  estrategiaInicial: string
  /** Si es false (primera vez) no se puede cerrar sin elegir. */
  cerrable: boolean
  onElegir: (estrategiaId: string, modo: ModoCarga) => void
  onCerrar: () => void
}

const MODOS: { id: ModoCarga; titulo: string; descripcion: string; icono: string }[] = [
  {
    id: 'manual',
    titulo: 'Carga manual',
    descripcion: 'Dibujá el grafo: doble click para crear nodos y click en dos nodos para unirlos.',
    icono: '✎',
  },
  {
    id: 'masiva',
    titulo: 'Carga masiva',
    descripcion: 'Pegá o subí las aristas en texto (origen destino peso), CSV o JSON.',
    icono: '⇪',
  },
  {
    id: 'aleatorio',
    titulo: 'Ejemplo aleatorio',
    descripcion: 'Se genera un grafo conexo al azar, listo para ejecutar.',
    icono: '⚄',
  },
]

export function PantallaInicio({ estrategias, modos, mostrarEjemplos, estrategiaInicial, cerrable, onElegir, onCerrar }: Props) {
  const modosVisibles = MODOS.filter((m) => m.id === 'manual' || modos[m.id])
  const [estrategiaId, setEstrategiaId] = useState(estrategiaInicial)

  useEffect(() => {
    if (!cerrable) return
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [cerrable, onCerrar])

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-slate-900/50 p-4 sm:items-center"
      onMouseDown={(e) => cerrable && e.target === e.currentTarget && onCerrar()}
    >
      <div role="dialog" aria-labelledby="titulo-inicio" className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="titulo-inicio" className="text-xl font-bold text-teal-800">
              {NOMBRE_APP}
            </h2>
            <p className="text-sm text-slate-500">{SUBTITULO_APP}</p>
          </div>
          {cerrable && (
            <button onClick={onCerrar} className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Cerrar">
              ✕
            </button>
          )}
        </div>

        <h3 className="mt-6 text-sm font-semibold text-slate-700">1. Elegí el algoritmo</h3>
        <div className={`mt-2 grid gap-2 ${columnas(estrategias.length)}`}>
          {estrategias.map((e) => {
            const activa = e.id === estrategiaId
            return (
              <button
                key={e.id}
                onClick={() => setEstrategiaId(e.id)}
                aria-pressed={activa}
                className={`rounded-lg border-2 p-3 text-left transition-colors ${
                  activa ? 'border-teal-600 bg-teal-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">{e.grupo}</span>
                <span className="mt-0.5 block font-semibold text-slate-800">{e.nombre.split(' - ').pop()}</span>
                <span className="mt-1 block text-xs leading-snug text-slate-500">{e.descripcion}</span>
              </button>
            )
          })}
        </div>

        <h3 className="mt-6 text-sm font-semibold text-slate-700">2. ¿Cómo querés cargar el grafo?</h3>
        <div className={`mt-2 grid gap-2 ${columnas(modosVisibles.length)}`}>
          {modosVisibles.map((m) => (
            <button
              key={m.id}
              onClick={() => onElegir(estrategiaId, m.id)}
              className="group rounded-lg border-2 border-slate-200 p-3 text-left transition-colors hover:border-teal-600 hover:bg-teal-50 focus-visible:border-teal-600 focus-visible:outline-none"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-lg text-slate-600 group-hover:bg-teal-700 group-hover:text-white">
                {m.icono}
              </span>
              <span className="mt-2 block font-semibold text-slate-800">{m.titulo}</span>
              <span className="mt-1 block text-xs leading-snug text-slate-500">{m.descripcion}</span>
            </button>
          ))}
        </div>

        <p className="mt-5 text-xs text-slate-400">
          {mostrarEjemplos && 'También podés cargar los ejemplos del libro desde el menú de la cabecera. '}Esta pantalla se vuelve a abrir con el botón
          "Inicio".
        </p>
      </div>
    </div>
  )
}

function columnas(n: number) {
  return n === 3 || n > 4 ? 'sm:grid-cols-3' : n > 1 ? 'sm:grid-cols-2' : 'grid-cols-1'
}
