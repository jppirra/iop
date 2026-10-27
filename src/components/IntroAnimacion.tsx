import { useCallback, useEffect, useRef, useState } from 'react'
import { integrantes, NOMBRE_APP } from '../examples/integrantes'

// Animación de entrada: partículas que se juntan y forman un grafo, se dibujan las aristas,
// un pulso recorre la ruta más corta y se escriben el título y los integrantes.
// Se ve una sola vez por sesión del navegador; ?intro la fuerza.

const CLAVE_VISTA = 'iop-intro-vista'
const DURACION = 6.2 // segundos hasta cerrarse sola

// Grafo de la animación en coordenadas normalizadas (-1..1).
const NODOS: [number, number][] = [
  [-1, 0.05],
  [-0.5, -0.6],
  [-0.45, 0.55],
  [0.05, -0.15],
  [0.15, 0.7],
  [0.55, -0.65],
  [0.6, 0.25],
  [1, -0.05],
]
const ARISTAS: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [1, 5], [3, 5], [3, 6], [4, 6], [5, 7], [6, 7],
]
const RUTA = [0, 2, 3, 6, 7] // ruta que recorre el pulso

const FONDO = '4,47,46' // teal-950
const TEAL = '45,212,191' // teal-400
const AMBAR = '251,191,36' // amber-400

export function debeMostrarIntro(): boolean {
  if (typeof window === 'undefined') return false
  if (new URLSearchParams(window.location.search).has('intro')) return true
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  try {
    return sessionStorage.getItem(CLAVE_VISTA) === null
  } catch {
    return true
  }
}

interface Particula {
  x0: number
  y0: number
  tx: number
  ty: number
  retraso: number
  ambar: boolean
}

function punto(i: number): [number, number] {
  return NODOS[i]
}

function crearParticulas(): Particula[] {
  const destinos: [number, number][] = []
  // Puntos a lo largo de cada arista y un anillo por nodo.
  for (const [a, b] of ARISTAS) {
    const [ax, ay] = punto(a)
    const [bx, by] = punto(b)
    for (let k = 1; k < 12; k++) destinos.push([ax + ((bx - ax) * k) / 12, ay + ((by - ay) * k) / 12])
  }
  for (const [x, y] of NODOS) {
    for (let k = 0; k < 14; k++) {
      const ang = (k / 14) * Math.PI * 2
      destinos.push([x + Math.cos(ang) * 0.07, y + Math.sin(ang) * 0.07])
    }
  }
  return destinos.map(([tx, ty], i) => ({
    x0: Math.random(),
    y0: Math.random(),
    tx,
    ty,
    retraso: Math.random() * 0.45,
    ambar: i % 9 === 0,
  }))
}

export function IntroAnimacion({ onTerminar }: { onTerminar: () => void }) {
  const lienzo = useRef<HTMLCanvasElement>(null)
  const [saliendo, setSaliendo] = useState(false)
  const [t, setT] = useState(0)
  const terminado = useRef(false)

  const terminar = useCallback(() => {
    if (terminado.current) return
    terminado.current = true
    try {
      sessionStorage.setItem(CLAVE_VISTA, '1')
    } catch {
      /* sin almacenamiento: se vuelve a ver la próxima vez */
    }
    setSaliendo(true)
    window.setTimeout(onTerminar, 600)
  }, [onTerminar])

  useEffect(() => {
    const cv = lienzo.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const particulas = crearParticulas()
    let W = 0
    let H = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const medir = () => {
      W = cv.clientWidth
      H = cv.clientHeight
      cv.width = W * dpr
      cv.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    medir()
    window.addEventListener('resize', medir)

    let t0: number | null = null
    let ultimoTexto = -1
    let raf = 0
    const cuadro = (ahora: number) => {
      if (t0 === null) t0 = ahora
      const seg = (ahora - t0) / 1000
      const escala = Math.min(W * 0.36, H * 0.24)
      const cx = W / 2
      const cy = H * 0.34
      const px = (x: number) => cx + x * escala
      const py = (y: number) => cy + y * escala

      ctx.fillStyle = `rgba(${FONDO},0.35)`
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = `rgba(${TEAL},0.10)`
      for (let gx = 20; gx < W; gx += 32) for (let gy = 20; gy < H; gy += 32) ctx.fillRect(gx, gy, 1.2, 1.2)

      // 1. Partículas que convergen al grafo.
      for (const p of particulas) {
        const u = Math.max(0, Math.min(1, (seg - p.retraso) / 1.4))
        const e = 1 - Math.pow(1 - u, 3)
        const x = p.x0 * W * (1 - e) + px(p.tx) * e
        const y = p.y0 * H * (1 - e) + py(p.ty) * e
        ctx.fillStyle = `rgba(${p.ambar ? AMBAR : TEAL},${0.3 + 0.6 * e})`
        ctx.fillRect(x - 1.4, y - 1.4, 2.8, 2.8)
      }

      // 2. Aristas y nodos sólidos.
      const solido = Math.max(0, Math.min(1, (seg - 1.6) / 0.6))
      if (solido > 0) {
        ctx.lineWidth = 2
        ctx.strokeStyle = `rgba(${TEAL},${0.55 * solido})`
        for (const [a, b] of ARISTAS) {
          ctx.beginPath()
          ctx.moveTo(px(punto(a)[0]), py(punto(a)[1]))
          ctx.lineTo(px(punto(b)[0]), py(punto(b)[1]))
          ctx.stroke()
        }
      }

      // 3. Pulso por la ruta más corta.
      const avance = Math.max(0, Math.min(1, (seg - 2.2) / 1.6))
      if (avance > 0) {
        const tramos = RUTA.length - 1
        const f = avance * tramos
        const hasta = Math.min(tramos - 1, Math.floor(f))
        ctx.lineWidth = 3.5
        ctx.strokeStyle = `rgba(${AMBAR},0.95)`
        ctx.shadowColor = `rgba(${AMBAR},0.8)`
        ctx.shadowBlur = 12
        ctx.beginPath()
        ctx.moveTo(px(punto(RUTA[0])[0]), py(punto(RUTA[0])[1]))
        for (let i = 1; i <= hasta; i++) ctx.lineTo(px(punto(RUTA[i])[0]), py(punto(RUTA[i])[1]))
        const [ax, ay] = punto(RUTA[hasta])
        const [bx, by] = punto(RUTA[hasta + 1])
        const r = Math.min(1, f - hasta)
        const hx = px(ax + (bx - ax) * r)
        const hy = py(ay + (by - ay) * r)
        ctx.lineTo(hx, hy)
        ctx.stroke()
        if (avance < 1) {
          ctx.fillStyle = '#fff'
          ctx.beginPath()
          ctx.arc(hx, hy, 4, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.shadowBlur = 0
      }

      if (solido > 0) {
        NODOS.forEach(([x, y], i) => {
          const enRuta = avance > 0 && RUTA.slice(0, Math.ceil(avance * (RUTA.length - 1)) + 1).includes(i)
          ctx.fillStyle = enRuta ? `rgba(${AMBAR},${solido})` : `rgba(${FONDO},${solido})`
          ctx.strokeStyle = `rgba(${enRuta ? AMBAR : TEAL},${solido})`
          ctx.lineWidth = 2.5
          ctx.beginPath()
          ctx.arc(px(x), py(y), escala * 0.07, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        })
      }

      // 4. Línea de escaneo.
      const sy = ((seg * 0.55) % 1) * H
      const gr = ctx.createLinearGradient(0, sy - 60, 0, sy)
      gr.addColorStop(0, `rgba(${AMBAR},0)`)
      gr.addColorStop(1, `rgba(${AMBAR},0.12)`)
      ctx.fillStyle = gr
      ctx.fillRect(0, sy - 60, W, 60)
      ctx.fillStyle = `rgba(${AMBAR},0.55)`
      ctx.fillRect(0, sy, W, 1.2)

      // El texto se actualiza en pasos de 50 ms para no re-renderizar en cada cuadro.
      const paso = Math.floor(seg * 20)
      if (paso !== ultimoTexto) {
        ultimoTexto = paso
        setT(seg)
      }
      if (seg > DURACION) terminar()
      else raf = requestAnimationFrame(cuadro)
    }
    raf = requestAnimationFrame(cuadro)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', medir)
    }
  }, [terminar])

  useEffect(() => {
    const alPresionar = () => terminar()
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [terminar])

  const linea = 'Investigación Operativa · Modelos de redes'
  const letras = Math.max(0, Math.min(linea.length, Math.floor((t - 1.2) * 30)))
  const aparece = (desde: number) => ({
    opacity: Math.max(0, Math.min(1, (t - desde) / 0.5)),
    transform: `translateY(${Math.max(0, 1 - (t - desde) / 0.5) * 14}px)`,
  })

  return (
    <div
      className={`fixed inset-0 z-[100] cursor-pointer overflow-hidden bg-teal-950 transition-opacity duration-500 ${saliendo ? 'opacity-0' : 'opacity-100'}`}
      onClick={terminar}
      role="presentation"
      aria-label="Animación de presentación"
    >
      <canvas ref={lienzo} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-[60%] flex flex-col items-center px-4 text-center">
        <p className="min-h-5 font-mono text-xs uppercase tracking-[0.2em] text-amber-400 sm:text-sm">
          {linea.slice(0, letras)}
          <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-amber-400 align-[-2px]" />
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-6xl" style={aparece(2.6)}>
          IOP 2026 <span className="text-teal-400">·</span> Grupo 3
        </h1>
        <ul className="mt-5 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-1 text-sm text-teal-100/80 sm:grid-cols-3">
          {integrantes.map((i, k) => (
            <li key={i.legajo} style={aparece(3.3 + k * 0.15)}>
              {i.nombre} <span className="text-teal-400/60">· {i.legajo}</span>
            </li>
          ))}
        </ul>
        <span className="sr-only">{NOMBRE_APP}</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          terminar()
        }}
        className="absolute right-4 bottom-4 rounded-md border border-white/25 px-3 py-2 font-mono text-xs uppercase tracking-wider text-teal-100 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber-400"
      >
        Saltar intro
      </button>
    </div>
  )
}
