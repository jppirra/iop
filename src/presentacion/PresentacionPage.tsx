import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { NOMBRE_APP, SUBTITULO_APP, VERSION, integrantes } from '../examples/integrantes'

/**
 * Quién presenta cada modelo. Es un reparto inicial en el orden de la lista de integrantes:
 * para cambiarlo alcanza con mover los nombres acá.
 */
const PRESENTADORES: Record<string, string> = {
  prim: 'Junco Paola',
  kruskal: 'Hernandez Lucas Adriel',
  dijkstra: 'Moreno Pablo',
  'ford-fulkerson': 'Pirra Juan Pablo',
  cpm: 'Schneider Christian',
  pert: 'Vanzo David',
}

interface Modelo {
  id: string
  nombre: string
  grupo: string
  problema: string
  pasos: string[]
  enLaApp: string[]
  ejemplo: { titulo: string; resultado: string }
  /** Algo para comentar aparte en la presentación (por ejemplo, una decisión acordada con la cátedra). */
  nota?: { titulo: string; texto: string }
  /** Links directos a la app: abren el algoritmo con el ejemplo ya cargado. */
  links: { texto: string; url: string }[]
}

const MODELOS: Modelo[] = [
  {
    id: 'prim',
    nombre: 'Prim',
    grupo: 'Árbol de expansión mínima',
    problema: 'Conectar todos los nodos de una red con la menor distancia (o costo) total, sin ciclos.',
    pasos: [
      'Se arranca desde un nodo inicial: queda "conectado".',
      'Se elige la arista más corta que une un nodo conectado con uno que todavía no lo está.',
      'Ese nodo pasa a estar conectado. Se repite hasta conectar todos (n − 1 aristas).',
    ],
    enLaApp: [
      'Parámetro: nodo inicial. El grafo se trata siempre como no dirigido.',
      'Muestra, en orden, qué arista se eligió y cuáles se descartaron.',
      'Avisa empates, soluciones óptimas múltiples y grafos no conexos.',
    ],
    ejemplo: { titulo: 'Lauderdale Construction (Fig. 11.1)', resultado: 'Distancia total 16 (cientos de pies) para 8 casas.' },
    links: [{ texto: 'Abrir Prim con Lauderdale', url: '/?algoritmo=prim&ejemplo=lauderdale' }],
  },
  {
    id: 'kruskal',
    nombre: 'Kruskal',
    grupo: 'Árbol de expansión mínima',
    problema: 'El mismo problema que Prim, resuelto por otro camino: mirando las aristas en lugar de los nodos.',
    pasos: [
      'Se ordenan todas las aristas de menor a mayor peso.',
      'Se toma la siguiente: si une dos partes todavía separadas, se agrega; si forma un ciclo, se descarta.',
      'Se termina al tener n − 1 aristas.',
    ],
    enLaApp: [
      'No pide parámetros: no depende de un nodo inicial.',
      'Muestra cada arista evaluada y por qué entra o se descarta.',
      'Sobre el mismo grafo da la misma distancia total que Prim (los tests lo comprueban).',
    ],
    ejemplo: { titulo: 'Lauderdale Construction (Fig. 11.1)', resultado: 'Distancia total 16, igual que Prim.' },
    links: [{ texto: 'Abrir Kruskal con Lauderdale', url: '/?algoritmo=kruskal&ejemplo=lauderdale' }],
  },
  {
    id: 'dijkstra',
    nombre: 'Dijkstra',
    grupo: 'Ruta más corta',
    problema: 'Encontrar el camino de menor distancia entre un nodo origen y un nodo destino.',
    pasos: [
      'El origen tiene distancia 0; el resto, infinito.',
      'Se fija el nodo no fijado más cercano al origen.',
      'Se actualizan las distancias de sus vecinos si pasando por él se llega más rápido. Se repite.',
    ],
    enLaApp: [
      'Parámetros: origen y destino. Respeta si el grafo es dirigido o no.',
      'Tabla de etiquetas por iteración, como en el libro, y la ruta resaltada.',
      'Bloquea pesos negativos y avisa si no hay ruta.',
    ],
    ejemplo: { titulo: 'Leadville → Dillon (Fig. 11.19)', resultado: 'Ruta 1-2-3-6-7, distancia 32.' },
    links: [
      { texto: 'Abrir Dijkstra con Leadville', url: '/?algoritmo=dijkstra&ejemplo=leadville' },
      { texto: 'Abrir Dijkstra con Ray Design', url: '/?algoritmo=dijkstra&ejemplo=ray-design' },
    ],
  },
  {
    id: 'ford-fulkerson',
    nombre: 'Ford-Fulkerson',
    grupo: 'Flujo máximo',
    problema: 'Cuánto es lo máximo que puede pasar de una fuente a un sumidero, si cada arco tiene una capacidad.',
    pasos: [
      'Se busca un camino de aumento: de la fuente al sumidero con capacidad sobrante en cada arco.',
      'Se envía por él el mínimo de esas capacidades sobrantes.',
      'Los arcos inversos permiten deshacer flujo mal asignado. Se repite hasta que no haya caminos.',
    ],
    enLaApp: [
      'Parámetros: fuente y sumidero. Cada arco muestra flujo/capacidad.',
      'Lista los caminos de aumento y cuánto aportó cada uno.',
      'Muestra el corte mínimo, que coincide con el flujo máximo.',
    ],
    ejemplo: { titulo: 'Red de transmisión (apunte)', resultado: 'Flujo máximo 8 + 10 = 18 Mbps, igual al corte mínimo.' },
    links: [{ texto: 'Abrir Ford-Fulkerson con la red', url: '/?algoritmo=ford-fulkerson&ejemplo=red-transmision' }],
  },
  {
    id: 'cpm',
    nombre: 'CPM',
    grupo: 'Administración de proyectos',
    problema: 'Cuánto dura un proyecto y qué actividades no se pueden atrasar sin atrasar todo.',
    pasos: [
      'Cada arco es una actividad y su peso, la duración; cada nodo, un evento.',
      'Ida: tiempos más tempranos de inicio y fin (IC, TC).',
      'Vuelta: tiempos más tardíos (IL, TL). Holgura = IL − IC; las de holgura 0 forman la ruta crítica.',
    ],
    enLaApp: [
      'El grafo se trata siempre como dirigido y se valida que no tenga ciclos.',
      'Tabla con tiempos y holgura de cada actividad.',
      'Resalta la ruta crítica (o las rutas, si hay más de una).',
      'Actividades paralelas (mismo inicio y fin): con un nombre cada una, la app agrega sola el evento intermedio y la ficticia de duración 0.',
    ],
    ejemplo: { titulo: 'General Foundry (Render, cap. 12)', resultado: '15 semanas. Ruta crítica A-C-E-G-H.' },
    nota: {
      titulo: 'Convención acordada con la cátedra',
      texto:
        'Usamos actividad en el arco: cada arco es una actividad y cada nodo, un evento (en General Foundry, la actividad C es el arco 2 → 4). Se lo consultamos a las profesoras: se aceptan las dos convenciones, en el arco o en el nodo, y los casos de prueba los van a dar en nuestro formato de carga masiva.',
    },
    links: [{ texto: 'Abrir CPM con General Foundry', url: '/?algoritmo=cpm&ejemplo=general-foundry-cpm' }],
  },
  {
    id: 'pert',
    nombre: 'PERT',
    grupo: 'Administración de proyectos',
    problema: 'Lo mismo que CPM, pero con duraciones inciertas: optimista (a), más probable (m) y pesimista (b).',
    pasos: [
      'Tiempo esperado de cada actividad: t = (a + 4m + b) / 6. Varianza: ((b − a) / 6)².',
      'Con los tiempos esperados se hace el mismo cálculo que CPM.',
      'Varianza del proyecto = suma de las varianzas de la ruta crítica. Z = (plazo − duración) / σ.',
    ],
    enLaApp: [
      'Cada arco acepta los tres tiempos (ej: 1 2 3).',
      'Tabla con tiempo esperado y varianza de cada actividad.',
      'Se escribe un plazo y calcula la probabilidad de cumplirlo.',
    ],
    ejemplo: {
      titulo: 'General Foundry (Render, cap. 12)',
      resultado: '15 semanas esperadas, varianza 3,11. P(terminar en 16 semanas) ≈ 71,5 %.',
    },
    nota: {
      titulo: 'Convención acordada con la cátedra',
      texto:
        'La misma que CPM: actividad en el arco, con los tres tiempos en cada arco. La cátedra acepta esta convención y va a dar los casos de prueba en nuestro formato de carga masiva.',
    },
    links: [{ texto: 'Abrir PERT con General Foundry', url: '/?algoritmo=pert&ejemplo=general-foundry-pert' }],
  },
]

// ---------- Piezas de las diapositivas ----------

function Titulo({ antetitulo, children }: { antetitulo?: string; children: ReactNode }) {
  return (
    <header className="mb-6 sm:mb-8">
      {antetitulo && <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">{antetitulo}</p>}
      <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">{children}</h2>
    </header>
  )
}

function Tarjeta({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <h3 className="mb-2 font-semibold text-teal-800">{titulo}</h3>
      <div className="text-slate-700">{children}</div>
    </div>
  )
}

function Lista({ items, numerada = false }: { items: string[]; numerada?: boolean }) {
  const Etiqueta = numerada ? 'ol' : 'ul'
  return (
    <Etiqueta className={`space-y-2 pl-5 ${numerada ? 'list-decimal' : 'list-disc'} marker:text-teal-600`}>
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </Etiqueta>
  )
}

function LinkApp({ url, children }: { url: string; children: ReactNode }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="btn btn-primario">
      {children} ↗
    </a>
  )
}

// ---------- Diapositivas ----------

function Portada() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <img src="/logo-utn.png" alt="UTN" className="mb-6 h-20 w-auto" />
      <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">Investigación Operativa · {SUBTITULO_APP}</p>
      <h1 className="mt-2 text-4xl font-bold text-teal-800 sm:text-6xl">{NOMBRE_APP}</h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-600 sm:text-xl">
        Una app web para armar redes, ejecutar los seis algoritmos de la materia y ver cada decisión que toman, paso a paso.
      </p>
      <ul className="mt-8 grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-slate-600 sm:grid-cols-3">
        {integrantes.map((i) => (
          <li key={i.legajo}>
            {i.nombre} <span className="text-slate-400">· {i.legajo}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function QueEs() {
  return (
    <>
      <Titulo antetitulo="Introducción">Qué es la app</Titulo>
      <div className="grid gap-4 md:grid-cols-3">
        <Tarjeta titulo="1 · Armar el grafo">
          A mano (doble click para crear nodos, arrastrar para conectar), por carga masiva en texto, CSV o JSON, al azar,
          o cargando un ejemplo resuelto del libro.
        </Tarjeta>
        <Tarjeta titulo="2 · Elegir y ejecutar">
          Se elige uno de los seis algoritmos y sus parámetros. La app valida antes de ejecutar: pesos negativos, ciclos,
          nodos sin conexión.
        </Tarjeta>
        <Tarjeta titulo="3 · Entender el resultado">
          Animado o paso a paso: cada paso explica qué decidió el algoritmo y lo resalta sobre el grafo, con las tablas del
          libro al lado.
        </Tarjeta>
      </div>
      <table className="mt-6 w-full text-left text-sm sm:text-base">
        <thead className="border-b-2 border-teal-600 text-teal-900">
          <tr>
            <th className="py-2 pr-4">Problema</th>
            <th className="py-2">Modelos</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-slate-700">
          <tr><td className="py-2 pr-4">Árbol de expansión mínima</td><td>Prim · Kruskal</td></tr>
          <tr><td className="py-2 pr-4">Ruta más corta</td><td>Dijkstra</td></tr>
          <tr><td className="py-2 pr-4">Flujo máximo</td><td>Ford-Fulkerson</td></tr>
          <tr><td className="py-2 pr-4">Administración de proyectos</td><td>CPM · PERT</td></tr>
        </tbody>
      </table>
    </>
  )
}

function ComoEstaHecha() {
  const stack = [
    ['React 19 + TypeScript', 'Interfaz y tipado de todo el dominio'],
    ['Vite', 'Compilación y servidor de desarrollo'],
    ['Cytoscape', 'Dibujo e interacción con el grafo'],
    ['Tailwind CSS', 'Estilos'],
    ['Vitest', 'Tests de algoritmos, parsers y configuración'],
    ['Vercel', 'Publicación como sitio estático'],
  ]
  return (
    <>
      <Titulo antetitulo="Cómo está hecha">Tecnologías</Titulo>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stack.map(([nombre, para]) => (
          <div key={nombre} className="rounded-xl border border-slate-200 p-4">
            <p className="font-semibold text-slate-900">{nombre}</p>
            <p className="text-sm text-slate-600">{para}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 rounded-xl bg-teal-50 p-4 text-teal-900">
        <strong>Sin backend ni base de datos:</strong> todo corre en el navegador. El grafo vive en memoria, con historial para
        deshacer (Ctrl+Z), y se puede exportar e importar como JSON o CSV.
      </p>
    </>
  )
}

function Arquitectura() {
  const caja = 'rounded-lg border-2 border-teal-600 bg-white px-3 py-2 text-center text-sm font-medium text-slate-800'
  const flecha = <span className="text-center text-2xl text-teal-600">→</span>
  return (
    <>
      <Titulo antetitulo="Cómo está hecha">Arquitectura</Titulo>
      <div className="mb-6 grid items-center gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <div className={caja}>Grafo + parámetros</div>
        {flecha}
        <div className={caja}>
          estrategia.validar()
          <br />
          estrategia.ejecutar()
        </div>
        {flecha}
        <div className={caja}>
          {'{ pasos, resultado }'}
          <br />
          <span className="text-xs text-slate-500">lienzo · panel de resultados</span>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Tarjeta titulo="Algoritmos como funciones puras">
          Cada uno vive en su archivo (<code>src/algorithms</code>), no toca React y devuelve la lista completa de pasos más
          el resultado. Por eso se pueden probar sin abrir la interfaz.
        </Tarjeta>
        <Tarjeta titulo="Se calcula todo de una vez">
          La animación y los botones Anterior / Siguiente solo mueven un índice sobre la lista de pasos: nunca se vuelve a
          ejecutar el algoritmo.
        </Tarjeta>
        <Tarjeta titulo="Patrón estrategia, con registro automático">
          Todos los algoritmos cumplen la misma interfaz. Agregar uno nuevo es crear un archivo: el selector, la validación y
          el paso a paso lo toman solos.
        </Tarjeta>
        <Tarjeta titulo="Un solo modelo de grafo">
          Nodos y aristas en dos listas. El peso se lee según el algoritmo: distancia, capacidad o duración. PERT agrega los
          tiempos optimista y pesimista.
        </Tarjeta>
      </div>
    </>
  )
}

function Verificacion() {
  return (
    <>
      <Titulo antetitulo="Cómo está hecha">¿Cómo sabemos que da bien?</Titulo>
      <div className="grid gap-4 md:grid-cols-2">
        <Tarjeta titulo="Casos resueltos del libro">
          Lauderdale (16), Leadville → Dillon (32), Ray Design (290), la red de transmisión (18) y General Foundry (15
          semanas, varianza 3,11), incluido el orden de los pasos.
        </Tarjeta>
        <Tarjeta titulo="Algoritmos que se controlan entre sí">
          Prim y Kruskal tienen que dar el mismo total. PERT sin tiempos optimista y pesimista tiene que coincidir con CPM.
        </Tarjeta>
        <Tarjeta titulo="Propiedades sobre grafos de 200 nodos">
          Flujo máximo = corte mínimo, ningún arco supera su capacidad, la ruta crítica suma la duración, ninguna holgura es
          negativa. Un grafo completo de 200 nodos (19.900 aristas) se carga en menos de medio segundo.
        </Tarjeta>
        <Tarjeta titulo="Casos borde">
          Grafo no conexo, empates, varias soluciones óptimas, pesos negativos, sin ruta, ciclos en un proyecto, varias rutas
          críticas.
        </Tarjeta>
      </div>
      <p className="mt-6 text-slate-600">
        Todo esto corre con <code className="rounded bg-slate-100 px-1">npm test</code>.
      </p>
    </>
  )
}

function Agenda() {
  return (
    <>
      <Titulo antetitulo="Los seis modelos">Quién presenta cada uno</Titulo>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODELOS.map((m, i) => (
          <a
            key={m.id}
            href={m.links[0].url}
            target="_blank"
            rel="noreferrer"
            className="group rounded-xl border border-slate-200 p-4 transition hover:border-teal-500 hover:bg-teal-50"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {i + 1} · {m.grupo}
            </p>
            <p className="text-xl font-bold text-teal-800">{m.nombre}</p>
            <p className="text-sm text-slate-600">{PRESENTADORES[m.id]}</p>
            <p className="mt-2 text-sm font-medium text-teal-700 group-hover:underline">Abrir en la app ↗</p>
          </a>
        ))}
      </div>
    </>
  )
}

function DiapositivaModelo({ modelo, numero }: { modelo: Modelo; numero: number }) {
  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">
            Modelo {numero} de {MODELOS.length} · {modelo.grupo}
          </p>
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">{modelo.nombre}</h2>
        </div>
        <p className="rounded-full bg-teal-100 px-4 py-1 text-sm font-medium text-teal-900">Presenta: {PRESENTADORES[modelo.id]}</p>
      </header>
      <p className="mb-5 text-lg text-slate-700">
        <strong className="text-slate-900">Problema:</strong> {modelo.problema}
      </p>
      {modelo.nota && (
        <div className="mb-5 rounded-xl border-l-4 border-amber-500 bg-amber-50 p-4 text-amber-950">
          <p className="text-sm font-semibold">{modelo.nota.titulo}</p>
          <p>{modelo.nota.texto}</p>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Tarjeta titulo="Cómo funciona">
          <Lista items={modelo.pasos} numerada />
        </Tarjeta>
        <Tarjeta titulo="Qué muestra la app">
          <Lista items={modelo.enLaApp} />
        </Tarjeta>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-teal-50 p-4">
        <div>
          <p className="text-sm font-semibold text-teal-900">Ejemplo: {modelo.ejemplo.titulo}</p>
          <p className="text-teal-900">{modelo.ejemplo.resultado}</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          {modelo.links.map((l) => (
            <LinkApp key={l.url} url={l.url}>
              {l.texto}
            </LinkApp>
          ))}
        </div>
      </div>
    </>
  )
}

function Cierre() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <h2 className="text-4xl font-bold text-teal-800 sm:text-5xl">¿Preguntas?</h2>
      <p className="mt-4 max-w-xl text-lg text-slate-600">
        La app está publicada y se puede probar con cualquier grafo, o con los ejemplos del libro.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3 print:hidden">
        <LinkApp url="/">Abrir la app</LinkApp>
        <a href="/informe" target="_blank" rel="noreferrer" className="btn">
          Ver el informe ↗
        </a>
      </div>
      <p className="mt-10 font-mono text-sm text-slate-400">{VERSION}</p>
    </div>
  )
}

const DIAPOSITIVAS: { titulo: string; contenido: ReactNode }[] = [
  { titulo: 'Portada', contenido: <Portada /> },
  { titulo: 'Qué es la app', contenido: <QueEs /> },
  { titulo: 'Tecnologías', contenido: <ComoEstaHecha /> },
  { titulo: 'Arquitectura', contenido: <Arquitectura /> },
  { titulo: 'Verificación', contenido: <Verificacion /> },
  { titulo: 'Los seis modelos', contenido: <Agenda /> },
  ...MODELOS.map((m, i) => ({ titulo: m.nombre, contenido: <DiapositivaModelo modelo={m} numero={i + 1} /> })),
  { titulo: 'Cierre', contenido: <Cierre /> },
]

/** El número de diapositiva va en el hash (#3) para poder compartir un link a una en particular. */
const desdeHash = () => {
  const n = Number(window.location.hash.slice(1))
  return Number.isInteger(n) && n >= 1 && n <= DIAPOSITIVAS.length ? n - 1 : 0
}

/**
 * Pantalla /presentacion: presentación introductoria del trabajo, una diapositiva por modelo.
 * Se navega con las flechas, la barra espaciadora o los botones; F pone pantalla completa. Imprimir saca una por hoja.
 */
export function PresentacionPage() {
  const [actual, setActual] = useState(desdeHash)

  const ir = useCallback((i: number) => setActual(Math.max(0, Math.min(i, DIAPOSITIVAS.length - 1))), [])

  useEffect(() => {
    history.replaceState(null, '', `#${actual + 1}`)
  }, [actual])

  useEffect(() => {
    const alCambiarHash = () => setActual(desdeHash())
    const alPresionar = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) setActual((i) => Math.min(i + 1, DIAPOSITIVAS.length - 1))
      else if (['ArrowLeft', 'PageUp'].includes(e.key)) setActual((i) => Math.max(i - 1, 0))
      else if (e.key === 'Home') setActual(0)
      else if (e.key === 'End') setActual(DIAPOSITIVAS.length - 1)
      else if (e.key.toLowerCase() === 'f') {
        if (document.fullscreenElement) document.exitFullscreen()
        else document.documentElement.requestFullscreen?.()
      } else return
      e.preventDefault()
    }
    window.addEventListener('hashchange', alCambiarHash)
    window.addEventListener('keydown', alPresionar)
    return () => {
      window.removeEventListener('hashchange', alCambiarHash)
      window.removeEventListener('keydown', alPresionar)
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900 print:block print:bg-white">
      {/* En pantalla se ve una diapositiva; al imprimir, todas (una por hoja). */}
      <main className="flex flex-1 items-center justify-center p-3 sm:p-6 print:block print:p-0">
        {DIAPOSITIVAS.map((d, i) => (
          <section
            key={d.titulo}
            aria-label={d.titulo}
            className={`${i === actual ? 'flex' : 'hidden'} min-h-[min(80vh,720px)] w-full max-w-6xl flex-col rounded-2xl bg-white p-6 shadow-sm sm:p-10 print:flex print:min-h-0 print:break-after-page print:rounded-none print:shadow-none`}
          >
            <div className="flex-1">{d.contenido}</div>
            <footer className="mt-6 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <img src="/logo-utn.png" alt="" className="h-4 w-auto" />
                {NOMBRE_APP}
              </span>
              <span>
                {i + 1} / {DIAPOSITIVAS.length}
              </span>
            </footer>
          </section>
        ))}
      </main>

      <nav className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-200 bg-white px-4 py-3 print:hidden">
        <button className="btn" onClick={() => ir(actual - 1)} disabled={actual === 0}>
          ← Anterior
        </button>
        <div className="flex flex-wrap justify-center gap-1.5">
          {DIAPOSITIVAS.map((d, i) => (
            <button
              key={d.titulo}
              onClick={() => ir(i)}
              title={d.titulo}
              aria-label={`Ir a ${d.titulo}`}
              aria-current={i === actual}
              className={`h-2.5 rounded-full transition-all ${i === actual ? 'w-6 bg-teal-600' : 'w-2.5 bg-slate-300 hover:bg-slate-400'}`}
            />
          ))}
        </div>
        <button className="btn btn-primario" onClick={() => ir(actual + 1)} disabled={actual === DIAPOSITIVAS.length - 1}>
          Siguiente →
        </button>
        <span className="hidden text-xs text-slate-400 md:inline">Flechas para navegar · F pantalla completa</span>
      </nav>
    </div>
  )
}
