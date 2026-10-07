# Algoritmos

Los seis algoritmos viven en `src/algorithms/` como **funciones puras**: no
dependen de React, reciben un `Grafo` (y parámetros) y devuelven
`{ pasos, resultado }`: la lista de pasos para animar y explicar, y el
resultado para las tablas.

Helpers compartidos en `algorithms/utils.ts`: `mapaNombres` (id → nombre para
los textos), `listaAdyacencia`, `esConexo`/`alcanzablesNoDirigido` (recorrido
simple), `describirArista`, y validaciones comunes (`validarGrafoNoVacio`,
`validarParametroNodo`).

Para el detalle línea por línea de cada uno, con trazas de los ejemplos y qué
pasa si se modifica cada parte, ver [`MANUAL.md`](../MANUAL.md).

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
  "de frontera". Es también lo que evita ciclos.
- **Empates**: si hay más de una arista con el mínimo peso, se toma la primera
  en el orden en que fue cargado el grafo (arbitrario pero determinista). La
  app avisa el empate en ese paso.
- **Grafo no conexo**: el bucle corta cuando no quedan candidatas; el resultado
  trae `conexo: false` y `nodosSinConectar` con los nombres que quedaron afuera
  (árbol parcial, no error).
- **Complejidad**: O(V · E) en esta versión (recorre todas las aristas en cada
  iteración) — prioriza claridad sobre eficiencia asintótica (no usa cola de
  prioridad). Con 200 nodos tarda unos milisegundos.

### Parámetros y validación

- Un parámetro: `inicio` (nodo inicial).
- Error si el grafo está vacío o el nodo inicial no existe.
- Advertencia (no bloqueante) si el grafo no es conexo.

---

## Kruskal — árbol de expansión mínima

**Archivo:** `src/algorithms/kruskal.ts` · **id:** `kruskal` · fuerza grafo no dirigido.

### Idea

Ordena **todas** las aristas de menor a mayor peso y las va agregando una por
una, salvo que formen un ciclo — es decir, que sus dos extremos ya estén en el
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
aviso "Hay soluciones óptimas múltiples" que se ve junto al resultado.

---

## Dijkstra — ruta más corta

**Archivo:** `src/algorithms/dijkstra.ts` · **id:** `dijkstra` · acepta grafo dirigido o no dirigido.

### Idea

Cada nodo tiene una etiqueta `[distancia acumulada, nodo previo]`. En cada
iteración se **fija** (etiqueta permanente) el nodo no fijado más cercano al
origen y se actualizan las etiquetas de sus vecinos. Es la técnica de
etiquetas del libro.

### Algoritmo

```
dist[origen] := 0; dist[resto] := ∞
permanentes  := {}

mientras destino no esté en permanentes:
    candidatos := nodos no permanentes con dist finita
    si candidatos está vacío: salir            # no hay ruta
    u := candidato de menor dist (el primero en orden de creación)
    agregar u a permanentes
    para cada vecino v de u que no sea permanente:
        nueva := dist[u] + peso(u, v)
        si nueva < dist[v]:  dist[v] := nueva; previo[v] := u
        si nueva == dist[v]: anotar u como previo alternativo de v

ruta := seguir previo[] hacia atrás desde destino
```

### Detalles de implementación

- **Corta al fijar el destino**: no calcula la distancia a todos los nodos,
  solo hasta donde hace falta. Los nodos no alcanzados quedan con etiqueta
  temporal.
- **Dirigido / no dirigido**: se resuelve en `listaAdyacencia`. En un grafo no
  dirigido cada arista se carga en los dos sentidos.
- **Tabla de etiquetas**: después de cada iteración se guarda una foto de
  todas las etiquetas (`iteraciones`); el panel muestra una fila por
  iteración.
- **Rutas óptimas múltiples**: si se llega a un nodo de la ruta final con la
  misma distancia por dos previos distintos, se informa.
- **Sin ruta**: no es un error. Se fija todo lo alcanzable y el resultado dice
  que no hay ruta (en dirigidos aclara "respetando el sentido de los arcos").
- **Complejidad**: O(V²) — el mínimo se busca recorriendo los nodos, sin cola
  de prioridad, por la misma razón que en Prim.

### Parámetros y validación

- Dos parámetros: `origen` y `destino`.
- Error si el grafo está vacío, si origen y destino coinciden, o si hay
  **pesos negativos**: el algoritmo nunca revisa un nodo ya fijado, y eso solo
  es correcto si alargar un camino no puede abaratarlo.

---

## Ford-Fulkerson — flujo máximo

**Archivo:** `src/algorithms/fordFulkerson.ts` · **id:** `ford-fulkerson` · acepta grafo dirigido o no dirigido.

### Idea

El peso de cada arco es su **capacidad**. Se busca cuánto se puede enviar de
una fuente a un sumidero. Se arranca con flujo 0 y, mientras exista un
**camino de aumento** (un camino de la fuente al sumidero con capacidad
disponible), se envía por él todo lo que cabe: su **cuello de botella**.

### Algoritmo

```
flujo[a] := 0 para toda arista a

repetir:
    camino := BFS de fuente a sumidero por tramos con residual > 0
    si no hay camino: salir
    k := menor residual de los tramos del camino      # cuello de botella
    para cada tramo del camino:
        si va en el sentido de la arista: flujo += k
        si va al revés (arco inverso):    flujo -= k

corte := aristas que van de un nodo alcanzado en el último BFS a uno no alcanzado
```

### Detalles de implementación

- **Red residual al vuelo**: no se construye otro grafo. La capacidad residual
  de un tramo se calcula cuando se necesita: `capacidad − flujo` en el sentido
  de la arista, y `flujo` al revés (el arco inverso solo puede deshacer lo ya
  enviado).
- **Arcos inversos**: permiten corregir una asignación temprana. Sin ellos,
  una mala primera elección de camino podría dejar el resultado por debajo
  del máximo.
- **BFS para buscar el camino** (variante de Edmonds-Karp): toma siempre el
  camino con menos arcos. Garantiza que el algoritmo termine también con
  capacidades decimales y que el recorrido sea reproducible.
- **Corte mínimo**: cuando el BFS no llega al sumidero, los nodos que sí
  alcanzó forman el lado de la fuente; los arcos que salen de ese conjunto
  están saturados y forman el corte. Su capacidad es igual al flujo máximo,
  lo que demuestra que el resultado es óptimo.
- **Grafo no dirigido**: cada arista puede llevar flujo en cualquiera de los
  dos sentidos, hasta su capacidad.
- **Dos pasos por iteración**: "camino de aumento" (qué camino se encontró y
  cuánto vale `k`) y "aumentar el flujo" (cómo quedan los arcos).
- **Decimales**: cada operación se redondea a 9 decimales para no arrastrar
  errores de punto flotante.
- **Complejidad**: O(V · E²).

### Parámetros y validación

- Dos parámetros: fuente y sumidero (reutilizan las claves `origen` y
  `destino`).
- Error si el grafo está vacío, si fuente y sumidero coinciden, o si hay
  capacidades negativas.
- Advertencia si el grafo no es dirigido.

---

## CPM y PERT — administración de proyectos

**Archivos:** `src/algorithms/cpm.ts` (**id:** `cpm`) y `src/algorithms/pert.ts`
(**id:** `pert`) · fuerzan grafo dirigido. El cálculo es común y está en
`src/algorithms/proyecto.ts`.

### Idea

La red es de **actividad en el arco**: cada arco es una actividad, su peso es
la duración, y cada nodo es un evento (el momento en que terminaron todas las
actividades que llegan a él). Se busca la duración del proyecto, que es el
**camino más largo** de la red, y cuánto margen tiene cada actividad.

PERT hace lo mismo, pero cada actividad tiene tres tiempos (optimista `a`, más
probable `m`, pesimista `b`) y se trabaja con el tiempo esperado.

### Algoritmo

```
orden := orden topológico de los eventos       # cada uno después de sus predecesores

# hacia adelante
para cada evento u en orden:
    temprano[u] := mayor de (temprano[origen] + duración) entre los arcos que llegan
                   (0 si no llega ninguno)
duracion := mayor temprano

# hacia atrás
para cada evento u en orden inverso:
    tardio[u] := menor de (tardio[destino] − duración) entre los arcos que salen
                 (duracion si no sale ninguno)

para cada actividad i → j:
    IC := temprano[i];  TC := IC + duración
    TL := tardio[j];    IL := TL − duración
    holgura := IL − IC                          # crítica si es 0
```

En PERT, antes de todo:

```
duración := (a + 4m + b) / 6                    # tiempo esperado
varianza := ((b − a) / 6)²
```

y al final: varianza del proyecto = suma de las varianzas de la ruta crítica;
`Z = (plazo − duración) / desvío` da la probabilidad de terminar en un plazo.

### Detalles de implementación

- **Un cálculo, dos algoritmos**: `calcularProyecto` recibe una función que
  devuelve la duración de cada actividad. `cpm.ts` pasa el peso; `pert.ts`
  pasa el tiempo esperado y la varianza.
- **Orden topológico** (`ordenTopologico`): saca repetidamente los eventos sin
  arcos entrantes. Si no logra ordenarlos todos, hay un **ciclo**: la
  validación lo detecta y muestra cuál es.
- **Inicio y fin del proyecto**: no se piden. Los eventos sin arcos entrantes
  arrancan en 0 y el proyecto termina con el último evento final.
- **Varias rutas críticas**: se pintan todas las actividades críticas y se
  avisa cuántas rutas hay. En PERT se informa la de mayor varianza.
- **Tres tiempos**: son campos opcionales de la arista (`optimista`,
  `pesimista`; el `peso` es el más probable). Una arista sin ellos se toma
  como de tiempo fijo (varianza 0).
- **Probabilidad de un plazo**: no forma parte de los pasos. El plazo se
  ingresa en el panel de resultados y se calcula ahí con
  `probabilidadDeTerminar`, usando una aproximación numérica de la normal
  estándar. Cambiarlo no obliga a volver a ejecutar.
- **Actividades ficticias**: una precedencia sin actividad se carga como arco
  de duración 0.
- **Complejidad**: O(V · E).

### Parámetros y validación

- Sin parámetros.
- Error si el grafo está vacío o no tiene arcos, si hay duraciones negativas,
  si hay un ciclo y, en PERT, si no se cumple optimista ≤ más probable ≤
  pesimista.
- Advertencia si hay más de un evento inicial o final y, en PERT, si hay
  actividades sin tiempos optimista y pesimista.

---

## Resumen comparativo

| | Prim | Kruskal | Dijkstra | Ford-Fulkerson | CPM / PERT |
|---|---|---|---|---|---|
| Problema | Árbol mínimo | Árbol mínimo | Ruta más corta | Flujo máximo | Duración de un proyecto |
| El peso es | Distancia | Distancia | Distancia | Capacidad | Duración |
| Tipo de grafo | No dirigido | No dirigido | Cualquiera | Cualquiera | Dirigido, sin ciclos |
| Estructura auxiliar | Conjunto `conectados` | Union-Find | Mapas de distancia y previo | Mapa de flujo + cola (BFS) | Orden topológico |
| Parámetros | Nodo inicial | Ninguno | Origen y destino | Fuente y sumidero | Ninguno |
| Complejidad (esta implementación) | O(V·E) | O(E log E) | O(V²) | O(V·E²) | O(V·E) |
