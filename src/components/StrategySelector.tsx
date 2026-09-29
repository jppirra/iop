import type { ClaveParametro, Estrategia, Grafo, Parametros, Validacion } from '../types/graph'

interface Props {
  /** Estrategias habilitadas en /config. */
  estrategias: Estrategia[]
  mostrarPasoAPaso: boolean
  estrategia: Estrategia
  grafo: Grafo
  parametros: Parametros
  validacion: Validacion
  onCambiarEstrategia: (id: string) => void
  onCambiarParametro: (clave: ClaveParametro, id: string) => void
  onEjecutar: () => void
  onPasoAPaso: () => void
}

export function StrategySelector(p: Props) {
  const grupos = [...new Set(p.estrategias.map((e) => e.grupo))]
  const puedeEjecutar = p.validacion.errores.length === 0

  return (
    <section className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        Estrategia
        <select
          value={p.estrategia.id}
          onChange={(e) => p.onCambiarEstrategia(e.target.value)}
          className="campo mt-1"
        >
          {grupos.map((g) => (
            <optgroup key={g} label={g}>
              {p.estrategias
                .filter((e) => e.grupo === g)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
      <p className="text-xs leading-relaxed text-slate-500">{p.estrategia.descripcion}</p>

      {p.estrategia.parametros.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {p.estrategia.parametros.map((param) => (
            <label key={param.clave} className="block text-sm font-medium text-slate-700 first-letter:uppercase">
              {param.etiqueta}
              <select
                value={p.parametros[param.clave] ?? ''}
                onChange={(e) => p.onCambiarParametro(param.clave, e.target.value)}
                className="campo mt-1"
                disabled={p.grafo.nodos.length === 0}
              >
                {p.grafo.nodos.length === 0 && <option value="">—</option>}
                {p.grafo.nodos.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nombre}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}

      {p.validacion.errores.map((e) => (
        <p key={e} className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {e}
        </p>
      ))}
      {p.validacion.advertencias.map((a) => (
        <p key={a} className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {a}
        </p>
      ))}

      <div className={`grid gap-2 ${p.mostrarPasoAPaso ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <button className="btn btn-primario" disabled={!puedeEjecutar} onClick={p.onEjecutar}>
          Ejecutar
        </button>
        {p.mostrarPasoAPaso && (
          <button className="btn" disabled={!puedeEjecutar} onClick={p.onPasoAPaso}>
            Paso a paso
          </button>
        )}
      </div>
    </section>
  )
}
