import { createContext, useContext, useEffect, useRef, useState } from 'react'

// Efectos de /presentacion. Cada uno se puede apagar desde /config.

const quieto = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Si los números cuentan hacia arriba (config.conteoNumeros). */
export const ConteoActivo = createContext(false)

/**
 * Texto cuyos números cuentan desde 0 al montarse ("Ruta 1-2-3, distancia 32" anima solo los números
 * que no forman parte de un nombre de nodo: los que van después de un espacio o al principio).
 * Respeta los decimales con coma ("3,11", "71,5 %").
 */
export function NumerosAnimados({ texto }: { texto: string }) {
  const activo = useContext(ConteoActivo) && !quieto()
  const [avance, setAvance] = useState(activo ? 0 : 1)

  useEffect(() => {
    if (!activo) return
    let raf = 0
    let t0: number | null = null
    const paso = (ahora: number) => {
      if (t0 === null) t0 = ahora
      const u = Math.min(1, (ahora - t0) / 1100)
      setAvance(1 - Math.pow(1 - u, 3))
      if (u < 1) raf = requestAnimationFrame(paso)
    }
    const espera = window.setTimeout(() => (raf = requestAnimationFrame(paso)), 300)
    return () => {
      window.clearTimeout(espera)
      cancelAnimationFrame(raf)
    }
  }, [activo, texto])

  if (avance >= 1) return <>{texto}</>
  return (
    <>
      {texto.replace(/(^|[\s(])(\d+(?:[.,]\d+)?)(?=[\s,.%)]|$)/g, (_, antes: string, numero: string) => {
        const decimales = numero.includes(',') ? numero.split(',')[1].length : 0
        const valor = parseFloat(numero.replace(',', '.')) * avance
        return antes + valor.toFixed(decimales).replace('.', ',')
      })}
    </>
  )
}

/** Red de nodos que se mueve sola y se acerca al puntero. Va detrás del contenido (portada y cierre). */
export function FondoRed() {
  const lienzo = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = lienzo.current
    const ctx = cv?.getContext('2d')
    const zona = cv?.parentElement
    if (!cv || !ctx || !zona) return
    const W = 1200
    const H = 700
    cv.width = W
    cv.height = H
    const puntos = Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      grande: Math.random() < 0.15,
    }))
    const mouse = { x: -999, y: -999 }
    const mover = (e: MouseEvent) => {
      const b = zona.getBoundingClientRect()
      mouse.x = ((e.clientX - b.left) / b.width) * W
      mouse.y = ((e.clientY - b.top) / b.height) * H
    }
    const salir = () => {
      mouse.x = mouse.y = -999
    }
    zona.addEventListener('mousemove', mover)
    zona.addEventListener('mouseleave', salir)
    const fijo = quieto()
    let raf = 0
    const dibujar = () => {
      ctx.clearRect(0, 0, W, H)
      for (let i = 0; i < puntos.length; i++) {
        const p = puntos[i]
        if (!fijo) {
          p.x += p.vx
          p.y += p.vy
          if (p.x < 0 || p.x > W) p.vx *= -1
          if (p.y < 0 || p.y > H) p.vy *= -1
          const d = Math.hypot(mouse.x - p.x, mouse.y - p.y)
          if (d < 180) {
            p.x += (mouse.x - p.x) * 0.004
            p.y += (mouse.y - p.y) * 0.004
          }
        }
        for (let j = i + 1; j < puntos.length; j++) {
          const q = puntos[j]
          const d = Math.hypot(p.x - q.x, p.y - q.y)
          if (d < 150) {
            ctx.strokeStyle = `rgba(13,148,136,${(1 - d / 150) * 0.22})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(q.x, q.y)
            ctx.stroke()
          }
        }
        const dm = Math.hypot(mouse.x - p.x, mouse.y - p.y)
        if (dm < 180) {
          ctx.strokeStyle = `rgba(245,158,11,${(1 - dm / 180) * 0.6})`
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(mouse.x, mouse.y)
          ctx.stroke()
        }
        ctx.fillStyle = p.grande ? 'rgba(245,158,11,0.85)' : 'rgba(13,148,136,0.4)'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.grande ? 2.8 : 1.8, 0, Math.PI * 2)
        ctx.fill()
      }
      if (!fijo) raf = requestAnimationFrame(dibujar)
    }
    dibujar()
    return () => {
      cancelAnimationFrame(raf)
      zona.removeEventListener('mousemove', mover)
      zona.removeEventListener('mouseleave', salir)
    }
  }, [])

  return <canvas ref={lienzo} className="pointer-events-none absolute inset-0 h-full w-full print:hidden" aria-hidden="true" />
}

/** Índice de diapositivas: grilla para saltar a cualquiera. */
export function Indice({
  titulos,
  actual,
  onIr,
  onCerrar,
}: {
  titulos: string[]
  actual: number
  onIr: (i: number) => void
  onCerrar: () => void
}) {
  const actualRef = useRef<HTMLButtonElement>(null)
  useEffect(() => actualRef.current?.focus(), [])

  return (
    <div
      role="dialog"
      aria-label="Índice de diapositivas"
      className="fixed inset-0 z-50 overflow-auto bg-teal-950/95 p-6 sm:p-12 print:hidden"
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-white">Índice · tocá una diapositiva para ir</h2>
          <button onClick={onCerrar} className="rounded-md px-3 py-1 text-teal-100 hover:bg-white/10" aria-label="Cerrar índice">
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {titulos.map((t, i) => (
            <button
              key={t}
              ref={i === actual ? actualRef : undefined}
              onClick={() => {
                onIr(i)
                onCerrar()
              }}
              className={`flex min-h-24 flex-col gap-1 rounded-xl border-t-4 bg-white p-4 text-left transition hover:-translate-y-0.5 ${
                i === actual ? 'border-amber-400 outline-4 outline-amber-400' : 'border-teal-600'
              }`}
            >
              <span className="font-mono text-lg font-bold text-amber-600">{String(i + 1).padStart(2, '0')}</span>
              <span className="font-semibold leading-snug text-teal-900">{t}</span>
            </button>
          ))}
        </div>
        <p className="mt-5 text-sm text-teal-100/70">O o Esc cierra · 1 a 9 salta directo a esa diapositiva</p>
      </div>
    </div>
  )
}
