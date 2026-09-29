import { useEffect, useState } from 'react'

interface Props {
  indice: number
  total: number
  onIr: (indice: number) => void
}

export function StepControls({ indice, total, onIr }: Props) {
  const [reproduciendo, setReproduciendo] = useState(false)
  const ultimo = total - 1
  const enCurso = reproduciendo && indice < ultimo

  useEffect(() => {
    if (!enCurso) return
    const t = setTimeout(() => onIr(indice + 1), 1100)
    return () => clearTimeout(t)
  }, [enCurso, indice, onIr])

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">
          Paso {indice + 1} de {total}
        </span>
        <button
          className="text-xs font-medium text-teal-700 hover:underline disabled:text-slate-400 disabled:no-underline"
          onClick={() => {
            if (indice >= ultimo) onIr(0)
            setReproduciendo(!enCurso)
          }}
        >
          {enCurso ? 'Pausar' : 'Reproducir'}
        </button>
      </div>
      <input
        type="range"
        min={0}
        max={ultimo}
        value={indice}
        onChange={(e) => onIr(Number(e.target.value))}
        className="w-full accent-teal-700"
        aria-label="Paso"
      />
      <div className="grid grid-cols-3 gap-2">
        <button className="btn" onClick={() => onIr(indice - 1)} disabled={indice === 0}>
          Anterior
        </button>
        <button className="btn btn-primario" onClick={() => onIr(indice + 1)} disabled={indice >= ultimo}>
          Siguiente
        </button>
        <button
          className="btn"
          onClick={() => {
            setReproduciendo(false)
            onIr(0)
          }}
        >
          Reiniciar
        </button>
      </div>
    </section>
  )
}
