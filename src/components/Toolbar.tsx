interface Props {
  dirigido: boolean
  dirigidoForzado: boolean
  puedeDeshacer: boolean
  hayNodos: boolean
  onCambiarDirigido: (dirigido: boolean) => void
  onLimpiar: () => void
  onDeshacer: () => void
  onAutoLayout: () => void
  onAjustar: () => void
}

export function Toolbar(p: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
      <div className="inline-flex rounded-md border border-slate-300 p-0.5 text-sm" role="group" aria-label="Tipo de grafo">
        {[
          { valor: false, texto: 'No dirigido' },
          { valor: true, texto: 'Dirigido' },
        ].map((op) => {
          const activo = (p.dirigidoForzado ? false : p.dirigido) === op.valor
          return (
            <button
              key={op.texto}
              disabled={p.dirigidoForzado}
              aria-pressed={activo}
              onClick={() => p.onCambiarDirigido(op.valor)}
              className={`rounded px-2.5 py-1 transition-colors disabled:cursor-not-allowed ${
                activo ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-slate-100 disabled:opacity-50'
              }`}
            >
              {op.texto}
            </button>
          )
        })}
      </div>
      {p.dirigidoForzado && <span className="text-xs text-slate-500">El árbol mínimo usa siempre grafo no dirigido</span>}

      <div className="ml-auto flex flex-wrap gap-2">
        <button className="btn" onClick={p.onDeshacer} disabled={!p.puedeDeshacer} title="Ctrl+Z">
          Deshacer
        </button>
        <button className="btn" onClick={p.onAutoLayout} disabled={!p.hayNodos}>
          Auto-layout
        </button>
        <button className="btn" onClick={p.onAjustar} disabled={!p.hayNodos}>
          Centrar
        </button>
        <button className="btn btn-peligro" onClick={p.onLimpiar} disabled={!p.hayNodos}>
          Limpiar
        </button>
      </div>
    </div>
  )
}
