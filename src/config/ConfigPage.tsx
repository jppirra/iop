import { useState } from 'react'
import { listaEstrategias } from '../algorithms'
import { NOMBRE_APP, VERSION } from '../examples/integrantes'
import { aJson, COMPONENTES, permiteDirigido, type ComponenteConfigurable } from './configuracion'
import { useConfiguracion } from './useConfiguracion'

function Interruptor({
  activo,
  deshabilitado,
  onCambiar,
  etiqueta,
}: {
  activo: boolean
  deshabilitado?: boolean
  onCambiar: (v: boolean) => void
  etiqueta: string
}) {
  return (
    <button
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      disabled={deshabilitado}
      onClick={() => onCambiar(!activo)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        activo ? 'bg-teal-700' : 'bg-slate-300'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${activo ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  )
}

/** Pantalla privada de configuración: no hay enlaces a ella desde la app, se entra escribiendo /config. */
export function ConfigPage() {
  const { config, esLocal, actualizar, usarDelProyecto } = useConfiguracion()
  const dirigido = permiteDirigido(config, listaEstrategias)
  const json = aJson(config)
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(json)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  const descargar = () => {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'config.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const alternarEstrategia = (id: string, activa: boolean) =>
    actualizar((c) => ({
      ...c,
      estrategias: listaEstrategias.map((e) => e.id).filter((x) => (x === id ? activa : c.estrategias.includes(x))),
    }))

  const alternarComponente = (clave: ComponenteConfigurable, valor: boolean) => actualizar((c) => ({ ...c, [clave]: valor }))

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Configuración</p>
            <h1 className="text-2xl font-bold text-teal-800">{NOMBRE_APP}</h1>
          </div>
          <a href="/" className="btn btn-primario">
            Ir a la app
          </a>
        </header>

        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm shadow-sm ${
            esLocal ? 'bg-amber-50 text-amber-900' : 'bg-white text-slate-600'
          }`}
        >
          <p>
            {esLocal ? (
              <>
                <strong>Configuración local:</strong> tus cambios valen solo en este navegador. Los demás ven la configuración
                del proyecto.
              </>
            ) : (
              <>
                <strong>Configuración del proyecto</strong> (<code>src/config/config.json</code>): es la que ven todos. Si
                cambiás algo acá, se guarda solo en este navegador.
              </>
            )}
          </p>
          {esLocal && (
            <button className="btn" onClick={usarDelProyecto}>
              Volver a la del proyecto
            </button>
          )}
        </div>

        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800">Algoritmos disponibles</h2>
          <p className="mt-1 text-sm text-slate-500">Tiene que quedar al menos uno habilitado.</p>
          <ul className="mt-4 divide-y divide-slate-100">
            {listaEstrategias.map((e) => {
              const activa = config.estrategias.includes(e.id)
              const unica = activa && config.estrategias.length === 1
              return (
                <li key={e.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium text-slate-800">{e.nombre}</p>
                    <p className="text-xs text-slate-500">
                      {e.descripcion} {e.forzarNoDirigido ? 'Solo grafos no dirigidos.' : 'Acepta grafos dirigidos.'}
                    </p>
                  </div>
                  <Interruptor
                    etiqueta={e.nombre}
                    activo={activa}
                    deshabilitado={unica}
                    onCambiar={(v) => alternarEstrategia(e.id, v)}
                  />
                </li>
              )
            })}
          </ul>
          <p className={`mt-3 rounded-md px-3 py-2 text-xs ${dirigido ? 'bg-slate-50 text-slate-600' : 'bg-amber-50 text-amber-900'}`}>
            {dirigido
              ? 'La opción "Dirigido / No dirigido" se muestra porque hay al menos un algoritmo que acepta grafos dirigidos.'
              : 'La opción "Dirigido / No dirigido" queda oculta: ninguno de los algoritmos habilitados usa grafos dirigidos.'}
          </p>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800">Componentes visibles</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {COMPONENTES.map((comp) => {
              const bloqueado = comp.dependeDe ? !config[comp.dependeDe] : false
              return (
                <li key={comp.clave} className={`flex items-center justify-between gap-4 py-3 ${comp.dependeDe ? 'pl-5' : ''}`}>
                  <div>
                    <p className="font-medium text-slate-800">{comp.titulo}</p>
                    <p className="text-xs text-slate-500">
                      {comp.descripcion}
                      {bloqueado && ` Oculto porque "${COMPONENTES.find((c) => c.clave === comp.dependeDe)!.titulo}" está desactivado.`}
                    </p>
                  </div>
                  <Interruptor
                    etiqueta={comp.titulo}
                    activo={config[comp.clave] && !bloqueado}
                    deshabilitado={bloqueado}
                    onCambiar={(v) => alternarComponente(comp.clave, v)}
                  />
                </li>
              )
            })}
          </ul>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800">Aplicar para todos</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>Dejá la configuración como la querés en esta pantalla.</li>
            <li>
              Copiá el JSON y reemplazá el contenido de <code className="rounded bg-slate-100 px-1">src/config/config.json</code>{' '}
              en el repositorio.
            </li>
            <li>Hacé commit y push: Vercel publica la nueva versión y la ven todos.</li>
          </ol>
          <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">{json}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn btn-primario" onClick={copiar}>
              {copiado ? 'Copiado ✓' : 'Copiar JSON'}
            </button>
            <button className="btn" onClick={descargar}>
              Descargar config.json
            </button>
          </div>
        </section>

        <footer className="text-right text-xs text-slate-500">
          <span className="font-mono">{VERSION}</span>
        </footer>
      </div>
    </div>
  )
}
