import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { estrategias, listaEstrategias } from './algorithms'
import { nodoMasLejano } from './algorithms/utils'
import { BulkLoadPanel } from './components/BulkLoadPanel'
import { useDialogo } from './components/DialogoEntrada'
import { GraphCanvas, type CanvasApi } from './components/GraphCanvas'
import { IntegrantesDialog } from './components/IntegrantesDialog'
import { ResultsPanel } from './components/ResultsPanel'
import { PantallaInicio, type ModoCarga } from './components/PantallaInicio'
import { StepControls, type Velocidad } from './components/StepControls'
import { StrategySelector } from './components/StrategySelector'
import { Toolbar } from './components/Toolbar'
import { NOMBRE_APP, VERSION } from './examples/integrantes'
import { grafoAleatorio } from './lib/aleatorio'
import { ejemplosLibro, type EjemploLibro } from './examples/libro'
import { useHistorial } from './hooks/useHistorial'
import {
  agregarArista,
  agregarNodo,
  desdePlano,
  editarPeso,
  eliminar,
  existeArista,
  firmaEstructural,
  grafoVacio,
  moverNodos,
  nombreSugerido,
  renombrarNodo,
} from './lib/grafo'
import { leerPeso, type GrafoPlano } from './parsers'
import type { ClaveParametro, Ejecucion, Grafo, Parametros } from './types/graph'

const validarPeso = (v: string) => (leerPeso(v, true) === null ? 'Ingresá un número (ej: 3 o 2,5).' : null)

function parametrosPorNombre(grafo: Grafo, porNombre: EjemploLibro['parametros']): Parametros {
  const id = (nombre?: string) => grafo.nodos.find((n) => n.nombre === nombre)?.id
  return Object.fromEntries(Object.entries(porNombre).map(([clave, nombre]) => [clave, id(nombre)]))
}

export default function App() {
  const { actual: grafo, aplicar, deshacer, puedeDeshacer } = useHistorial<Grafo>(grafoVacio())
  const [estrategiaId, setEstrategiaId] = useState(listaEstrategias[0].id)
  const [parametros, setParametros] = useState<Parametros>({})
  const [ejecucion, setEjecucion] = useState<{ clave: string; datos: Ejecucion } | null>(null)
  const [indice, setIndice] = useState(0)
  const [reproduciendo, setReproduciendo] = useState(false)
  const [velocidad, setVelocidad] = useState<Velocidad>('normal')
  const [pestana, setPestana] = useState<'ejecutar' | 'carga'>('ejecutar')
  const [inicio, setInicio] = useState<'primera' | 'abierta' | 'cerrada'>('primera')
  const [verIntegrantes, setVerIntegrantes] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const canvas = useRef<CanvasApi>(null)
  const { pedir, dialogo, abierto } = useDialogo()

  const estrategia = estrategias[estrategiaId] ?? Object.values(estrategias)[0]
  const grafoEfectivo = useMemo(
    () => (estrategia.forzarNoDirigido && grafo.dirigido ? { ...grafo, dirigido: false } : grafo),
    [grafo, estrategia],
  )

  // Si un parámetro no es válido (p. ej. se borró el nodo) se usa un nodo por defecto.
  const parametrosEfectivos = useMemo(() => {
    const efectivos: Parametros = {}
    const existe = (id?: string) => !!id && grafo.nodos.some((n) => n.id === id)
    for (const { clave } of estrategia.parametros) {
      const porDefecto = clave === 'destino' ? grafo.nodos.at(-1)?.id : grafo.nodos[0]?.id
      efectivos[clave] = existe(parametros[clave]) ? parametros[clave] : porDefecto
    }
    return efectivos
  }, [grafo.nodos, estrategia, parametros])

  const validacion = useMemo(
    () => estrategia.validar(grafoEfectivo, parametrosEfectivos),
    [estrategia, grafoEfectivo, parametrosEfectivos],
  )

  // Mover nodos no invalida la ejecución; cambiar la estructura, la estrategia o los parámetros sí.
  const claveActual = useMemo(
    () => `${estrategia.id}|${JSON.stringify(parametrosEfectivos)}|${firmaEstructural(grafoEfectivo)}`,
    [estrategia.id, parametrosEfectivos, grafoEfectivo],
  )
  const vigente = ejecucion?.clave === claveActual ? ejecucion.datos : null
  const paso = vigente?.pasos[Math.min(indice, vigente.pasos.length - 1)] ?? null

  const avisar = useCallback((texto: string) => setAviso(texto), [])
  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 4000)
    return () => clearTimeout(t)
  }, [aviso])

  // Ctrl+Z para deshacer (fuera de campos de texto).
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (abierto || (e.target as HTMLElement).closest('input, textarea, select')) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        deshacer()
      }
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [abierto, deshacer])

  const ajustarLuego = () => requestAnimationFrame(() => canvas.current?.ajustar())

  // ---------- Ejecución ----------

  /** "animado" reproduce los pasos solo; "pasos" queda en el primero para avanzar a mano. */
  const ejecutar = (modo: 'animado' | 'pasos') => {
    if (validacion.errores.length) return
    const datos = estrategia.ejecutar(grafoEfectivo, parametrosEfectivos)
    setEjecucion({ clave: claveActual, datos })
    setIndice(0)
    setReproduciendo(modo === 'animado')
  }

  const irAPaso = useCallback(
    (i: number) => setIndice(Math.max(0, Math.min(i, (vigente?.pasos.length ?? 1) - 1))),
    [vigente],
  )

  // ---------- Edición ----------

  const nombreValido = (actual?: string) => (v: string) => {
    const nombre = v.trim()
    if (!nombre) return 'El nombre no puede estar vacío.'
    if (nombre !== actual && grafo.nodos.some((n) => n.nombre === nombre)) return `Ya existe un nodo "${nombre}".`
    return null
  }

  const alDobleClickFondo = async (x: number, y: number) => {
    const nombre = await pedir({
      titulo: 'Nuevo nodo',
      etiqueta: 'Nombre (ej: 1, A, Casa 1)',
      valorInicial: nombreSugerido(grafo),
      validar: nombreValido(),
    })
    if (nombre) aplicar((g) => agregarNodo(g, nombre, x, y))
  }

  const alDobleClickNodo = async (id: string) => {
    const nodo = grafo.nodos.find((n) => n.id === id)
    if (!nodo) return
    const nombre = await pedir({
      titulo: `Renombrar nodo ${nodo.nombre}`,
      etiqueta: 'Nombre',
      valorInicial: nodo.nombre,
      validar: nombreValido(nodo.nombre),
    })
    if (nombre && nombre !== nodo.nombre) aplicar((g) => renombrarNodo(g, id, nombre))
  }

  const alConectar = async (origen: string, destino: string) => {
    const nombre = (id: string) => grafo.nodos.find((n) => n.id === id)?.nombre
    if (existeArista(grafoEfectivo, origen, destino)) {
      avisar(`Ya existe una arista entre ${nombre(origen)} y ${nombre(destino)}. Hacé click en ella para cambiar el peso.`)
      return
    }
    const flecha = grafoEfectivo.dirigido ? '→' : '–'
    const peso = await pedir({
      titulo: `Nueva arista ${nombre(origen)} ${flecha} ${nombre(destino)}`,
      etiqueta: 'Peso (distancia, costo, capacidad…)',
      valorInicial: '1',
      validar: validarPeso,
    })
    if (peso !== null) aplicar((g) => agregarArista(g, origen, destino, leerPeso(peso, true)!))
  }

  const alClickArista = async (id: string) => {
    const arista = grafo.aristas.find((a) => a.id === id)
    if (!arista) return
    const nombre = (nid: string) => grafo.nodos.find((n) => n.id === nid)?.nombre
    const peso = await pedir({
      titulo: `Editar arista ${nombre(arista.origen)} ${grafoEfectivo.dirigido ? '→' : '–'} ${nombre(arista.destino)}`,
      etiqueta: 'Peso',
      valorInicial: String(arista.peso),
      validar: validarPeso,
    })
    if (peso !== null) aplicar((g) => editarPeso(g, id, leerPeso(peso, true)!))
  }

  const alCargar = (plano: GrafoPlano, modo: 'reemplazar' | 'agregar') => {
    aplicar((g) => (modo === 'reemplazar' ? desdePlano(plano, plano.dirigido ?? g.dirigido) : desdePlano(plano, g.dirigido, g)))
    ajustarLuego()
  }

  const cargarEjemplo = (id: string) => {
    const ejemplo = ejemplosLibro.find((e) => e.id === id)
    if (!ejemplo) return
    const nuevo = desdePlano(ejemplo.grafo, ejemplo.grafo.dirigido ?? false)
    aplicar(() => nuevo)
    setEstrategiaId(ejemplo.estrategia)
    setParametros(parametrosPorNombre(nuevo, ejemplo.parametros))
    setPestana('ejecutar')
    avisar(`Ejemplo cargado: ${ejemplo.titulo}. ${ejemplo.descripcion}`)
    ajustarLuego()
  }

  const cargarAleatorio = () => {
    const nuevo = desdePlano(grafoAleatorio(), false)
    const origen = nuevo.nodos[0].id
    aplicar(() => nuevo)
    // El destino es el nodo más lejano, para que la ruta tenga varios tramos.
    setParametros({ inicio: origen, origen, destino: nodoMasLejano(nuevo, origen) })
    setPestana('ejecutar')
    avisar('Se generó un grafo aleatorio conexo. Tocá "Ejecutar" para ver el algoritmo.')
    ajustarLuego()
  }

  const elegirInicio = (id: string, modo: ModoCarga) => {
    setEstrategiaId(id)
    setInicio('cerrada')
    if (modo === 'aleatorio') return cargarAleatorio()
    aplicar((g) => (g.nodos.length ? grafoVacio(g.dirigido) : g))
    setParametros({})
    setPestana(modo === 'masiva' ? 'carga' : 'ejecutar')
    if (modo === 'manual') avisar('Doble click en el lienzo para crear el primer nodo.')
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900 lg:h-screen">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="mr-auto">
          <h1 className="text-lg font-bold text-teal-800">{NOMBRE_APP}</h1>
          <p className="text-xs text-slate-500">Modelos de redes · Render, cap. 11</p>
        </div>
        <select
          value=""
          onChange={(e) => cargarEjemplo(e.target.value)}
          className="campo w-auto"
          aria-label="Ejemplos del libro"
        >
          <option value="" disabled>
            Ejemplos del libro…
          </option>
          {ejemplosLibro.map((e) => (
            <option key={e.id} value={e.id}>
              {e.titulo} ({e.referencia})
            </option>
          ))}
        </select>
        <button className="btn" onClick={() => setInicio('abierta')}>
          Inicio
        </button>
        <button className="btn" onClick={cargarAleatorio}>
          Aleatorio
        </button>
        <button className="btn" onClick={() => setVerIntegrantes(true)}>
          Integrantes
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 overflow-auto border-slate-200 bg-white lg:w-80 lg:border-r">
          <div className="flex border-b border-slate-200 text-sm" role="tablist">
            {(
              [
                ['ejecutar', 'Ejecutar'],
                ['carga', 'Carga masiva'],
              ] as const
            ).map(([id, texto]) => (
              <button
                key={id}
                role="tab"
                aria-selected={pestana === id}
                onClick={() => setPestana(id)}
                className={`flex-1 border-b-2 px-3 py-2.5 font-medium transition-colors ${
                  pestana === id ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {texto}
              </button>
            ))}
          </div>
          <div className="space-y-5 p-4">
            {pestana === 'ejecutar' ? (
              <>
                <StrategySelector
                  estrategia={estrategia}
                  grafo={grafo}
                  parametros={parametrosEfectivos}
                  validacion={validacion}
                  onCambiarEstrategia={setEstrategiaId}
                  onCambiarParametro={(clave: ClaveParametro, id: string) => setParametros((p) => ({ ...p, [clave]: id }))}
                  onEjecutar={() => ejecutar('animado')}
                  onPasoAPaso={() => ejecutar('pasos')}
                />
                {vigente && (
                  <div className="border-t border-slate-200 pt-4">
                    <StepControls
                      indice={indice}
                      total={vigente.pasos.length}
                      reproduciendo={reproduciendo}
                      velocidad={velocidad}
                      onIr={irAPaso}
                      onReproducir={setReproduciendo}
                      onVelocidad={setVelocidad}
                    />
                  </div>
                )}
                <Leyenda />
              </>
            ) : (
              <BulkLoadPanel grafo={grafoEfectivo} onCargar={alCargar} />
            )}
          </div>
        </aside>

        <section className="flex min-h-[60vh] min-w-0 flex-1 flex-col lg:min-h-0">
          <Toolbar
            dirigido={grafo.dirigido}
            dirigidoForzado={!!estrategia.forzarNoDirigido}
            puedeDeshacer={puedeDeshacer}
            hayNodos={grafo.nodos.length > 0}
            onCambiarDirigido={(d) => aplicar((g) => (g.dirigido === d ? g : { ...g, dirigido: d }))}
            onDeshacer={deshacer}
            onAutoLayout={() => canvas.current?.autoLayout()}
            onAjustar={() => canvas.current?.ajustar()}
            onLimpiar={() => {
              if (window.confirm('¿Borrar todos los nodos y aristas? (se puede deshacer)')) aplicar((g) => grafoVacio(g.dirigido))
            }}
          />
          <div className="relative min-h-0 flex-1 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
            <GraphCanvas
              ref={canvas}
              grafo={grafo}
              dirigido={grafoEfectivo.dirigido}
              paso={paso}
              bloqueado={abierto}
              onDobleClickFondo={alDobleClickFondo}
              onDobleClickNodo={alDobleClickNodo}
              onConectar={alConectar}
              onClickArista={alClickArista}
              onEliminar={(nodos, aristas) => aplicar((g) => eliminar(g, nodos, aristas))}
              onMover={(pos) => aplicar((g) => moverNodos(g, pos))}
            />
            {aviso && (
              <div className="absolute bottom-3 left-1/2 w-[min(90%,32rem)] -translate-x-1/2 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg">
                {aviso}
              </div>
            )}
          </div>
          <p className="border-t border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">
            Doble click en el lienzo: nuevo nodo · Click en un nodo y luego en otro: nueva arista · Click en una arista: editar
            peso · Doble click en un nodo: renombrar · Supr: eliminar selección · Ctrl+Z: deshacer
          </p>
        </section>

        <aside className="w-full shrink-0 overflow-auto border-slate-200 bg-white p-4 lg:w-[26rem] lg:border-l">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Resultados</h2>
          {vigente ? (
            <ResultsPanel ejecucion={vigente} indice={Math.min(indice, vigente.pasos.length - 1)} onIr={(i) => {
                setReproduciendo(false)
                irAPaso(i)
              }}
            />
          ) : (
            <div className="space-y-2 text-sm text-slate-500">
              <p>
                Elegí una estrategia y tocá <strong className="text-slate-700">Ejecutar</strong> (animado) o{' '}
                <strong className="text-slate-700">Paso a paso</strong>.
              </p>
              <p>
                Grafo actual: {grafo.nodos.length} nodos, {grafo.aristas.length} aristas
                {grafoEfectivo.dirigido ? ' (dirigido)' : ' (no dirigido)'}.
              </p>
              {ejecucion && <p className="text-amber-700">El grafo o los parámetros cambiaron: volvé a ejecutar.</p>}
            </div>
          )}
        </aside>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-500">
        <span>{NOMBRE_APP} · UTN · Investigación Operativa</span>
        <span className="font-mono">{VERSION}</span>
      </footer>

      {inicio !== 'cerrada' && (
        <PantallaInicio
          estrategiaInicial={estrategiaId}
          cerrable={inicio === 'abierta'}
          onElegir={elegirInicio}
          onCerrar={() => setInicio('cerrada')}
        />
      )}
      {dialogo}
      {verIntegrantes && <IntegrantesDialog onCerrar={() => setVerIntegrantes(false)} />}
    </div>
  )
}

function Leyenda() {
  const items = [
    ['bg-amber-400', 'Evaluado en este paso'],
    ['bg-green-600', 'Incluido en la solución'],
    ['bg-blue-600', 'Resultado final'],
    ['bg-slate-300', 'Descartado (formaría ciclo)'],
  ]
  return (
    <div className="border-t border-slate-200 pt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Colores</p>
      <ul className="space-y-1 text-xs text-slate-600">
        {items.map(([color, texto]) => (
          <li key={texto} className="flex items-center gap-2">
            <span className={`inline-block h-1.5 w-5 rounded ${color}`} />
            {texto}
          </li>
        ))}
      </ul>
    </div>
  )
}
