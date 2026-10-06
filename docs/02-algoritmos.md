# Algoritmos

Los dos algoritmos viven en `src/algorithms/` como **funciones puras**: no
dependen de React, reciben un `Grafo` (y parámetros) y devuelven el resultado:
el árbol de aristas elegidas, en orden, con la distancia total.

Helpers compartidos en `algorithms/utils.ts`: `mapaNombres` (id → nombre para
los textos), `listaAdyacencia`, `esConexo`/`alcanzablesNoDirigido` (BFS/DFS
simple), `describirArista`, y validaciones comunes (`validarGrafoNoVacio`,
`validarParametroNodo`).

---

## Prim — árbol de expansión mínima

**Archivo:** `src/algorithms/prim.ts` · **id:** `prim` · fuerza grafo no dirigido.

### Idea

Arranca de un único nodo "conectado" y, en cada paso, agrega **la arista más
barata que une el conjunto ya conectado con un nodo todavía afuera**. Es el
método de "nodo más cercano" descrito en el libro de Render.

### Algoritmo (pseudocódigo fiel a la implementación)

```
conectados := { inicio }
elegidas   := []

mientras |conectados| < |nodos|:
    candidatas := aristas donde exactamente un extremo está en `conectados`
    si candidatas está vacío: salir            # grafo no conexo
    minimo   := menor peso entre candidatas
    elegida  := primera arista con ese peso (en orden de carga)
    agregar el extremo nuevo de `elegida` a `conectados`
    elegidas.push(elegida)
```

### Detalles de implementación

- **Candidatas**: `grafo.aristas.filter(a => conectados.has(a.origen) !== conectados.has(a.destino))`
  — el XOR entre pertenencia de cada extremo detecta exactamente las aristas
  "de frontera".
- **Empates**: si hay más de una arista con el mínimo peso, se toma la primera
  en el orden en que fue cargada el grafo (arbitrario pero determinista). La
  app avisa este caso en el resultado final.
- **Grafo no conexo**: el bucle corta cuando no quedan candidatas; el resultado
  trae `conexo: false` y `nodosSinConectar` con los nombres que quedaron afuera
  (árbol parcial, no error).
- **Complejidad**: O(V · E) en esta versión (recorre todas las aristas en cada
  iteración) — adecuado para los tamaños de grafo que maneja la UI, prioriza
  claridad sobre eficiencia asintótica (no usa cola de prioridad).

### Parámetros y validación

- Un parámetro: `inicio` (nodo inicial), elegible en el selector "Nodo
  inicial".
- Error si el grafo está vacío o el nodo inicial no existe.
- Advertencia (no bloqueante) si el grafo no es conexo.

---

## Kruskal — árbol de expansión mínima

**Archivo:** `src/algorithms/kruskal.ts` · **id:** `kruskal` · fuerza grafo no dirigido.

### Idea

Ordena **todas** las aristas de menor a mayor peso y las va agregando una por
una, salvo que crear un ciclo — es decir, que sus dos extremos ya estén en el
mismo componente conectado.

### Algoritmo

```
ordenadas := aristas sin bucles, ordenadas por peso ascendente (orden estable)
conjuntos := Union-Find, uno por nodo
elegidas  := []

para cada arista a en ordenadas (hasta juntar n-1 elegidas):
    si buscar(a.origen) == buscar(a.destino):
        descartar a   # formaría ciclo
    si no:
        unir(a.origen, a.destino)
        elegidas.push(a)
```

### Estructura de datos: Union-Find

Clase `ConjuntosDisjuntos` (dentro de `kruskal.ts`):
- `buscar(id)`: sube por `padre` hasta la raíz, con **compresión de camino**
  (reapunta cada nodo visitado directo a la raíz).
- `unir(a, b)`: cuelga la raíz de `a` de la raíz de `b`.
- No implementa *union by rank*; con compresión de camino sola alcanza para los
  tamaños de grafo de la app.

### Detalles de implementación

- El orden de las aristas con **igual peso** es el orden estable del `.sort()`,
  es decir, el orden en que se cargaron — determinismo igual que en Prim.
- **Empates relevantes**: antes de confirmar una arista, revisa si queda alguna
  otra pendiente con el mismo peso que uniría los mismos dos componentes; si la
  hay, lo marca como posible solución óptima múltiple.
- **Bosque (grafo no conexo)**: si no se llega a `n - 1` aristas elegidas, el
  resultado es un bosque; se informan los nodos que quedaron fuera del
  componente del primer nodo.
- **Complejidad**: O(E log E) por el ordenamiento inicial; Union-Find con
  compresión de camino hace que el resto sea prácticamente O(E).

### Parámetros y validación

- Sin parámetros (no necesita nodo inicial).
- Error si el grafo está vacío; advertencia si no es conexo.

---

## Prim vs. Kruskal — ambos dan el mismo total

Ambos algoritmos resuelven el mismo problema (árbol de expansión mínima) con
estrategias distintas: Prim crece **un único árbol** desde un nodo; Kruskal
construye **un bosque que se va fusionando** mirando todas las aristas
globalmente. Sobre el mismo grafo conexo, la distancia total del árbol
resultante es siempre la misma (puede haber más de un árbol óptimo si hay
empates — ver más abajo), aunque el *orden* en que se eligen las aristas
difiere. Es útil cargar el mismo grafo y correr los dos para comprobarlo.

## Detección de soluciones óptimas múltiples (`utils.ts#reemplazosEquivalentes`)

Compartida por Prim y Kruskal. Para cada arista que **no** quedó en el árbol,
busca el camino dentro del árbol entre sus dos extremos y compara su peso con
el de la arista de mayor peso de ese camino: si son iguales, esa arista fuera
del árbol podría reemplazar a la del camino sin cambiar la distancia total →
hay más de un árbol de expansión mínima posible. Esto es lo que dispara el
aviso "Existen soluciones óptimas múltiples" que se ve junto al resultado.

---

## Resumen comparativo

| | Prim | Kruskal |
|---|---|---|
| Estructura auxiliar | Conjunto `conectados` | Union-Find |
| Recorre | Nodos (crece un árbol) | Aristas (ordenadas) |
| Parámetros | nodo inicial | ninguno |
| Complejidad (esta implementación) | O(V·E) | O(E log E) |
