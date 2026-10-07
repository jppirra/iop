# Visión general

## Qué es

Aplicación web educativa para experimentar con los **algoritmos de redes** de
la cátedra (capítulos "Modelos de redes" y "Administración de proyectos" de
*Métodos cuantitativos para los negocios*, Render). Permite armar un grafo (a
mano, por carga masiva o al azar), ejecutar un algoritmo y ver el resultado
junto con **cada decisión que tomó el algoritmo**, animado o paso a paso.

Es un trabajo práctico de la cátedra de Investigación Operativa (UTN), hecho
con React + TypeScript + Vite, sin backend: todo corre en el navegador.

## Qué resuelve

| Problema | Algoritmo | Qué devuelve |
|---|---|---|
| Árbol de expansión mínima (conectar todos los nodos al menor costo total) | **Prim** | Aristas elegidas en orden y distancia total |
| Árbol de expansión mínima | **Kruskal** | Igual que Prim, por un método distinto |
| Ruta más corta entre dos nodos | **Dijkstra** | Ruta, distancia total y tabla de etiquetas por iteración |
| Flujo máximo entre una fuente y un sumidero | **Ford-Fulkerson** | Flujo máximo, caminos de aumento, flujo por arco y corte mínimo |
| Duración de un proyecto y actividades críticas | **CPM** | Duración, ruta crítica, tiempos y holgura de cada actividad |
| Lo mismo, con tiempos inciertos | **PERT** | Además: tiempo esperado, varianza y probabilidad de cumplir un plazo |

Todos devuelven lo mismo en forma: una lista de **pasos** (para animar y
explicar) y un **resultado** (para las tablas). Prim y Kruskal comparten el
tipo de resultado, y también CPM y PERT, para poder compararlos sobre el mismo
grafo.

## Para quién es esta documentación

Para quien necesite entender o extender el proyecto sin tener que leer todo el
código fuente de entrada. Se asume conocimiento básico de React/TypeScript y de
los algoritmos a nivel de materia de grado.

## Índice de esta carpeta

- [`01-arquitectura.md`](./01-arquitectura.md) — organización del proyecto, módulos y flujo de datos.
- [`02-algoritmos.md`](./02-algoritmos.md) — cómo están implementados los seis algoritmos.
- [`03-casos-de-uso.md`](./03-casos-de-uso.md) — qué puede hacer una persona usuaria, de punta a punta.
- [`04-diagramas.md`](./04-diagramas.md) — diagrama de componentes y diagramas de secuencia.

## Puntos más importantes a tener en cuenta

1. **Los algoritmos son funciones puras** (`src/algorithms/*.ts`): no tocan
   React ni el DOM. Reciben un `Grafo` y parámetros, y devuelven
   `{ pasos, resultado }`.
2. **Se calcula todo de una vez.** La pantalla no ejecuta el algoritmo "de a
   poco": recorre la lista de pasos con un índice. Anterior, Siguiente y la
   animación solo cambian ese índice.
3. **El tipo de grafo depende del algoritmo.** Prim y Kruskal lo fuerzan a no
   dirigido; CPM y PERT, a dirigido; Dijkstra y Ford-Fulkerson respetan lo que
   elija la persona usuaria.
4. **No hay backend ni base de datos**: el grafo vive en memoria (con
   historial para Ctrl+Z) y se puede exportar/importar como JSON o CSV.
5. **La app valida antes de ejecutar y avisa de casos especiales**: pesos
   negativos, ciclos en una red de proyecto, empates, soluciones óptimas
   múltiples, grafo no conexo, ausencia de ruta.
6. **Qué se muestra es configurable.** `src/config/config.json` define qué
   algoritmos y componentes ve todo el mundo; la pantalla `/config` permite
   cambiarlo por navegador.
7. **Funciona con grafos grandes.** Probado con 200 nodos: la carga masiva
   los acomoda sola y los algoritmos resuelven en milisegundos.
