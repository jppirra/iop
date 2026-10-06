import { useEffect, useRef, useState } from 'react'
import { fmt as fmtTiempo, probabilidadDeTerminar } from '../algorithms/proyecto'
import { leerPeso } from '../parsers'
import type { Ejecucion, Paso, ResultadoArbol, ResultadoFlujo, ResultadoProyecto, ResultadoRuta } from '../types/graph'

interface Props {
  ejecucion: Ejecucion
  indice: number
  /** Lista "Todos los pasos". */
  mostrarHistorial: boolean
  onIr: (indice: number) => void
}

export function ResultsPanel({ ejecucion, indice, mostrarHistorial, onIr }: Props) {
  const paso = ejecucion.pasos[indice]
  const final = indice === ejecucion.pasos.length - 1
  const { resultado } = ejecucion

  return (
    <div className="space-y-4">
      <PasoActual paso={paso} />

      {resultado.tipo === 'arbol' && <ResultadoArbolVista resultado={resultado} paso={paso} final={final} />}
      {resultado.tipo === 'ruta' && <ResultadoRutaVista resultado={resultado} paso={paso} final={final} />}
      {resultado.tipo === 'flujo' && <ResultadoFlujoVista resultado={resultado} paso={paso} final={final} />}
      {resultado.tipo === 'proyecto' && <ResultadoProyectoVista resultado={resultado} paso={paso} final={final} />}

      {mostrarHistorial && <Historial pasos={ejecucion.pasos} indice={indice} onIr={onIr} />}
    </div>
  )
}

function PasoActual({ paso }: { paso: Paso }) {
  return (
    <section className="rounded-lg border border-teal-200 bg-teal-50/60 p-3" aria-live="polite">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-teal-800">{paso.titulo}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-800">{paso.descripcion}</p>
      {paso.empate && (
        <p className="mt-2 rounded-md bg-amber-100 px-2.5 py-1.5 text-xs leading-relaxed text-amber-900">⚠ {paso.empate}</p>
      )}
    </section>
  )
}

function Aviso({ tipo, children }: { tipo: 'error' | 'aviso' | 'ok'; children: React.ReactNode }) {
  const clases = {
    error: 'bg-red-50 text-red-700',
    aviso: 'bg-amber-50 text-amber-900',
    ok: 'bg-blue-50 text-blue-900',
  }[tipo]
  return <div className={`rounded-md px-3 py-2 text-sm ${clases}`}>{children}</div>
}

function ResultadoArbolVista({ resultado, paso, final }: { resultado: ResultadoArbol; paso: Paso; final: boolean }) {
  const incluidas = new Set(paso.aristasIncluidas)
  const filas = resultado.aristas.filter((a) => incluidas.has(a.aristaId))
  const parcial = filas.reduce((s, a) => s + a.peso, 0)

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-800">Aristas elegidas</h3>
      <table className="tabla">
        <thead>
          <tr>
            <th>#</th>
            <th>Arista</th>
            <th className="text-right">Distancia</th>
            <th className="text-right">Acumulada</th>
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center text-slate-400">
                Todavía no se eligió ninguna arista
              </td>
            </tr>
          )}
          {filas.map((a, i) => (
            <tr key={a.aristaId}>
              <td className="text-slate-400">{i + 1}</td>
              <td>
                {a.desde} – {a.hasta}
              </td>
              <td className="text-right tabular-nums">{a.peso}</td>
              <td className="text-right tabular-nums">{filas.slice(0, i + 1).reduce((s, x) => s + x.peso, 0)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>{final ? 'Distancia total' : 'Distancia parcial'}</td>
            <td colSpan={2} className="text-right tabular-nums">
              {final ? resultado.total : parcial}
            </td>
          </tr>
        </tfoot>
      </table>
      {final && !resultado.conexo && (
        <Aviso tipo="error">
          El grafo no es conexo. Quedan sin conectar: {resultado.nodosSinConectar.join(', ')}.
        </Aviso>
      )}
      {final && resultado.solucionesMultiples && (
        <Aviso tipo="aviso">
          <p className="font-medium">Hay soluciones óptimas múltiples.</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
            {resultado.detalleEmpates.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </Aviso>
      )}
    </section>
  )
}

const fmt = (d: number) => (Number.isFinite(d) ? String(d) : '∞')

function ResultadoRutaVista({ resultado, paso, final }: { resultado: ResultadoRuta; paso: Paso; final: boolean }) {
  const hasta = paso.iteracion ?? 0
  const iteraciones = resultado.iteraciones.slice(0, hasta + 1)
  const nodos = resultado.iteraciones[0]?.etiquetas.map((e) => e.nodo) ?? []
  const filaActual = useRef<HTMLTableRowElement>(null)

  useEffect(() => {
    filaActual.current?.scrollIntoView({ block: 'nearest' })
  }, [hasta])

  return (
    <section className="space-y-2">
      {final &&
        (resultado.ruta ? (
          <Aviso tipo="ok">
            <p className="font-medium">
              Ruta: {resultado.ruta.join(' → ')}
            </p>
            <p>Distancia total: {resultado.distancia}</p>
          </Aviso>
        ) : (
          <Aviso tipo="error">
            No hay ruta de {resultado.origen} a {resultado.destino}.
          </Aviso>
        ))}
      {final && resultado.solucionesMultiples && (
        <Aviso tipo="aviso">
          <p className="font-medium">Hay rutas óptimas múltiples.</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
            {resultado.detalleEmpates.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </Aviso>
      )}

      <h3 className="text-sm font-semibold text-slate-800">Etiquetas por iteración</h3>
      <p className="text-xs text-slate-500">
        Cada celda es [distancia acumulada, nodo previo]. En verde, etiqueta permanente (nodo fijado).
      </p>
      <div className="max-h-72 overflow-auto rounded-md border border-slate-200">
        <table className="tabla tabla-compacta">
          <thead className="sticky top-0">
            <tr>
              <th>It.</th>
              <th>Fija</th>
              {nodos.map((n) => (
                <th key={n} className="text-center">
                  {n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {iteraciones.map((it, i) => (
              <tr key={it.numero} ref={i === iteraciones.length - 1 ? filaActual : undefined}>
                <td className="text-slate-400">{it.numero}</td>
                <td className="font-medium">{it.nodoFijado ?? '—'}</td>
                {it.etiquetas.map((e) => {
                  const recienFijado = e.nodo === it.nodoFijado
                  return (
                    <td
                      key={e.nodo}
                      className={`whitespace-nowrap text-center tabular-nums ${
                        recienFijado ? 'bg-amber-100 font-semibold' : e.permanente ? 'bg-green-50 text-green-800' : ''
                      }`}
                    >
                      [{fmt(e.distancia)}, {e.previo ?? '—'}]
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ResultadoFlujoVista({ resultado, paso, final }: { resultado: ResultadoFlujo; paso: Paso; final: boolean }) {
  const hasta = Math.min(paso.iteracion ?? 0, resultado.iteraciones.length - 1)
  const caminos = resultado.iteraciones.slice(1, hasta + 1)
  const actual = resultado.iteraciones[hasta]
  const { corte } = resultado
  const enCorte = new Set(paso.aristasCorte)

  return (
    <section className="space-y-2">
      {final && (
        <Aviso tipo="ok">
          <p className="font-medium">
            Flujo máximo de {resultado.fuente} a {resultado.sumidero}: {resultado.flujoMaximo}
          </p>
          {resultado.flujoMaximo === 0 && <p>No hay ningún camino de la fuente al sumidero.</p>}
        </Aviso>
      )}

      <h3 className="text-sm font-semibold text-slate-800">Caminos de aumento</h3>
      <table className="tabla">
        <thead>
          <tr>
            <th>It.</th>
            <th>Camino</th>
            <th className="text-right">Cuello (k)</th>
            <th className="text-right">Acumulado</th>
          </tr>
        </thead>
        <tbody>
          {caminos.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center text-slate-400">
                Todavía no se envió flujo
              </td>
            </tr>
          )}
          {caminos.map((it) => (
            <tr key={it.numero}>
              <td className="text-slate-400">{it.numero}</td>
              <td>{it.camino.join(' → ')}</td>
              <td className="text-right tabular-nums">{it.cuello}</td>
              <td className="text-right tabular-nums">{it.flujoAcumulado}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>{final ? 'Flujo máximo' : 'Flujo parcial'}</td>
            <td colSpan={2} className="text-right tabular-nums">
              {actual.flujoAcumulado}
            </td>
          </tr>
        </tfoot>
      </table>

      <h3 className="pt-1 text-sm font-semibold text-slate-800">Flujo por arco</h3>
      <p className="text-xs text-slate-500">Holgura = capacidad − flujo. Un arco con holgura 0 está saturado.</p>
      <div className="max-h-72 overflow-auto rounded-md border border-slate-200">
        <table className="tabla tabla-compacta">
          <thead className="sticky top-0">
            <tr>
              <th>Arco</th>
              <th className="text-right">Flujo / Cap.</th>
              <th className="text-right">Holgura</th>
            </tr>
          </thead>
          <tbody>
            {actual.arcos.map((a) => {
              const holgura = Math.round((a.capacidad - a.flujo) * 1e9) / 1e9
              return (
                <tr key={a.aristaId} className={enCorte.has(a.aristaId) ? 'bg-red-50 text-red-800' : a.flujo > 0 ? 'bg-green-50 text-green-800' : ''}>
                  <td>
                    {a.desde} → {a.hasta}
                  </td>
                  <td className="text-right tabular-nums">
                    {a.flujo} / {a.capacidad}
                  </td>
                  <td className="text-right tabular-nums">{holgura === 0 ? '0 (lleno)' : holgura}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {enCorte.size > 0 && (
        <Aviso tipo="aviso">
          <p className="font-medium">Corte mínimo: capacidad {corte.capacidad}</p>
          <p className="mt-1 text-xs">
            Lado de la fuente: {'{'}
            {corte.ladoFuente.join(', ')}
            {'}'} · Lado del sumidero: {'{'}
            {corte.ladoSumidero.join(', ')}
            {'}'}
          </p>
          <p className="mt-1 text-xs">
            Arcos que cruzan: {corte.arcos.map((a) => `${a.desde}→${a.hasta} (${a.capacidad})`).join(', ')}. Flujo máximo = capacidad del
            corte mínimo.
          </p>
        </Aviso>
      )}
    </section>
  )
}

function ResultadoProyectoVista({ resultado, paso, final }: { resultado: ResultadoProyecto; paso: Paso; final: boolean }) {
  const n = resultado.eventos.length
  // paso.iteracion cuenta eventos calculados: primero los tiempos más tempranos (1..n) y después los más tardíos (n+1..2n).
  const k = paso.iteracion ?? 0
  const conHolguras = k > 2 * n
  const esPert = resultado.metodo === 'pert'
  const [plazo, setPlazo] = useState('')
  const plazoNumero = leerPeso(plazo, true)
  const prob =
    esPert && plazoNumero !== null ? probabilidadDeTerminar(resultado.duracion, resultado.desvio ?? 0, plazoNumero) : null

  return (
    <section className="space-y-2">
      {final && (
        <Aviso tipo="ok">
          <p className="font-medium">
            Duración {esPert ? 'esperada ' : ''}del proyecto: {fmtTiempo(resultado.duracion)}
          </p>
          <p>Ruta crítica: {resultado.rutaCritica.join(' → ')}</p>
          {esPert && (
            <p>
              Varianza: {fmtTiempo(resultado.varianza ?? 0)} · Desvío estándar: {fmtTiempo(resultado.desvio ?? 0)}
            </p>
          )}
        </Aviso>
      )}
      {final && resultado.rutasCriticas > 1 && (
        <Aviso tipo="aviso">
          Hay {resultado.rutasCriticas} rutas críticas con la misma duración.
          {esPert && ' Se informa la de mayor varianza.'}
        </Aviso>
      )}

      {final && esPert && (
        <div className="rounded-md border border-slate-200 p-3">
          <label className="block text-sm font-medium text-slate-700">
            Probabilidad de terminar en un plazo
            <input
              value={plazo}
              onChange={(e) => setPlazo(e.target.value)}
              placeholder={`Plazo (ej: ${fmtTiempo(Math.ceil(resultado.duracion) + 1)})`}
              inputMode="decimal"
              className="campo mt-1"
            />
          </label>
          {prob && (
            <p className="mt-2 text-sm text-slate-700">
              {prob.z !== null && (
                <>
                  Z = ({fmtTiempo(plazoNumero!)} − {fmtTiempo(resultado.duracion)}) / {fmtTiempo(resultado.desvio ?? 0)} = {prob.z.toFixed(2)} ·{' '}
                </>
              )}
              Probabilidad: <strong className="text-teal-800">{(prob.probabilidad * 100).toFixed(2)} %</strong>
            </p>
          )}
          {plazo.trim() !== '' && plazoNumero === null && <p className="mt-2 text-xs text-red-700">Ingresá un número.</p>}
        </div>
      )}

      <h3 className="text-sm font-semibold text-slate-800">Eventos</h3>
      <p className="text-xs text-slate-500">Tiempo más temprano y más tardío de cada nodo, en el orden en que se calculan.</p>
      <div className="max-h-56 overflow-auto rounded-md border border-slate-200">
        <table className="tabla tabla-compacta">
          <thead className="sticky top-0">
            <tr>
              <th>Evento</th>
              <th className="text-right">Más temprano</th>
              <th className="text-right">Más tardío</th>
            </tr>
          </thead>
          <tbody>
            {resultado.eventos.map((e, i) => {
              const tardioListo = k > n && n - 1 - i < k - n
              return (
                <tr key={e.nodo} className={tardioListo && e.temprano === e.tardio ? 'bg-blue-50 text-blue-900' : ''}>
                  <td className="font-medium">{e.nodo}</td>
                  <td className="text-right tabular-nums">{i < k ? fmtTiempo(e.temprano) : '—'}</td>
                  <td className="text-right tabular-nums">{tardioListo ? fmtTiempo(e.tardio) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {conHolguras && (
        <>
          <h3 className="pt-1 text-sm font-semibold text-slate-800">Actividades</h3>
          <p className="text-xs text-slate-500">
            IC/TC: inicio y terminación más cercanos · IL/TL: más lejanos · H: holgura. En azul, las actividades críticas.
          </p>
          <div className="max-h-80 overflow-auto rounded-md border border-slate-200">
            <table className="tabla tabla-compacta">
              <thead className="sticky top-0">
                <tr>
                  <th>Act.</th>
                  {esPert && <th className="text-right">a / m / b</th>}
                  <th className="text-right">{esPert ? 'te' : 'Dur.'}</th>
                  {esPert && <th className="text-right">Var.</th>}
                  <th className="text-right">IC</th>
                  <th className="text-right">TC</th>
                  <th className="text-right">IL</th>
                  <th className="text-right">TL</th>
                  <th className="text-right">H</th>
                </tr>
              </thead>
              <tbody>
                {resultado.actividades.map((a) => (
                  <tr key={a.aristaId} className={a.critica ? 'bg-blue-50 text-blue-900' : ''}>
                    <td className="whitespace-nowrap font-medium">
                      {a.desde}→{a.hasta}
                    </td>
                    {esPert && (
                      <td className="whitespace-nowrap text-right tabular-nums">
                        {fmtTiempo(a.optimista!)} / {fmtTiempo(a.masProbable!)} / {fmtTiempo(a.pesimista!)}
                      </td>
                    )}
                    <td className="text-right tabular-nums">{fmtTiempo(a.duracion)}</td>
                    {esPert && <td className="text-right tabular-nums">{fmtTiempo(a.varianza ?? 0)}</td>}
                    <td className="text-right tabular-nums">{fmtTiempo(a.es)}</td>
                    <td className="text-right tabular-nums">{fmtTiempo(a.ef)}</td>
                    <td className="text-right tabular-nums">{fmtTiempo(a.ls)}</td>
                    <td className="text-right tabular-nums">{fmtTiempo(a.lf)}</td>
                    <td className="text-right tabular-nums">{fmtTiempo(a.holgura)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

function Historial({ pasos, indice, onIr }: { pasos: Paso[]; indice: number; onIr: (i: number) => void }) {
  return (
    <section>
      <h3 className="mb-1 text-sm font-semibold text-slate-800">Todos los pasos</h3>
      <ol className="max-h-64 space-y-1 overflow-auto pr-1">
        {pasos.map((p, i) => (
          <li key={i}>
            <button
              onClick={() => onIr(i)}
              className={`w-full rounded-md px-2 py-1.5 text-left text-xs leading-relaxed transition-colors ${
                i === indice
                  ? 'bg-teal-700 text-white'
                  : i < indice
                    ? 'text-slate-700 hover:bg-slate-100'
                    : 'text-slate-400 hover:bg-slate-100'
              }`}
            >
              <span className="font-semibold">{p.titulo}.</span> {p.descripcion}
              {p.empate && <span className={i === indice ? 'text-amber-200' : 'text-amber-600'}> ⚠ empate</span>}
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
