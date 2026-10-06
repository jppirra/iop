# Visión general

## Qué es

Aplicación web educativa para experimentar con **algoritmos de árbol de
expansión mínima** (capítulo 11 "Modelos de redes" de *Métodos cuantitativos
para los negocios*, Render). Permite armar un grafo (a mano, por carga masiva o
al azar), ejecutar un algoritmo y ver el árbol resultante con el detalle de qué
aristas se eligieron y en qué orden.

Es un trabajo práctico de la cátedra de Investigación Operativa (UTN), hecho
con React + TypeScript + Vite, sin backend: todo corre en el navegador.

## Qué resuelve

| Problema | Algoritmo | Qué devuelve |
|---|---|---|
| Árbol de expansión mínima (conectar todos los nodos al menor costo total) | **Prim** | Árbol: lista de aristas elegidas, orden y distancia total |
| Árbol de expansión mínima | **Kruskal** | Igual que Prim, por un método distinto |

Ambos algoritmos devuelven el mismo tipo de resultado (un árbol con sus
aristas, en orden, y la distancia total) para poder compararse entre sí sobre
el mismo grafo.

## Para quién es esta documentación

Para quien necesite entender o extender el proyecto sin tener que leer todo el
código fuente de entrada. Se asume conocimiento básico de React/TypeScript y de
los algoritmos de árbol de expansión mínima (Prim, Kruskal) a nivel de materia
de grado.

## Índice de esta carpeta

- [`01-arquitectura.md`](./01-arquitectura.md) — organización del proyecto, módulos y flujo de datos.
- [`02-algoritmos.md`](./02-algoritmos.md) — cómo están implementados Prim y Kruskal.
- [`03-casos-de-uso.md`](./03-casos-de-uso.md) — qué puede hacer una persona usuaria, de punta a punta.
- [`04-diagramas.md`](./04-diagramas.md) — diagrama de componentes y diagramas de secuencia.

## Puntos más importantes a tener en cuenta

1. **Los algoritmos son funciones puras** (`src/algorithms/*.ts`): no tocan
   React ni el DOM. Reciben un `Grafo` y parámetros, y devuelven el árbol
   resultante con su distancia total.
2. **Prim y Kruskal fuerzan el grafo a no dirigido**: un árbol de expansión
   mínima no tiene sentido con arcos direccionales.
3. **Al ejecutar se ve el resultado completo**: el árbol resultante queda
   resaltado sobre el grafo, junto con la tabla de aristas elegidas y la
   distancia total.
4. **No hay backend ni base de datos**: el grafo vive en memoria (con
   historial para Ctrl+Z) y se puede exportar/importar como JSON o CSV.
5. **La app avisa de casos especiales**: empates al elegir una arista, más de
   un árbol óptimo posible, o un grafo no conexo (árbol parcial).
