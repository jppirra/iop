import { useEffect } from 'react'
import { integrantes, NOMBRE_APP, SUBTITULO_APP } from '../examples/integrantes'

export function IntegrantesDialog({ onCerrar }: { onCerrar: () => void }) {
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [onCerrar])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div role="dialog" aria-labelledby="titulo-integrantes" className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 id="titulo-integrantes" className="text-base font-semibold text-slate-800">
          Integrantes · {NOMBRE_APP}
        </h2>
        <p className="mt-1 text-sm text-slate-500">UTN · Investigación Operativa · {SUBTITULO_APP}</p>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 font-medium">Integrante</th>
              <th className="py-2 text-right font-medium">Legajo</th>
            </tr>
          </thead>
          <tbody>
            {integrantes.map((i) => (
              <tr key={i.legajo} className="border-b border-slate-100 last:border-0">
                <td className="py-2 text-slate-800">{i.nombre}</td>
                <td className="py-2 text-right font-mono text-slate-600 tabular-nums">{i.legajo}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex justify-end">
          <button className="btn btn-primario" onClick={onCerrar} autoFocus>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
