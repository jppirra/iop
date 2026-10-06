import type { Core, EventObject, StylesheetJson } from 'cytoscape'
import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react'
import CytoscapeComponent from 'react-cytoscapejs'
import type { Grafo, Paso } from '../types/graph'

export interface CanvasApi {
  autoLayout: () => void
  ajustar: () => void
}

type Posiciones = Record<string, { x: number; y: number }>

interface Props {
  ref?: Ref<CanvasApi>
  grafo: Grafo
  /** Dirección con la que se dibuja (Prim/Kruskal la fuerzan a no dirigido). */
  dirigido: boolean
  /** Transiciones de color al cambiar de paso. */
  animaciones: boolean
  paso: Paso | null
  /** Mientras hay un diálogo abierto se ignoran teclas y clicks. */
  bloqueado: boolean
  onDobleClickFondo: (x: number, y: number) => void
  onDobleClickNodo: (id: string) => void
  onConectar: (origen: string, destino: string) => void
  onClickArista: (id: string) => void
  onEliminar: (nodos: string[], aristas: string[]) => void
  onMover: (posiciones: Posiciones) => void
}

const CLASES_PASO = 'actual evaluada incluida descartada resultado corte'

function estilos(dirigido: boolean, animaciones: boolean): StylesheetJson {
  const duracion = animaciones ? 350 : 0
  return [
    {
      selector: 'node',
      style: {
        'background-color': '#ffffff',
        'border-width': 2,
        'border-color': '#475569',
        label: 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': 13,
        'font-weight': 600,
        color: '#1e293b',
        width: 'data(ancho)',
        height: 34,
        shape: 'round-rectangle',
        'transition-property': 'background-color, border-color, border-width',
        'transition-duration': duracion,
        'text-wrap': 'none',
      } as never,
    },
    {
      selector: 'edge',
      style: {
        width: 2,
        'line-color': '#94a3b8',
        'target-arrow-color': '#94a3b8',
        'target-arrow-shape': dirigido ? 'triangle' : 'none',
        'arrow-scale': 1.2,
        'curve-style': 'bezier',
        label: 'data(label)',
        'font-size': 12,
        color: '#334155',
        'text-background-color': '#ffffff',
        'text-background-opacity': 1,
        'text-background-padding': '2px',
        'text-background-shape': 'roundrectangle',
        'transition-property': 'line-color, target-arrow-color, width, opacity',
        'transition-duration': duracion,
      },
    },
    { selector: 'edge.descartada', style: { 'line-color': '#cbd5e1', 'line-style': 'dotted', opacity: 0.6 } },
    {
      selector: 'edge.evaluada',
      style: { 'line-color': '#f59e0b', 'target-arrow-color': '#f59e0b', 'line-style': 'dashed', width: 3, opacity: 1 },
    },
    { selector: 'node.incluida', style: { 'background-color': '#dcfce7', 'border-color': '#16a34a' } },
    {
      selector: 'edge.incluida',
      style: { 'line-color': '#16a34a', 'target-arrow-color': '#16a34a', 'line-style': 'solid', width: 4 },
    },
    { selector: 'node.actual', style: { 'background-color': '#fef3c7', 'border-color': '#d97706', 'border-width': 4 } },
    { selector: 'node.resultado', style: { 'background-color': '#dbeafe', 'border-color': '#2563eb', 'border-width': 3 } },
    {
      selector: 'edge.resultado',
      style: { 'line-color': '#2563eb', 'target-arrow-color': '#2563eb', 'line-style': 'solid', width: 5 },
    },
    {
      selector: 'edge.corte',
      style: { 'line-color': '#dc2626', 'target-arrow-color': '#dc2626', 'line-style': 'dashed', width: 5, opacity: 1 },
    },
    { selector: 'node.origen', style: { 'border-color': '#0d9488', 'border-width': 4, 'border-style': 'double' } },
    { selector: ':selected', style: { 'overlay-color': '#0ea5e9', 'overlay-opacity': 0.25, 'overlay-padding': 6 } },
  ]
}

export function GraphCanvas(props: Props) {
  const { ref, grafo, dirigido, animaciones, paso } = props
  const cyRef = useRef<Core | null>(null)
  const origenRef = useRef<string | null>(null)
  const [origenPendiente, setOrigenPendiente] = useState<string | null>(null)
  // Los eventos de Cytoscape se registran una sola vez: leen siempre las props más recientes.
  const propsRef = useRef(props)
  propsRef.current = props

  const elementos = useMemo(
    () => [
      ...grafo.nodos.map((n) => ({ data: { id: n.id, label: n.nombre, ancho: Math.max(34, n.nombre.length * 8 + 18) }, position: { x: n.x, y: n.y } })),
      ...grafo.aristas.map((a) => ({ data: { id: a.id, source: a.origen, target: a.destino, label: String(a.peso), peso: String(a.peso) } })),
    ],
    [grafo],
  )
  const hojaEstilos = useMemo(() => estilos(dirigido, animaciones), [dirigido, animaciones])

  const elegirOrigen = (id: string | null) => {
    const cy = cyRef.current
    if (origenRef.current) cy?.getElementById(origenRef.current).removeClass('origen')
    origenRef.current = id
    if (id) cy?.getElementById(id).addClass('origen')
    setOrigenPendiente(id)
  }
  const elegirOrigenRef = useRef(elegirOrigen)
  elegirOrigenRef.current = elegirOrigen

  const registrar = (cy: Core) => {
    cy.on('tap', 'node', (e: EventObject) => {
      if (propsRef.current.bloqueado) return
      const id = e.target.id()
      const origen = origenRef.current
      if (origen && origen !== id && cy.getElementById(origen).nonempty()) {
        elegirOrigenRef.current(null)
        propsRef.current.onConectar(origen, id)
      } else if (origen === id) elegirOrigenRef.current(null)
      else elegirOrigenRef.current(id)
    })
    cy.on('tap', 'edge', (e: EventObject) => {
      if (propsRef.current.bloqueado) return
      elegirOrigenRef.current(null)
      propsRef.current.onClickArista(e.target.id())
    })
    cy.on('tap', (e: EventObject) => {
      if (e.target === cy) elegirOrigenRef.current(null)
    })
    cy.on('dbltap', (e: EventObject) => {
      if (propsRef.current.bloqueado) return
      if (e.target === cy) propsRef.current.onDobleClickFondo(e.position.x, e.position.y)
      else if (e.target.isNode()) {
        elegirOrigenRef.current(null)
        propsRef.current.onDobleClickNodo(e.target.id())
      }
    })
    cy.on('dragfree', 'node', () => {
      const posiciones: Posiciones = {}
      cy.nodes().forEach((n) => {
        posiciones[n.id()] = { ...n.position() }
      })
      propsRef.current.onMover(posiciones)
    })
  }

  // Teclado: Supr elimina lo seleccionado, Esc cancela la arista en curso.
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      const destino = e.target as HTMLElement
      if (propsRef.current.bloqueado || destino.closest('input, textarea, select, [contenteditable]')) return
      const cy = cyRef.current
      if (!cy) return
      if (e.key === 'Escape') elegirOrigenRef.current(null)
      if (e.key === 'Delete') {
        const seleccion = cy.$(':selected')
        if (seleccion.empty()) return
        elegirOrigenRef.current(null)
        propsRef.current.onEliminar(seleccion.nodes().map((n) => n.id()), seleccion.edges().map((a) => a.id()))
      }
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [])

  // Resaltado del paso actual.
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.batch(() => {
      cy.elements().removeClass(CLASES_PASO)
      // Durante un paso la arista puede mostrar otro texto (flujo/capacidad) en lugar del peso.
      cy.edges().forEach((a) => {
        a.data('label', paso?.etiquetasAristas?.[a.id()] ?? a.data('peso'))
      })
      if (!paso) return
      const marcar = (ids: string[] | undefined, clase: string) =>
        ids?.forEach((id) => cy.getElementById(id).addClass(clase))
      marcar(paso.nodosIncluidos, 'incluida')
      marcar(paso.aristasIncluidas, 'incluida')
      marcar(paso.aristasDescartadas, 'descartada')
      marcar(paso.aristasEvaluadas, 'evaluada')
      marcar(paso.nodosActuales, 'actual')
      marcar(paso.aristasResultado, 'resultado')
      marcar(paso.aristasCorte, 'corte')
      paso.aristasResultado?.forEach((id) => cy.getElementById(id).connectedNodes().addClass('resultado'))
    })
  }, [paso, elementos])

  // Si se borra el nodo origen pendiente, se cancela la arista en curso.
  useEffect(() => {
    if (origenRef.current && !grafo.nodos.some((n) => n.id === origenRef.current)) elegirOrigenRef.current(null)
  }, [grafo])

  useImperativeHandle(ref, () => ({
    ajustar() {
      const cy = cyRef.current
      if (!cy || cy.nodes().empty()) return
      cy.fit(undefined, 50)
      if (cy.zoom() > 1.4) {
        cy.zoom(1.4)
        cy.center()
      }
    },
    autoLayout() {
      const cy = cyRef.current
      if (!cy || cy.nodes().empty()) return
      const layout = cy.layout({
        name: cy.edges().empty() ? 'grid' : 'cose',
        animate: false,
        padding: 50,
        randomize: true,
        nodeRepulsion: () => 12000,
        idealEdgeLength: () => 110,
      } as never)
      layout.one('layoutstop', () => {
        const posiciones: Posiciones = {}
        cy.nodes().forEach((n) => {
          posiciones[n.id()] = { ...n.position() }
        })
        propsRef.current.onMover(posiciones)
        cy.fit(undefined, 50)
      })
      layout.run()
    },
  }))

  const nombreOrigen = origenPendiente ? grafo.nodos.find((n) => n.id === origenPendiente)?.nombre : null

  return (
    <div className="relative h-full w-full">
      <CytoscapeComponent
        elements={elementos}
        stylesheet={hojaEstilos}
        layout={{ name: 'preset' }}
        minZoom={0.2}
        maxZoom={3}
        className="h-full w-full"
        cy={(cy) => {
          if (cyRef.current !== cy) {
            cyRef.current = cy
            registrar(cy)
          }
        }}
      />
      {grafo.nodos.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-400">
          Doble click en el lienzo para agregar un nodo, o cargá un ejemplo del libro.
        </div>
      )}
      {nombreOrigen && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-teal-700 px-3 py-1 text-xs font-medium text-white shadow">
          Origen: {nombreOrigen} · click en el nodo destino (Esc cancela)
        </div>
      )}
    </div>
  )
}
