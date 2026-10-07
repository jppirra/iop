# Arquitectura

## Stack

- **React 19 + TypeScript**, compilado con **Vite**.
- **Cytoscape** (vía `react-cytoscapejs`) para dibujar el grafo.
- **Tailwind CSS** para estilos.
- **marked** para mostrar el informe (Markdown) en `/informe`.
- **Vitest** para tests unitarios.
- Sin backend: todo el estado vive en el navegador. Se despliega como sitio
  estático (Vercel, ver `vercel.json`).

## Organización de carpetas

```
src/
  types/graph.ts        Tipos del dominio: Nodo, Arista, Grafo, Paso, Resultado, Estrategia
  algorithms/            Un archivo por algoritmo, funciones puras sin React
    prim.ts  kruskal.ts  dijkstra.ts  fordFulkerson.ts  cpm.ts  pert.ts
    proyecto.ts          Cálculo común de CPM y PERT (no es un algoritmo en sí)
    utils.ts             Helpers compartidos (adyacencia, conexidad, empates…)
    index.ts             Registro automático de estrategias (import.meta.glob)
  parsers/               Carga masiva: texto.ts, csv.ts, json.ts, exportar.ts
    tipos.ts             GrafoPlano (nodos por nombre) + validación de pesos y tiempos
    index.ts             Detección de formato + punto de entrada parsear()
  lib/
    grafo.ts             Operaciones inmutables sobre Grafo (CRUD de nodos/aristas)
    aleatorio.ts          Generador de grafos aleatorios conexos
  examples/
    libro.ts              Ejemplos resueltos (libro y apunte) y JSON de ejemplo
    integrantes.ts        Nombre de la app, versión, integrantes del grupo
  config/
    config.json           Qué algoritmos y componentes ve todo el mundo
    configuracion.ts      Modelo, normalización y persistencia de la configuración
    useConfiguracion.ts   Hook: configuración vigente, sincronizada entre pestañas
    ConfigPage.tsx        Pantalla /config
  informe/
    InformePage.tsx       Pantalla /informe: muestra INFORME.md y lo exporta a Word
  hooks/
    useHistorial.ts       Estado genérico con historial (deshacer)
  components/
    GraphCanvas.tsx        Lienzo Cytoscape: edición + resaltado de cada paso
    Toolbar.tsx             Dirigido / no dirigido, deshacer, auto-layout, centrar, limpiar
    StrategySelector.tsx    Elegir algoritmo + parámetros + Ejecutar / Paso a paso
    StepControls.tsx        Reproducir, velocidad, Anterior / Siguiente / Final
    ResultsPanel.tsx         Texto del paso y tablas de resultado de cada algoritmo
    BulkLoadPanel.tsx        Pestaña de carga masiva (texto/CSV/JSON) + exportar
    PantallaInicio.tsx       Pantalla inicial (elegir algoritmo y modo de carga)
    DialogoEntrada.tsx       Diálogo genérico (nombre de nodo, peso de arista…)
    IntegrantesDialog.tsx    Modal con la lista de integrantes
  App.tsx                 Orquesta todo lo anterior (estado principal de la app)
  main.tsx                Punto de entrada y ruteo mínimo (/, /config, /informe)
```

## Representación interna del grafo

El grafo **no** se guarda como lista de adyacencia: se guarda como dos arrays
planos, en `src/types/graph.ts`:

```ts
interface Nodo {
  id: string      // identificador interno, no lo ve la persona usuaria
  nombre: string   // lo que se muestra y se edita (único dentro del grafo)
  x: number
  y: number        // posición en el lienzo
}

interface Arista {
  id: string
  origen: string   // id de un Nodo
  destino: string  // id de un Nodo
  peso: number     // distancia, costo, capacidad o duración, según el algoritmo
  optimista?: number   // solo PERT (el peso es el tiempo más probable)
  pesimista?: number   // solo PERT
}

interface Grafo {
  dirigido: boolean
  nodos: Nodo[]
  aristas: Arista[]
}
```

**Por qué arrays y no adyacencia directamente:** este formato es el que mejor
calza con cómo se edita el grafo desde la interfaz (agregar/quitar un nodo o
una arista es un `push`/`filter` sobre un array) y con cómo se serializa a
JSON/CSV para exportar e importar. Las funciones de `lib/grafo.ts` son
**inmutables**: cada operación (`agregarNodo`, `agregarArista`, `eliminar`,
`renombrarNodo`...) devuelve un `Grafo` nuevo en vez de mutar el existente, lo
que es lo que permite implementar Deshacer (Ctrl+Z) simplemente apilando
estados anteriores.

Cuando un algoritmo necesita recorrer el grafo (quién es vecino de quién), esa
representación se arma **al vuelo**, no se mantiene persistente:

- `listaAdyacencia(grafo)` en `algorithms/utils.ts` arma un
  `Map<idNodo, Vecino[]>`; la usan Dijkstra y el chequeo de conexidad.
- Ford-Fulkerson arma su propia adyacencia, porque necesita además los arcos
  inversos de la red residual.
- CPM y PERT calculan un orden topológico de los nodos.

Se vuelve a calcular cada vez que se ejecuta un algoritmo, porque recalcular
(milisegundos, incluso con 200 nodos) es más simple que mantener dos
estructuras sincronizadas.

**Un solo modelo para todos los algoritmos.** El `peso` de la arista se
interpreta según el algoritmo. CPM y PERT usan el mismo grafo con la
convención de *actividad en el arco*: cada arista es una actividad y cada nodo
un evento. PERT solo agrega dos datos opcionales a la arista.

### Cómo se identifican nodos y conexiones

- Cada nodo y cada arista tiene un **id interno** generado con `nuevoId()`
  (`lib/grafo.ts`): un prefijo (`n` para nodo, `e` para arista) más un
  timestamp en base36 más un contador, por ejemplo `n8mz3k1`. Estos ids nunca
  se muestran ni se editan.
- Las aristas referencian nodos **por id** (`origen`, `destino`), no por
  nombre, así renombrar un nodo no requiere tocar ninguna arista.
- El **nombre** del nodo es lo único que define y edita la persona usuaria
  (`1`, `A`, `Casa 1`...). Se valida que no se repita dentro del mismo grafo
  antes de crear o renombrar un nodo (`App.tsx`, función `nombreValido`).
- Al cargar un grafo por texto/CSV/JSON, los nodos no se declaran aparte: se
  deducen de los nombres que aparecen en las aristas (`completarNodos` en
  `parsers/tipos.ts`), y recién ahí se les asigna un id real al convertirlos
  con `desdePlano`.
- No se admiten dos aristas entre el mismo par de nodos. En un grafo dirigido,
  A→B y B→A son aristas distintas.

## Flujo de datos (alto nivel)

```
Grafo (estado en App, con historial)  +  parámetros
   │
   │  estrategia.validar(grafo, parametros)  ──► errores (bloquean) / advertencias
   │  estrategia.ejecutar(grafo, parametros)
   ▼
{ pasos: Paso[], resultado }
   │
   ├─► pasos[indice] ──► GraphCanvas   (colores y textos sobre el grafo)
   ├─► pasos[indice] ──► ResultsPanel  (explicación del paso, tablas parciales)
   └─► resultado     ──► ResultsPanel  (totales, ruta, avisos finales)
```

`App.tsx` es el único lugar con estado "central": sostiene el `Grafo`, la
estrategia elegida, los parámetros, la ejecución vigente y el **índice del
paso** que se está mostrando. Los componentes de abajo son controlados:
reciben datos y disparan callbacks (`onCambiarEstrategia`, `onConectar`,
`onMover`, `onIr`, etc.), no manejan estado propio de negocio.

### Pasos: cómo se anima un algoritmo

El algoritmo no se ejecuta "de a poco". `ejecutar` devuelve de una vez la
lista completa de `Paso`, y cada paso es una foto: título, descripción, y qué
nodos y aristas resaltar (`nodosActuales`, `aristasEvaluadas`,
`aristasIncluidas`, `aristasDescartadas`, `aristasResultado`, `aristasCorte`).
Un paso también puede cambiar el texto de las aristas (`etiquetasAristas`):
así Ford-Fulkerson muestra `flujo/capacidad` y PERT el tiempo esperado.

- **Paso a paso:** los botones cambian el índice.
- **Ejecutar:** un temporizador en `App.tsx` suma 1 al índice hasta el final.
- En ningún caso se recalcula el algoritmo.

### Grafo efectivo

Antes de validar o ejecutar, `App.tsx` arma el grafo que realmente recibe la
estrategia: una copia con `dirigido: false` si la estrategia declara
`forzarNoDirigido` (Prim, Kruskal), con `dirigido: true` si declara
`forzarDirigido` (CPM, PERT), o el grafo tal cual en los demás casos. El grafo
guardado no se modifica.

### Por qué una ejecución puede quedar "vieja"

`App.tsx` arma una `claveActual` combinando el id de la estrategia, los
parámetros efectivos y una **firma estructural** del grafo (`firmaEstructural`
en `lib/grafo.ts`, que ignora las posiciones `x`/`y`). Si esa clave no coincide
con la de la última ejecución (`ejecucion.clave`), la ejecución se considera
obsoleta y el panel de resultados avisa "volvé a ejecutar". Mover nodos con el
mouse **no** invalida la ejecución; cambiar la estructura del grafo, un peso,
la estrategia o un parámetro sí.

## El modelo de `Estrategia` (cómo se integra un algoritmo)

Cada algoritmo se describe con una `Estrategia` (`src/types/graph.ts`):

```ts
interface Estrategia {
  id: string
  nombre: string
  grupo: string
  descripcion: string
  orden: number
  parametros: { clave: ClaveParametro; etiqueta: string }[]
  forzarNoDirigido?: boolean
  forzarDirigido?: boolean
  leyenda?: Partial<Record<ClaseLeyenda, string>>
  validar(grafo: Grafo, parametros: Parametros): Validacion
  ejecutar(grafo: Grafo, parametros: Parametros): Ejecucion
}
```

`src/algorithms/index.ts` usa `import.meta.glob` para importar **todos** los
archivos `.ts` de esa carpeta (menos los `.test.ts` y el propio `index.ts`) y
se queda con los que exportan `estrategia`, ordenados por el campo `orden`.
Esto es lo que hace que agregar un algoritmo nuevo no requiera tocar `App.tsx`
ni el selector: alcanza con crear el archivo. `proyecto.ts` y `utils.ts` no
exportan `estrategia`, por eso no aparecen como algoritmos.

**Para sumar un algoritmo nuevo** (por ejemplo Bellman-Ford o
Floyd-Warshall):

1. Crear `src/algorithms/<nombre>.ts` con una función pura que devuelva
   `{ pasos, resultado }`.
2. Exportar `estrategia: Estrategia` (nombre, grupo, parámetros, `validar`,
   `ejecutar`).
3. Si el resultado necesita un `tipo` nuevo, sumarlo a la unión `Resultado` en
   `types/graph.ts` y agregar su vista en `ResultsPanel.tsx`.
4. Agregar su id a `estrategias` en `src/config/config.json` para que se vea
   (mientras tanto se puede habilitar en `/config`).

El selector de estrategias, la validación, el paso a paso y el resaltado sobre
el grafo funcionan automáticamente a partir de ahí.

## Configuración

`src/config/` decide qué partes de la app se muestran. Hay dos niveles:

- **Del proyecto:** `config.json`, incluido en el build. Es lo que ve todo el
  mundo. Lista los ids de las estrategias habilitadas y un interruptor por
  componente (pantalla de inicio, paso a paso, animaciones, ejemplos, carga
  masiva, exportar, etc.).
- **Local:** lo que se cambie en la pantalla `/config` se guarda en
  `localStorage` y vale solo en ese navegador.

`normalizar` (`configuracion.ts`) descarta ids de estrategias que no existen,
completa claves faltantes y garantiza que quede al menos una estrategia. La
configuración nunca cambia el resultado de un algoritmo: solo qué se muestra.

## Carga masiva y parsers

`src/parsers/` reconoce tres formatos de entrada (texto plano, CSV, JSON) y los
normaliza a un `GrafoPlano` (nodos referenciados por **nombre**, no por id).
`detectarFormato` adivina el formato por extensión de archivo o por el
contenido si no hay archivo. Los errores de parseo se reportan por línea
(`ErrorParseo { ubicacion, mensaje }`) para que la persona usuaria pueda
corregir el texto pegado. `lib/grafo.ts#desdePlano` convierte ese `GrafoPlano`
al `Grafo` real (con ids), fusionando por nombre si se elige "agregar" en vez
de "reemplazar".

Los tres formatos aceptan, opcionalmente, los tiempos de PERT: cinco valores
por línea en texto (`origen destino optimista másProbable pesimista`) y los
campos `optimista` y `pesimista` en CSV y JSON. `leerTiempos`
(`parsers/tipos.ts`) valida que se cumpla optimista ≤ más probable ≤
pesimista.

Si la carga trae más de 20 nodos sin posición, `App.tsx` dispara el
auto-layout del lienzo en lugar de ubicarlos en círculo, para que un grafo
grande se pueda leer apenas se carga.

## Estado con historial

`hooks/useHistorial.ts` es un hook genérico (`useHistorial<T>`) que guarda una
pila de estados anteriores para poder deshacer con Ctrl+Z. `App.tsx` lo usa
sobre el `Grafo` completo: cada edición (agregar nodo, conectar, eliminar,
mover) pasa por `aplicar(fn)`, que calcula el nuevo estado y lo apila.

## Pantallas

`main.tsx` hace un ruteo mínimo por la URL, sin librería: `/config` muestra la
pantalla de configuración, `/informe` muestra `INFORME.md` con el estilo de la
app (y permite descargarlo en Word o imprimirlo), y cualquier otra ruta
muestra la app. Ninguna de las dos pantallas tiene enlace desde la app.

## Cómo se verifica la corrección de los resultados

Los algoritmos son funciones puras (`Grafo` + parámetros → pasos y resultado),
lo que los hace fáciles de probar sin levantar la interfaz: `npm test` corre
66 tests con Vitest sobre `algorithms/`, `lib/`, `parsers/` y `config/`. La
estrategia de verificación tiene cuatro patas:

1. **Comparación contra casos resueltos.** Los tests reproducen ejemplos con
   solución conocida, incluido el orden de los pasos:

   | Ejemplo | Algoritmo | Resultado |
   |---|---|---|
   | Lauderdale Construction (8 nodos) | Prim y Kruskal | Distancia total 16 |
   | Leadville → Dillon | Dijkstra | Ruta 1-2-3-6-7, distancia 32 |
   | Ray Design | Dijkstra | Ruta 1-2-3-5-6, distancia 290 |
   | Red de transmisión (apunte) | Ford-Fulkerson | Flujo máximo 18 |
   | General Foundry | CPM y PERT | 15 semanas, holguras de las 8 actividades, varianza 3,11 |

2. **Algoritmos que se validan entre sí.** Prim y Kruskal tienen que dar el
   mismo total, y Prim el mismo total desde cualquier nodo inicial. PERT sin
   tiempos optimista y pesimista tiene que coincidir con CPM.
3. **Propiedades que siempre se cumplen.** El flujo máximo es igual a la
   capacidad del corte mínimo; ningún arco supera su capacidad y en cada nodo
   intermedio entra lo mismo que sale; la ruta de Dijkstra suma su distancia;
   la ruta crítica suma la duración del proyecto y ninguna holgura es
   negativa. Estas propiedades se comprueban también sobre grafos aleatorios
   de **200 nodos**.
4. **Casos borde armados a propósito**: grafo no conexo, empates, soluciones
   óptimas múltiples, pesos negativos, ausencia de ruta, sentido de los arcos,
   capacidades decimales, ciclos en una red de proyecto, varias rutas
   críticas.

Los parsers (texto/CSV/JSON) se prueban por separado: que conviertan
correctamente una entrada válida, que informen el error esperado (línea y
mensaje) ante cada tipo de entrada inválida, y que exportar y volver a
importar conserve el grafo. El generador aleatorio se corre con 50 semillas
verificando que el grafo sea conexo, sin aristas repetidas y con pesos en
rango.

## Aspectos técnicos no triviales de la implementación

Algunos puntos del diseño no son obvios a primera vista y vale la pena poder
explicarlos:

- **Determinismo en los empates.** Cuando dos aristas tienen el mismo peso,
  los algoritmos necesitan un criterio de desempate reproducible (se usa el
  orden en que se cargó el grafo) — si el desempate fuera arbitrario en cada
  corrida, el mismo grafo podría dar soluciones distintas en ejecuciones
  distintas, y los tests no podrían fijar un resultado esperado.
- **Detectar cuándo hay más de un árbol óptimo**, no solo cuándo hubo un
  empate durante la ejecución: un empate en un paso no siempre significa que
  exista otro árbol con la misma distancia total. `reemplazosEquivalentes`
  (`algorithms/utils.ts`) lo resuelve comparando, para cada arista fuera del
  árbol, el peso de la arista más cara en el camino que conecta sus extremos
  dentro del árbol.
- **Mantener la ejecución sincronizada con el grafo.** Si se edita el grafo
  después de ejecutar un algoritmo, el resultado mostrado quedaría
  desactualizado. Se resuelve comparando una firma del grafo contra la firma
  vigente al momento de ejecutar, sin recalcular en cada tecla.
- **Tres formatos de entrada, un solo modelo de error.** Texto, CSV y JSON
  tienen reglas de parseo distintas, pero todos informan los errores con la
  misma forma (`{ ubicación, mensaje }`).
- **Red residual sin construirla.** Ford-Fulkerson no arma un segundo grafo:
  guarda el flujo de cada arista y calcula la capacidad residual en el
  momento. Los arcos inversos, que permiten deshacer una asignación anterior,
  son la misma arista recorrida al revés.
- **Errores de punto flotante.** Con capacidades o tiempos decimales,
  operaciones como 0,1 + 0,2 dan 0,30000000000000004. Ford-Fulkerson y
  CPM/PERT redondean a 9 decimales en cada operación.
- **CPM y PERT comparten el cálculo.** `proyecto.ts` recibe una función que
  dice cuánto dura cada actividad: CPM pasa el peso, PERT el tiempo esperado.
  Todo lo demás (orden topológico, recorridos, holguras) es común.
- **Grafos grandes.** Un grafo de 200 nodos ubicado en círculo es ilegible;
  la carga masiva dispara el auto-layout a partir de 20 nodos.
