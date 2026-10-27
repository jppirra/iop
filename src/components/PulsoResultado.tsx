import type { Core } from 'cytoscape'
import { useEffect, useRef } from 'react'
import type { Grafo, Resultado } from '../types/graph'

// Capa sobre el lienzo: en el último paso, puntos de luz recorren las aristas del resultado
// (la ruta, el árbol en el orden en que se eligió, los arcos con flujo o la ruta crítica).

interface Tramo {
  desde: string // id de nodo
  hasta: string // id de nodo
  /** Momento (en "tramos") en que arranca dentro del ciclo. */
  inicio: number
}

interface Plan {
  tramos: Tramo[]
  /** Duración del ciclo, en tramos. */
  ciclo: number
  /** Flujo: varios puntos por arco, en continuo. */
  continuo: boolean
}

function plan(resultado: Resultado, grafo: Grafo): Plan | null {
  const porNombre = new Map(grafo.nodos.map((n) => [n.nombre, n.id]))
  const id = (nombre: string) => porNombre.get(nombre)
  const cadena = (nombres: string[]): Tramo[] => {
    const tramos: Tramo[] = []
    for (let i = 0; i + 1 < nombres.length; i++) {
      const desde = id(nombres[i])
      const hasta = id(nombres[i + 1])
      if (desde && hasta) tramos.push({ desde, hasta, inicio: i })
    }
    return tramos
  }

  switch (resultado.tipo) {
    case 'ruta': {
      if (!resultado.ruta) return null
      const tramos = cadena(resultado.ruta)
      return { tramos, ciclo: tramos.length + 1, continuo: false }
    }
    case 'proyecto': {
      const tramos = cadena(resultado.rutaCritica)
      return { tramos, ciclo: tramos.length + 1, continuo: false }
    }
    case 'arbol': {
      const tramos = resultado.aristas.flatMap((a, i) => {
        const desde = id(a.desde)
        const hasta = id(a.hasta)
        return desde && hasta ? [{ desde, hasta, inicio: i * 0.35 }] : []
      })
      return { tramos, ciclo: tramos.length * 0.35 + 1.5, continuo: false }
    }
    case 'flujo': {
      const ultima = resultado.iteraciones[resultado.iteraciones.length - 1]
      const tramos = (ultima?.arcos ?? []).flatMap((a) => {
        const desde = id(a.desde)
        const hasta = id(a.hasta)
        return a.flujo > 0 && desde && hasta ? [{ desde, hasta, inicio: 0 }] : []
      })
      return { tramos, ciclo: 1, continuo: true }
    }
  }
}

export function PulsoResultado({ cy, resultado, grafo }: { cy: () => Core | null; resultado: Resultado; grafo: Grafo }) {
  const lienzo = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = lienzo.current
    const ctx = cv?.getContext('2d')
    const datos = plan(resultado, grafo)
    if (!cv || !ctx || !datos || datos.tramos.length === 0) return
    const quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const SEG_POR_TRAMO = 0.7
    let t0: number | null = null
    let raf = 0

    const punto = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alfa: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3)
      g.addColorStop(0, `rgba(251,191,36,${alfa})`)
      g.addColorStop(1, 'rgba(251,191,36,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r * 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = `rgba(255,255,255,${alfa})`
      ctx.beginPath()
      ctx.arc(x, y, r * 0.6, 0, Math.PI * 2)
      ctx.fill()
    }

    const cuadro = (ahora: number) => {
      raf = requestAnimationFrame(cuadro)
      const core = cy()
      if (!core) return
      const W = cv.clientWidth
      const H = cv.clientHeight
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
        cv.width = Math.round(W * dpr)
        cv.height = Math.round(H * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      if (t0 === null) t0 = ahora
      const t = quieto ? 0.5 : (ahora - t0) / 1000 / SEG_POR_TRAMO
      const r = Math.max(3, Math.min(7, 5 * core.zoom()))

      for (const tramo of datos.tramos) {
        const a = core.getElementById(tramo.desde)
        const b = core.getElementById(tramo.hasta)
        if (a.empty() || b.empty()) continue
        const pa = a.renderedPosition()
        const pb = b.renderedPosition()
        const en = (u: number) => [pa.x + (pb.x - pa.x) * u, pa.y + (pb.y - pa.y) * u] as const
        if (datos.continuo) {
          for (let k = 0; k < 3; k++) {
            const [x, y] = en((t * 0.6 + k / 3) % 1)
            punto(ctx, x, y, r * 0.8, 0.9)
          }
          continue
        }
        const u = (t % datos.ciclo) - tramo.inicio
        if (u < 0 || u > 1) continue
        // Estela: un par de puntos más tenues detrás de la cabeza.
        for (let k = 2; k >= 0; k--) {
          const v = u - k * 0.06
          if (v < 0) continue
          const [x, y] = en(v)
          punto(ctx, x, y, r * (1 - k * 0.2), 1 - k * 0.3)
        }
      }
      if (quieto) cancelAnimationFrame(raf)
    }
    raf = requestAnimationFrame(cuadro)
    return () => cancelAnimationFrame(raf)
  }, [cy, resultado, grafo])

  return <canvas ref={lienzo} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
}
