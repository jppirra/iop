# Grupo 3 - IOP 2026

App web educativa para probar los algoritmos de grafos del capítulo 11 "Modelos de redes" de Render (*Métodos cuantitativos para los negocios*). Permite armar un grafo visualmente o por carga masiva, ejecutar un algoritmo y ver el resultado paso a paso, con la explicación de cada decisión.

## Integrantes

| Integrante             | Legajo |
| ---------------------- | ------ |
| Junco Paola            | 43516  |
| Hernandez Lucas Adriel | 51895  |
| Moreno Pablo           | 51452  |
| Pirra Juan Pablo       | 54051  |
| Schneider Christian    | 52682  |
| Vanzo David            | 48463  |

## Cómo correrla

Requiere Node 20 o superior.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests unitarios (Vitest)
npm run build      # build de producción en dist/
```

## Qué hace

**Algoritmos (selector "Estrategia")**

- Árbol mínimo - Prim: se elige el nodo inicial.
- Árbol mínimo - Kruskal.
- Ruta más corta - Dijkstra: se eligen origen y destino.

**Edición del grafo**

- Doble click en el lienzo: nuevo nodo (nombre libre: `1`, `A`, `Casa 1`…).
- Click en un nodo y después en otro: nueva arista (pide el peso). `Esc` cancela.
- Click en una arista: editar el peso. Doble click en un nodo: renombrarlo.
- `Supr`: elimina los nodos/aristas seleccionados. `Ctrl+Z`: deshacer.
- Arrastrar nodos, Auto-layout, Centrar, Limpiar.
- Grafo dirigido / no dirigido (Prim y Kruskal fuerzan no dirigido).

**Carga masiva** (pestaña "Carga masiva", textarea o archivo)

- Texto, una arista por línea: `origen destino peso` (nombres con espacios entre comillas: `"Casa 1" "Casa 2" 4`; `#` para comentarios).
- CSV con encabezado `origen,destino,peso` (también acepta `;` como separador, como exporta Excel en español).
- JSON: `{ "dirigido": false, "nodos": [...], "aristas": [{ "origen", "destino", "peso" }] }`.
- Los nodos se crean a partir de las aristas. Los errores se informan por línea (peso no numérico, línea mal formada, arista repetida, etc.).
- Se puede reemplazar el grafo o agregar al actual, y exportar el grafo a JSON o CSV.

**Ejecución**

- "Ejecutar todo" o "Paso a paso" (Anterior / Siguiente / Reiniciar / Reproducir).
- En cada paso se resalta lo evaluado (naranja), lo incluido en la solución (verde), lo descartado (gris) y el resultado final (azul).
- Árbol mínimo: tabla de aristas elegidas en orden con distancia acumulada y total.
- Dijkstra: ruta, distancia total y tabla de etiquetas `[distancia, previo]` por iteración.
- Aviso de empates y de soluciones óptimas múltiples; aviso de grafo no conexo; Dijkstra bloquea pesos negativos y avisa si no hay ruta.

**Ejemplos del libro** (menú en la cabecera)

| Ejemplo | Figura | Resultado |
| --- | --- | --- |
| Lauderdale Construction | 11.1 | Árbol mínimo, distancia total 16 |
| Leadville → Dillon | 11.19 (problema resuelto 11-3) | Ruta 1-2-3-6-7, distancia 32 |
| Ray Design, Inc. | 11.10 | Ruta 1-2-3-5-6, distancia 290 |

Las aristas de la fig. 11.1 que no forman parte del árbol (1–4, 3–5, 4–6, 5–7, 6–7) se reconstruyeron a partir de los números de la figura, ya que en el texto extraído del libro el dibujo aparece desordenado. Las 7 aristas del árbol y el recorrido paso a paso coinciden con la tabla 11.1.

## Arquitectura

```
src/
  types/graph.ts        Tipos Nodo, Arista, Grafo, Paso, Resultado, Estrategia
  algorithms/           Funciones puras, sin React. Cada una devuelve { pasos, resultado }
    prim.ts  kruskal.ts  dijkstra.ts  utils.ts  index.ts (registro)
  parsers/              texto.ts, csv.ts, json.ts, exportar.ts, index.ts (detección de formato)
  lib/grafo.ts          Operaciones inmutables sobre el grafo (agregar, eliminar, fusionar…)
  examples/             Ejemplos del libro e integrantes
  hooks/useHistorial.ts Estado con historial para Deshacer
  components/           GraphCanvas, Toolbar, BulkLoadPanel, StrategySelector,
                        StepControls, ResultsPanel, DialogoEntrada, IntegrantesDialog
```

### Agregar un algoritmo nuevo

`src/algorithms/index.ts` registra automáticamente (con `import.meta.glob`) todo archivo de esa carpeta que exporte `estrategia`. Para sumar Ford-Fulkerson, Bellman-Ford o Floyd-Warshall:

1. Crear `src/algorithms/<nombre>.ts` con la función pura que devuelve `{ pasos: Paso[], resultado }`.
2. Exportar `estrategia: Estrategia` (nombre, grupo, parámetros, `validar`, `ejecutar`).
3. Si el resultado es de un tipo nuevo (por ejemplo `{ tipo: 'flujo', ... }`), sumarlo a la unión `Resultado` en `types/graph.ts` y agregar su vista en `ResultsPanel.tsx`.

El selector, la validación, el paso a paso y el resaltado en el grafo funcionan sin más cambios.

## Tests

`npm test` corre 28 tests: los ejemplos del libro (Lauderdale = 16 con Prim desde cualquier nodo y con Kruskal; Leadville = 1-2-3-6-7 con 32 y el orden de etiquetas de la fig. 11.20; Ray Design = 290), empates y soluciones múltiples, grafos no conexos, pesos negativos, ausencia de ruta, sentido de los arcos, y los tres parsers con sus errores por línea y la exportación ida y vuelta.
