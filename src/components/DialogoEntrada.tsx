import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

export interface OpcionesDialogo {
  titulo: string
  etiqueta: string
  valorInicial?: string
  /** Devuelve un mensaje de error o null si el valor es válido. */
  validar?: (valor: string) => string | null
}

interface Pendiente extends OpcionesDialogo {
  resolver: (valor: string | null) => void
}

/** Reemplazo de window.prompt: `const valor = await pedir({...})` devuelve null si se cancela. */
export function useDialogo(): { pedir: (o: OpcionesDialogo) => Promise<string | null>; dialogo: ReactNode; abierto: boolean } {
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)

  const pedir = useCallback(
    (opciones: OpcionesDialogo) =>
      new Promise<string | null>((resolver) => setPendiente({ ...opciones, resolver })),
    [],
  )

  const cerrar = (valor: string | null) => {
    pendiente?.resolver(valor)
    setPendiente(null)
  }

  const dialogo = pendiente ? <Dialogo key={pendiente.titulo} {...pendiente} onCerrar={cerrar} /> : null
  return { pedir, dialogo, abierto: pendiente !== null }
}

function Dialogo({ titulo, etiqueta, valorInicial = '', validar, onCerrar }: Pendiente & { onCerrar: (v: string | null) => void }) {
  const [valor, setValor] = useState(valorInicial)
  const [tocado, setTocado] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)
  const error = validar?.(valor) ?? null

  useEffect(() => {
    entrada.current?.focus()
    entrada.current?.select()
  }, [])

  const confirmar = () => {
    setTocado(true)
    if (!error) onCerrar(valor.trim())
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar(null)}
    >
      <form
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
        onSubmit={(e) => {
          e.preventDefault()
          confirmar()
        }}
        onKeyDown={(e) => e.key === 'Escape' && onCerrar(null)}
      >
        <h2 className="text-base font-semibold text-slate-800">{titulo}</h2>
        <label className="mt-3 block text-sm text-slate-600">
          {etiqueta}
          <input
            ref={entrada}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
          />
        </label>
        {tocado && error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => onCerrar(null)} className="btn">
            Cancelar
          </button>
          <button type="submit" className="btn btn-primario">
            Aceptar
          </button>
        </div>
      </form>
    </div>
  )
}
