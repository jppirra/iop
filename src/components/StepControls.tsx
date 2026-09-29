export const VELOCIDADES = [
  { id: 'lenta', texto: 'Lenta', ms: 2200 },
  { id: 'normal', texto: 'Normal', ms: 1300 },
  { id: 'rapida', texto: 'Rápida', ms: 600 },
] as const

export type Velocidad = (typeof VELOCIDADES)[number]['id']

interface Props {
  indice: number
  total: number
  reproduciendo: boolean
  velocidad: Velocidad
  /** Si está desactivado se ocultan Reproducir y la velocidad. */
  animaciones: boolean
  onIr: (indice: number) => void
  onReproducir: (reproducir: boolean) => void
  onVelocidad: (v: Velocidad) => void
}

/** Controles de pasos. El avance automático lo maneja App para que funcione aunque estos controles estén ocultos. */
export function StepControls({ indice, total, reproduciendo, velocidad, animaciones, onIr, onReproducir, onVelocidad }: Props) {
  const ultimo = total - 1

  const manual = (i: number) => {
    onReproducir(false)
    onIr(i)
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">
          Paso {indice + 1} de {total}
        </span>
        {animaciones && (
          <div className="inline-flex rounded-md border border-slate-200 p-0.5 text-xs" role="group" aria-label="Velocidad">
            {VELOCIDADES.map((v) => (
              <button
                key={v.id}
                aria-pressed={velocidad === v.id}
                onClick={() => onVelocidad(v.id)}
                className={`rounded px-1.5 py-0.5 ${velocidad === v.id ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                {v.texto}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full bg-teal-600 ${animaciones ? 'transition-[width] duration-300' : ''}`}
          style={{ width: `${total > 1 ? (indice / ultimo) * 100 : 100}%` }}
        />
      </div>
      <input
        type="range"
        min={0}
        max={ultimo}
        value={indice}
        onChange={(e) => manual(Number(e.target.value))}
        className="w-full accent-teal-700"
        aria-label="Paso"
      />
      {animaciones && (
        <button
          className="btn btn-primario w-full"
          onClick={() => {
            if (reproduciendo) onReproducir(false)
            else {
              if (indice >= ultimo) onIr(0)
              onReproducir(true)
            }
          }}
        >
          {reproduciendo ? 'Pausar' : indice >= ultimo ? 'Repetir animación' : 'Reproducir'}
        </button>
      )}
      <div className="grid grid-cols-4 gap-1.5">
        <button className="btn px-1" onClick={() => manual(0)} disabled={indice === 0} title="Reiniciar">
          Reiniciar
        </button>
        <button className="btn px-1" onClick={() => manual(indice - 1)} disabled={indice === 0}>
          Anterior
        </button>
        <button className="btn px-1" onClick={() => manual(indice + 1)} disabled={indice >= ultimo}>
          Siguiente
        </button>
        <button className="btn px-1" onClick={() => manual(ultimo)} disabled={indice >= ultimo} title="Ir al resultado">
          Final
        </button>
      </div>
    </section>
  )
}
