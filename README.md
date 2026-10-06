# Grupo 3 - IOP 2026

Versión **v1.000.002**

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

**Pantalla de inicio**

Al abrir la web se elige el algoritmo y cómo cargar el grafo: carga manual (dibujarlo), carga masiva (texto, CSV o JSON) o ejemplo aleatorio (grafo conexo generado al azar; en Dijkstra el destino es el nodo más lejano al origen). Se vuelve a abrir con el botón "Inicio"; el botón "Aleatorio" genera otro grafo al azar.

**Algoritmos (selector "Estrategia")**

- Árbol mínimo - Prim: se elige el nodo inicial.
- Árbol mínimo - Kruskal.
- Ruta más corta - Dijkstra: se eligen origen y destino.
- Flujo máximo - Ford-Fulkerson: se eligen fuente (S) y sumidero (T); el peso de cada arco es su capacidad. Oculto por defecto: se habilita en `/config` (ver más abajo).

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

- "Ejecutar" reproduce los pasos animados desde el principio (velocidad lenta, normal o rápida; se puede pausar). "Paso a paso" deja avanzar a mano (Reiniciar / Anterior / Siguiente / Final).
- En cada paso se resalta lo evaluado (naranja), lo incluido en la solución (verde), lo descartado (gris) y el resultado final (azul).
- Árbol mínimo: tabla de aristas elegidas en orden con distancia acumulada y total.
- Dijkstra: ruta, distancia total y tabla de etiquetas `[distancia, previo]` por iteración.
- Ford-Fulkerson: cada arco muestra `flujo/capacidad` sobre el grafo; tabla de caminos de aumento (cuello de botella `k` y flujo acumulado), tabla de flujo y holgura por arco, y al final el corte mínimo (en rojo) con su capacidad, igual al flujo máximo. Cada iteración son dos pasos: buscar el camino de aumento en la red residual (BFS) y aumentar el flujo. En un grafo no dirigido cada arista admite flujo en cualquiera de los dos sentidos.
- Aviso de empates y de soluciones óptimas múltiples; aviso de grafo no conexo; Dijkstra bloquea pesos negativos y avisa si no hay ruta.

**Ejemplos del libro** (menú en la cabecera)

| Ejemplo | Figura | Resultado |
| --- | --- | --- |
| Lauderdale Construction | 11.1 | Árbol mínimo, distancia total 16 |
| Leadville → Dillon | 11.19 (problema resuelto 11-3) | Ruta 1-2-3-6-7, distancia 32 |
| Ray Design, Inc. | 11.10 | Ruta 1-2-3-5-6, distancia 290 |
| Red de transmisión | Apunte Ford-Fulkerson (`Lib/`) | Flujo máximo 8 + 10 = 18 |

Las aristas de la fig. 11.1 que no forman parte del árbol (1–4, 3–5, 4–6, 5–7, 6–7) se reconstruyeron a partir de los números de la figura, ya que en el texto extraído del libro el dibujo aparece desordenado. Las 7 aristas del árbol y el recorrido paso a paso coinciden con la tabla 11.1.

## Configuración privada (`/config`)

Entrando a `http://localhost:5173/config` (no hay ningún enlace desde la app) se elige qué se muestra:

- **Algoritmos disponibles**: Prim, Kruskal, Dijkstra y/o Ford-Fulkerson (al menos uno). Solo se ven los que figuran en `estrategias` de `config.json`: un algoritmo nuevo queda oculto hasta sumar su id (hoy Ford-Fulkerson, `ford-fulkerson`). Si ninguno de los habilitados acepta grafos dirigidos, la opción "Dirigido / No dirigido" se oculta y todo grafo se trata como no dirigido.
- **Componentes**: pantalla de inicio, paso a paso (botón, controles y leyenda de colores), animaciones, lista "Todos los pasos" del panel de resultados, ejemplos del libro, ejemplo aleatorio, carga masiva, exportar e integrantes.
- Sin paso a paso ni animaciones, "Ejecutar" muestra directamente el resultado.

Hay dos niveles:

- **Configuración del proyecto** — [`src/config/config.json`](src/config/config.json). Es la que ven todos. Para cambiarla: ajustar en `/config`, tocar **Copiar JSON** (o **Descargar config.json**), reemplazar el archivo, commit y push; Vercel publica la versión nueva.
- **Configuración local** — si alguien cambia algo en `/config`, se guarda solo en su navegador (`localStorage`), persiste aunque cierre el navegador y pisa la del proyecto únicamente para esa persona. **Volver a la del proyecto** la descarta.

La pantalla está oculta, no protegida con contraseña: lo que cambie un visitante solo le afecta a él. En Vercel la ruta funciona gracias a `vercel.json` (redirige todas las rutas a `index.html`); en `npm run dev` y `npm run preview` ya funciona.

## Arquitectura

```
src/
  types/graph.ts        Tipos Nodo, Arista, Grafo, Paso, Resultado, Estrategia
  algorithms/           Funciones puras, sin React. Cada una devuelve { pasos, resultado }
    prim.ts  kruskal.ts  dijkstra.ts  fordFulkerson.ts  utils.ts  index.ts (registro)
  parsers/              texto.ts, csv.ts, json.ts, exportar.ts, index.ts (detección de formato)
  lib/grafo.ts          Operaciones inmutables sobre el grafo (agregar, eliminar, fusionar…)
  examples/             Ejemplos del libro, integrantes y versión
  config/               Configuración (/config): modelo, persistencia y pantalla
  hooks/useHistorial.ts Estado con historial para Deshacer
  components/           GraphCanvas, Toolbar, BulkLoadPanel, StrategySelector,
                        StepControls, ResultsPanel, DialogoEntrada, IntegrantesDialog
```

### Agregar un algoritmo nuevo

`src/algorithms/index.ts` registra automáticamente (con `import.meta.glob`) todo archivo de esa carpeta que exporte `estrategia`. Para sumar Bellman-Ford o Floyd-Warshall:

1. Crear `src/algorithms/<nombre>.ts` con la función pura que devuelve `{ pasos: Paso[], resultado }`.
2. Exportar `estrategia: Estrategia` (nombre, grupo, parámetros, `validar`, `ejecutar`).
3. Si el resultado es de un tipo nuevo (como `{ tipo: 'flujo', ... }` de Ford-Fulkerson), sumarlo a la unión `Resultado` en `types/graph.ts` y agregar su vista en `ResultsPanel.tsx`.
4. Agregar su id a `estrategias` en `src/config/config.json` cuando esté listo para que lo vean todos (mientras tanto se prueba habilitándolo en `/config`).

El selector, la validación, el paso a paso y el resaltado en el grafo funcionan sin más cambios.

## Tests

`npm test` corre 48 tests: los ejemplos del libro (Lauderdale = 16 con Prim desde cualquier nodo y con Kruskal; Leadville = 1-2-3-6-7 con 32 y el orden de etiquetas de la fig. 11.20; Ray Design = 290), empates y soluciones múltiples, grafos no conexos, pesos negativos, ausencia de ruta, sentido de los arcos, Ford-Fulkerson (red del apunte = 18, corte mínimo igual al flujo máximo, arcos inversos, conservación en los nodos, grafos no dirigidos, capacidades decimales), y los tres parsers con sus errores por línea la exportación ida y vuelta, y el generador de grafos aleatorios (siempre conexo, sin aristas repetidas, pesos en rango).
