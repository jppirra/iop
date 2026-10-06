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
