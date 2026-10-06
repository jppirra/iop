# Arquitectura

## Stack

- **React 19 + TypeScript**, compilado con **Vite**.
- **Cytoscape** (vía `react-cytoscapejs`) para dibujar el grafo.
- **Tailwind CSS** para estilos.
- **Vitest** para tests unitarios.
- Sin backend: todo el estado vive en el navegador. Se despliega como sitio
  estático (Vercel, ver `vercel.json`).

## Organización de carpetas

```
src/
  types/graph.ts        Tipos del dominio: Nodo, Arista, Grafo, Resultado, Estrategia
  algorithms/            Un archivo por algoritmo, funciones puras sin React
    prim.ts  kruskal.ts
    utils.ts             Helpers compartidos (adyacencia, conexidad, empates…)
    index.ts             Registro automático de estrategias (import.meta.glob)
  parsers/               Carga masiva: texto.ts, csv.ts, json.ts, exportar.ts
    tipos.ts             GrafoPlano (nodos por nombre) + validación de pesos
    index.ts             Detección de formato + punto de entrada parsear()
  lib/
    grafo.ts             Operaciones inmutables sobre Grafo (CRUD de nodos/aristas)
    aleatorio.ts          Generador de grafos aleatorios conexos
  examples/
    integrantes.ts        Nombre de la app, versión, integrantes del grupo
  hooks/
    useHistorial.ts       Estado genérico con historial (deshacer)
  components/
    GraphCanvas.tsx        Lienzo Cytoscape: edición + resaltado del resultado
    Toolbar.tsx             Deshacer, auto-layout, centrar, limpiar
    StrategySelector.tsx    Elegir algoritmo + parámetro (nodo inicial)
    ResultsPanel.tsx         Resultado: árbol, aristas elegidas y distancia total
    BulkLoadPanel.tsx        Pestaña de carga masiva (texto/CSV/JSON) + exportar
    PantallaInicio.tsx       Pantalla inicial (elegir algoritmo y modo de carga)
    DialogoEntrada.tsx       Diálogo genérico (nombre de nodo, peso de arista…)
    IntegrantesDialog.tsx    Modal con la lista de integrantes
  App.tsx                 Orquesta todo lo anterior (estado principal de la app)
  main.tsx                Punto de entrada de la aplicación
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
  peso: number
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
representación por adyacencia se arma **al vuelo**, no se mantiene
persistente: `listaAdyacencia(grafo)` en `algorithms/utils.ts` recorre el
array de aristas una vez y arma un `Map<idNodo, Vecino[]>`. Se vuelve a
calcular cada vez que se ejecuta un algoritmo, porque el grafo es chico y
recalcular es más simple que mantener dos estructuras sincronizadas.

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

## Flujo de datos (alto nivel)

```
Grafo (estado en App, con historial)
   │
   │  estrategia.ejecutar(grafo, parametros)
   ▼
Resultado (árbol de aristas elegidas + distancia total)
   │
   ├─► GraphCanvas   (resalta el árbol resultante sobre el grafo)
   └─► ResultsPanel  (muestra el resultado)
```

`App.tsx` es el único lugar con estado "central": sostiene el `Grafo`, la
estrategia elegida, el parámetro y la ejecución vigente. Los componentes de
abajo son controlados: reciben datos y disparan callbacks
(`onCambiarEstrategia`, `onConectar`, `onMover`, etc.), no manejan estado
propio de negocio.

### Por qué una ejecución puede quedar "vieja"

`App.tsx` arma una `claveActual` combinando el id de la estrategia, los
parámetros efectivos y una **firma estructural** del grafo (`firmaEstructural`
en `lib/grafo.ts`, que ignora las posiciones `x`/`y`). Si esa clave no coincide
con la de la última ejecución (`ejecucion.clave`), la ejecución se considera
obsoleta y el panel de resultados avisa "volvé a ejecutar". Mover nodos con el
mouse **no** invalida la ejecución; cambiar la estructura del grafo, la
estrategia o el parámetro sí.

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
  validar(grafo: Grafo, parametros: Parametros): Validacion
  ejecutar(grafo: Grafo, parametros: Parametros): Ejecucion
}
```

`src/algorithms/index.ts` usa `import.meta.glob` para importar **todos** los
archivos `.ts` de esa carpeta (menos los `.test.ts` y el propio `index.ts`) y
se queda con los que exportan `estrategia`, ordenados por el campo `orden`.
Esto es lo que hace que agregar un algoritmo nuevo no requiera tocar `App.tsx`
ni el selector: alcanza con crear el archivo.

**Para sumar un algoritmo nuevo** (por ejemplo Ford-Fulkerson, Bellman-Ford o
Floyd-Warshall):

1. Crear `src/algorithms/<nombre>.ts` con una función pura que devuelva el
   resultado.
2. Exportar `estrategia: Estrategia` (nombre, grupo, parámetros, `validar`,
   `ejecutar`).
3. Si el resultado necesita un `tipo` nuevo (por ejemplo `{ tipo: 'flujo' }`),
   sumarlo a la unión `Resultado` en `types/graph.ts` y agregar su vista en
   `ResultsPanel.tsx`.

El selector de estrategias, la validación y el resaltado del resultado en el
grafo funcionan automáticamente a partir de ahí.

## Carga masiva y parsers

`src/parsers/` reconoce tres formatos de entrada (texto plano, CSV, JSON) y los
normaliza a un `GrafoPlano` (nodos referenciados por **nombre**, no por id).
`detectarFormato` adivina el formato por extensión de archivo o por el
contenido si no hay archivo. Los errores de parseo se reportan por línea
(`ErrorParseo { ubicacion, mensaje }`) para que la persona usuaria pueda
corregir el texto pegado. `lib/grafo.ts#desdePlano` convierte ese `GrafoPlano`
al `Grafo` real (con ids), fusionando por nombre si se elige "agregar" en vez
de "reemplazar".

## Estado con historial

`hooks/useHistorial.ts` es un hook genérico (`useHistorial<T>`) que guarda una
pila de estados anteriores para poder deshacer con Ctrl+Z. `App.tsx` lo usa
sobre el `Grafo` completo: cada edición (agregar nodo, conectar, eliminar,
mover) pasa por `aplicar(fn)`, que calcula el nuevo estado y lo apila.

## Cómo se verifica la corrección de los resultados

Los algoritmos son funciones puras (`Grafo` + parámetros → resultado), lo que
los hace fáciles de probar sin levantar la interfaz: `npm test` corre una
batería de tests con Vitest sobre `algorithms/`, `lib/` y `parsers/`. La
estrategia de verificación tiene tres patas:

1. **Comparación contra un caso resuelto a mano.** El ejemplo "Lauderdale
   Construction" (8 nodos) tiene una solución conocida de antemano, con el
   árbol y la distancia total ya calculados. Los tests comprueban que:
   - Prim, empezando desde el nodo 1, reproduce exactamente esa secuencia de
     aristas y llega a distancia total 16.
   - **Prim da el mismo resultado (16) sin importar desde qué nodo arranque** —
     esto verifica una propiedad matemática del algoritmo (el árbol mínimo no
     depende del nodo inicial), no solo un caso puntual.
   - Kruskal, sobre el mismo grafo, también llega a 16 por un camino distinto
     — si Prim y Kruskal coinciden en la distancia total, es una señal fuerte
     de que ambas implementaciones son correctas (se corrigen "entre sí").
2. **Casos borde armados a propósito**, probados con grafos chicos escritos a
   mano (formato texto): un grafo no conexo (verifica que se detecte y que se
   informen los nodos sin conectar), un grafo con un ciclo evidente (verifica
   que Kruskal lo descarte y lo diga en la descripción del paso), un árbol sin
   ambigüedad (verifica que **no** se marque como solución múltiple cuando no
   la hay, para descartar falsos positivos).
3. **Propiedades generales sobre entradas aleatorias**: el generador de
   grafos aleatorios se corre con 50 semillas distintas y se verifica, en
   cada una, que el grafo resultante sea conexo, sin aristas repetidas y con
   todos los pesos dentro del rango pedido — en vez de revisar un grafo
   aleatorio a mano, se verifica que la propiedad se cumpla siempre.

Los parsers (texto/CSV/JSON) se prueban por separado: que conviertan
correctamente una entrada válida, y que informen el error esperado (línea y
mensaje) ante cada tipo de entrada inválida (peso no numérico, línea mal
formada, arista repetida, encabezado de CSV inválido).

## Aspectos técnicos no triviales de la implementación

Algunos puntos del diseño no son obvios a primera vista y vale la pena poder
explicarlos:

- **Determinismo en los empates.** Cuando dos aristas tienen el mismo peso,
  tanto Prim como Kruskal necesitan un criterio de desempate reproducible (se
  usa el orden en que se cargó el grafo) — si el desempate fuera arbitrario
  en cada corrida, el mismo grafo podría dar árboles distintos en
  ejecuciones distintas, y los tests no podrían fijar un resultado esperado.
- **Detectar cuándo hay más de un árbol óptimo**, no solo cuándo hubo un
  empate durante la ejecución: un empate en un paso no siempre significa que
  exista otro árbol con la misma distancia total (a veces la arista alternativa
  igual no sirve). `reemplazosEquivalentes` (`algorithms/utils.ts`) lo resuelve
  comparando, para cada arista fuera del árbol, el peso de la arista más cara
  en el camino que conecta sus extremos dentro del árbol.
- **Mantener la ejecución sincronizada con el grafo.** Si se edita el grafo
  después de ejecutar un algoritmo, el resultado mostrado quedaría
  desactualizado. Se resuelve comparando una firma del grafo (ids, nombres,
  conexiones y pesos, ignorando la posición de los nodos) contra la firma
  vigente al momento de ejecutar, sin tener que recalcular el resultado en
  cada tecla.
- **Tres formatos de entrada, un solo modelo de error.** Texto, CSV y JSON
  tienen reglas de parseo distintas, pero todos informan los errores con la
  misma forma (`{ ubicación, mensaje }`) para que la interfaz los muestre
  igual sin importar qué formato se usó.
