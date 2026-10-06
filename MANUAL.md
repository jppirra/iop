# Manual de los modelos de redes — Grupo 3, IOP 2026

Este manual explica cómo está resuelto cada modelo de la app (Prim, Kruskal y Dijkstra) en dos niveles:

- **Nivel funcional**: qué problema resuelve, qué regla aplica en cada paso, qué muestra la pantalla y qué casos especiales contempla. No hace falta leer código.
- **Nivel técnico**: en qué archivo y línea está cada decisión, qué estructuras de datos usa y **qué pasa si se modifica** cada parte.

Las trazas de los ejemplos son la salida real del código sobre los ejemplos del libro (cap. 11 de Render, *Métodos cuantitativos para los negocios*).

## Índice

1. [Idea central de la solución](#1-idea-central-de-la-solución)
2. [Piezas comunes a los tres modelos](#2-piezas-comunes-a-los-tres-modelos)
3. [Modelo 1: Árbol de expansión mínima — Prim](#3-modelo-1-árbol-de-expansión-mínima--prim)
4. [Modelo 2: Árbol de expansión mínima — Kruskal](#4-modelo-2-árbol-de-expansión-mínima--kruskal)
5. [Modelo 3: Ruta más corta — Dijkstra](#5-modelo-3-ruta-más-corta--dijkstra)
6. [Prim vs. Kruskal: en qué se diferencian](#6-prim-vs-kruskal-en-qué-se-diferencian)
7. [Qué pasa si modifico algo (general)](#7-qué-pasa-si-modifico-algo-general)
8. [Tests que respaldan cada afirmación](#8-tests-que-respaldan-cada-afirmación)
9. [Preguntas típicas y respuesta corta](#9-preguntas-típicas-y-respuesta-corta)

---

## 1. Idea central de la solución

### Funcional

El usuario arma un grafo (nodos, aristas con peso), elige un modelo y toca **Ejecutar**. La app muestra el resultado y, además, **cada decisión que tomó el algoritmo**, con una explicación en texto y colores sobre el grafo. Se puede ver animado o avanzar paso a paso.

### Técnico

Toda la solución se apoya en una sola decisión de diseño:

> Cada algoritmo es una **función pura** que recibe el grafo y devuelve, de una sola vez, `{ pasos, resultado }`. La pantalla no ejecuta el algoritmo "de a poco": solo recorre el arreglo `pasos` con un índice.

```
Grafo + parámetros
      │
      ▼
estrategia.validar()  ──► errores (bloquean Ejecutar) / advertencias (solo avisan)
      │
      ▼
estrategia.ejecutar() ──► { pasos: Paso[], resultado }      ← src/algorithms/*.ts
      │
      ├─► pasos[indice] ──► GraphCanvas   (pinta colores sobre el grafo)
      ├─► pasos[indice] ──► ResultsPanel  (texto del paso, tablas parciales)
      └─► resultado     ──► ResultsPanel  (total, ruta, avisos finales)
```

Consecuencias prácticas:

- "Anterior", "Siguiente", "Final" y la animación solo cambian el número `indice`. No se recalcula nada.
- Los algoritmos no conocen React ni Cytoscape: se pueden testear solos (y así están testeados).
- Para cambiar **qué decide** un modelo se toca `src/algorithms/`. Para cambiar **cómo se ve** se toca `src/components/`.

---

## 2. Piezas comunes a los tres modelos

### 2.1 Los datos: `Grafo`, `Paso`, `Resultado`

Definidos en [graph.ts](src/types/graph.ts).

| Tipo | Qué es | Detalle importante |
| --- | --- | --- |
| `Nodo` | `id`, `nombre`, `x`, `y` | El `id` es interno y no cambia; el `nombre` es lo que ve el usuario. Los algoritmos trabajan con `id` y traducen a `nombre` solo para los textos. |
| `Arista` | `id`, `origen`, `destino`, `peso` | `origen`/`destino` son ids de nodo. En un grafo no dirigido el orden origen/destino no importa. |
| `Grafo` | `dirigido`, `nodos[]`, `aristas[]` | El **orden** de `nodos` y `aristas` es el orden de carga, y es el que desempata. |
| `Paso` | Una "foto" de la ejecución | Ver tabla siguiente. |
| `Resultado` | `ResultadoArbol` o `ResultadoRuta` | Unión discriminada por `tipo` (`'arbol'` / `'ruta'`). |

Campos de un `Paso` ([graph.ts:27-46](src/types/graph.ts#L27-L46)) y cómo se ven:

| Campo | Significado | Color en el grafo |
| --- | --- | --- |
| `titulo`, `descripcion` | Texto explicativo del paso | — (panel de resultados) |
| `nodosActuales` | Protagonista del paso | Nodo naranja con borde grueso |
| `aristasEvaluadas` | Aristas comparadas en este paso | Naranja punteado |
| `nodosIncluidos`, `aristasIncluidas` | Lo que ya forma parte de la solución | Verde |
| `aristasDescartadas` | Aristas rechazadas (ciclo) | Gris punteado |
| `aristasResultado` | Solución final | Azul |
| `empate` | Aviso de empate | Cartel amarillo |
| `iteracion` | Fila de la tabla de etiquetas (solo Dijkstra) | — |

El pintado está en [GraphCanvas.tsx:181-197](src/components/GraphCanvas.tsx#L181-L197). Si una arista cae en dos listas a la vez gana la regla que está **más abajo** en la hoja de estilos ([GraphCanvas.tsx:76-91](src/components/GraphCanvas.tsx#L76-L91)): descartada < evaluada < incluida < resultado. Por eso la arista recién elegida se ve verde aunque también figure como "evaluada".

### 2.2 El contrato `Estrategia`

Cada modelo exporta un objeto `estrategia` ([graph.ts:111-123](src/types/graph.ts#L111-L123)) con:

| Campo | Para qué sirve |
| --- | --- |
| `id` | Identificador. Lo usan `config.json` y los ejemplos del libro. |
| `nombre`, `grupo`, `descripcion` | Textos del selector "Estrategia". |
| `orden` | Posición en el selector (Prim 10, Kruskal 20, Dijkstra 30). |
| `parametros` | Qué nodos hay que pedirle al usuario (`inicio`, `origen`, `destino`). |
| `forzarNoDirigido` | Si es `true`, el grafo se trata y se dibuja como no dirigido. |
| `validar(grafo, parametros)` | Devuelve `errores` (deshabilitan Ejecutar) y `advertencias` (solo avisan). |
| `ejecutar(grafo, parametros)` | Devuelve `{ pasos, resultado }`. |

El registro es automático: [index.ts](src/algorithms/index.ts) usa `import.meta.glob` para tomar todo archivo de `src/algorithms/` que exporte `estrategia`. No hay una lista escrita a mano.

### 2.3 Qué hace `App` antes de llamar al algoritmo

Todo en [App.tsx](src/App.tsx):

1. **Grafo efectivo** ([App.tsx:67-71](src/App.tsx#L67-L71)): si la estrategia tiene `forzarNoDirigido` (Prim, Kruskal), o la configuración no permite dirigidos, se pasa una copia con `dirigido: false`. El grafo original no se toca.
2. **Parámetros efectivos** ([App.tsx:74-82](src/App.tsx#L74-L82)): si el usuario no eligió nodo, o el nodo elegido fue borrado, se usa uno por defecto: el **primer** nodo para `inicio`/`origen` y el **último** para `destino`.
3. **Validación** ([App.tsx:84-87](src/App.tsx#L84-L87)): se recalcula en cada cambio; con errores, los botones quedan deshabilitados.
4. **Ejecución** ([App.tsx:138-145](src/App.tsx#L138-L145)): guarda `{ clave, datos }`, donde `clave` identifica con qué estrategia, parámetros y grafo se calculó.
5. **Vigencia** ([App.tsx:90-94](src/App.tsx#L90-L94)): el resultado solo se muestra mientras la clave actual coincida con la guardada. Ver [sección 7.1](#71-usando-la-app).

### 2.4 Utilidades compartidas

En [utils.ts](src/algorithms/utils.ts):

| Función | Qué hace | Quién la usa |
| --- | --- | --- |
| `listaAdyacencia` | Para cada nodo, sus vecinos y la arista que los une. Si el grafo no es dirigido, cada arista se carga en los dos sentidos. | Dijkstra, conexidad |
| `esConexo` | Recorrido en profundidad desde el primer nodo, ignorando sentido. | Prim, Kruskal |
| `reemplazosEquivalentes` | Detecta si existe **otro** árbol con el mismo total. | Prim, Kruskal |
| `mapaNombres`, `describirArista` | Traducen ids a textos (`1–3`, `A→B`). | Los tres |
| `validarGrafoNoVacio`, `validarParametroNodo` | Validaciones comunes. | Los tres |
| `nodoMasLejano` | Elige un destino interesante para el grafo aleatorio. | Botón "Aleatorio" |

---

## 3. Modelo 1: Árbol de expansión mínima — Prim

### 3.1 Nivel funcional

**Problema.** Conectar todos los nodos con la menor distancia total posible (caso del libro: llevar agua y electricidad a 8 casas). La solución es un árbol: `n − 1` aristas, sin ciclos.

**Regla** (es la técnica que describe el libro):

1. Elegir un nodo inicial cualquiera. Es el único "conectado".
2. Mirar todas las aristas que unen un nodo conectado con uno no conectado.
3. Elegir la de menor distancia y conectar ese nodo.
4. Repetir 2 y 3 hasta que estén todos conectados.

**Entradas.** El grafo y el **nodo inicial**.

**Salidas.**

- Tabla "Aristas elegidas" en orden, con distancia y acumulada.
- Distancia total mínima.
- Avisos: empate en un paso, soluciones óptimas múltiples, grafo no conexo.

**Qué se ve en cada paso.** En naranja, todas las aristas candidatas que se compararon; en verde, lo ya conectado; el nodo recién conectado resaltado.

**Ejemplo: Lauderdale Construction (fig. 11.1), desde el nodo 1.**

| Paso | Se conecta | Arista | Distancia | Acumulada | Observación |
| --- | --- | --- | --- | --- | --- |
| 1 | 3 | 1–3 | 2 | 2 | |
| 2 | 4 | 3–4 | 2 | 4 | |
| 3 | 2 | 3–2 | 3 | 7 | Empate entre 2–3, 1–2 y 3–6 |
| 4 | 5 | 2–5 | 3 | 10 | Empate entre 2–5 y 3–6 |
| 5 | 6 | 3–6 | 3 | 13 | |
| 6 | 8 | 6–8 | 1 | 14 | |
| 7 | 7 | 8–7 | 2 | 16 | |

Resultado: **16** (en cientos de pies), igual a la tabla 11.1. Aviso final: *"La arista 1–2 (3) puede reemplazar a 2–3 (3) sin cambiar la distancia total"*, es decir, hay más de una solución óptima.

**Casos especiales.**

| Situación | Comportamiento |
| --- | --- |
| Grafo vacío | Error: no deja ejecutar. |
| Grafo no conexo | Advertencia (deja ejecutar). Devuelve el árbol del componente donde está el nodo inicial y lista los nodos que quedaron afuera. |
| Empate en un paso | Elige la primera arista en orden de carga y avisa. |
| Grafo dirigido | Se ignora el sentido: el botón "Dirigido" queda forzado a no dirigido. |
| Pesos negativos o decimales | Se aceptan; la regla sigue siendo válida. |
| Distinto nodo inicial | Mismo total siempre; puede cambiar el orden y, si hay empates, qué aristas se eligen. |

### 3.2 Nivel técnico

**Archivo:** [prim.ts](src/algorithms/prim.ts). Función `prim(grafo, inicio)`.

**Estado interno.**

| Variable | Tipo | Rol |
| --- | --- | --- |
| `conectados` | `Set<id>` | Nodos ya en el árbol. Arranca con `inicio`. |
| `elegidas` | `Arista[]` | Aristas del árbol, en orden de elección. |
| `aristasElegidas` | `AristaElegida[]` | Lo mismo, pero con nombres y orientado "desde conectado → hacia nuevo" para la tabla. |
| `total` | `number` | Distancia acumulada. |
| `pasos` | `Paso[]` | Una entrada por decisión. |

**Recorrido del código.**

| Línea | Qué hace |
| --- | --- |
| [19](src/algorithms/prim.ts#L19) | Copia el grafo con `dirigido: false`. |
| [33-39](src/algorithms/prim.ts#L33-L39) | Paso "Inicio". |
| [41](src/algorithms/prim.ts#L41) | Bucle: mientras falten nodos por conectar. |
| [42](src/algorithms/prim.ts#L42) | **Candidatas**: aristas con exactamente un extremo conectado (`conectados.has(origen) !== conectados.has(destino)`). Esta condición es la que evita ciclos: una arista con los dos extremos conectados nunca es candidata. |
| [43](src/algorithms/prim.ts#L43) | Sin candidatas → el grafo no es conexo → corta. |
| [45-47](src/algorithms/prim.ts#L45-L47) | **Decisión**: mínimo peso; entre las empatadas, la primera (`empatadas[0]`). |
| [48-49](src/algorithms/prim.ts#L48-L49) | Determina cuál extremo es el conectado (`desde`) y cuál el nuevo (`hacia`). |
| [51-54](src/algorithms/prim.ts#L51-L54) | Actualiza estado. |
| [56-60](src/algorithms/prim.ts#L56-L60) | Texto de empate si hubo más de una candidata con el mínimo. |
| [62-69](src/algorithms/prim.ts#L62-L69) | Registra el paso; `aristasEvaluadas` = todas las candidatas. |
| [72-74](src/algorithms/prim.ts#L72-L74) | Conexidad, nodos sin conectar, soluciones múltiples. |
| [76-89](src/algorithms/prim.ts#L76-L89) | Paso "Resultado" con `aristasResultado` (azul). |
| [105-122](src/algorithms/prim.ts#L105-L122) | Objeto `estrategia`: parámetro `inicio`, `forzarNoDirigido`, validación. |

**Cantidad de pasos:** 1 (inicio) + una por arista elegida + 1 (resultado). Lauderdale: 9.

**Complejidad:** en cada iteración se filtran todas las aristas → O(V·E). No usa cola de prioridad a propósito: para grafos didácticos no hace falta y el código queda igual a la regla del libro.

**Detección de soluciones múltiples** ([utils.ts:54-72](src/algorithms/utils.ts#L54-L72)). Para cada arista que quedó **fuera** del árbol, se busca el camino dentro del árbol entre sus dos extremos (BFS). Si el peso de la arista de afuera es igual al mayor peso de ese camino, se pueden intercambiar sin cambiar el total → hay otro árbol óptimo. Es independiente del aviso de empate por paso: un empate en un paso *sugiere* soluciones múltiples; esta función lo *confirma*.

### 3.3 Qué pasa si modifico…

| Cambio | Efecto |
| --- | --- |
| El **nodo inicial** | Mismo total. Cambia el orden de la tabla y, con empates, puede cambiar el árbol. |
| El **orden de las aristas** (en la carga o en [libro.ts](src/examples/libro.ts)) | Cambia quién gana los empates → otro árbol con el mismo total. En Lauderdale, 2–3 está antes que 1–2 justamente para reproducir la tabla 11.1; invertirlas hace fallar el test que compara el orden exacto. |
| `empatadas[0]` por la última ([prim.ts:47](src/algorithms/prim.ts#L47)) | Sigue siendo óptimo, mismo total, otro árbol. Falla el test de la tabla 11.1. |
| `Math.min` por `Math.max` ([prim.ts:45](src/algorithms/prim.ts#L45)) | Pasa a calcular el árbol de expansión **máxima**. Los textos seguirían diciendo "mínima". |
| La condición de candidatas ([prim.ts:42](src/algorithms/prim.ts#L42)) por "algún extremo conectado" | Se aceptarían aristas entre dos nodos ya conectados → ciclos y `hacia` mal calculado. |
| Quitar el `break` de la línea [43](src/algorithms/prim.ts#L43) | Con un grafo no conexo, `Math.min()` de una lista vacía da `Infinity`, `empatadas[0]` es `undefined` y la función se rompe. |
| Quitar `forzarNoDirigido` ([prim.ts:112](src/algorithms/prim.ts#L112)) | La pantalla dibujaría flechas y dejaría cargar A→B y B→A por separado, pero el algoritmo seguiría ignorando el sentido: quedaría incoherente lo que se ve con lo que se calcula. |
| Quitar `dirigido: false` de la línea [19](src/algorithms/prim.ts#L19) | Sin efecto hoy: el filtro de candidatas no mira el sentido. Es una defensa por si se llama a `prim()` directamente con un grafo dirigido. |
| Pasar la advertencia de no conexo a `errores` ([prim.ts:118](src/algorithms/prim.ts#L118)) | Ejecutar quedaría bloqueado en grafos no conexos y no se vería el árbol parcial. Falla el test que espera una advertencia. |
| Los textos de `descripcion` | Solo cambia lo que se lee, salvo la frase "Se conecta el nodo … con el …", que un test verifica. |

---

## 4. Modelo 2: Árbol de expansión mínima — Kruskal

### 4.1 Nivel funcional

**Problema.** El mismo que Prim: conectar todos los nodos con distancia total mínima. Cambia la forma de llegar.

**Regla.**

1. Ordenar todas las aristas de menor a mayor distancia.
2. Tomar la siguiente arista de la lista.
3. Si une dos nodos que **ya están conectados entre sí** (por otras aristas elegidas), se descarta: formaría un ciclo.
4. Si no, se agrega.
5. Terminar al tener `n − 1` aristas o al agotar la lista.

**Entradas.** Solo el grafo. No pide nodo inicial.

**Salidas.** Las mismas que Prim (tabla, total, avisos).

**Qué se ve en cada paso.** El primer paso pinta todas las aristas en naranja y lista el orden. Después, cada paso evalúa una arista: queda verde si se agrega o gris punteada si se descarta.

**Ejemplo: Lauderdale Construction.**

Orden inicial: 6–8 (1), 1–3 (2), 3–4 (2), 7–8 (2), 2–3 (3), 1–2 (3), 2–5 (3), 3–6 (3), 6–7 (4), 1–4 (5), 3–5 (5), 4–6 (6), 5–7 (7).

| # | Arista | Distancia | Decisión | Acumulada |
| --- | --- | --- | --- | --- |
| 1 | 6–8 | 1 | Se agrega | 1 |
| 2 | 1–3 | 2 | Se agrega | 3 |
| 3 | 3–4 | 2 | Se agrega | 5 |
| 4 | 7–8 | 2 | Se agrega | 7 |
| 5 | 2–3 | 3 | Se agrega (empate con 1–2) | 10 |
| 6 | 1–2 | 3 | **Se descarta**: 1 y 2 ya están conectados vía 3 | 10 |
| 7 | 2–5 | 3 | Se agrega | 13 |
| 8 | 3–6 | 3 | Se agrega | 16 |

Con 7 aristas elegidas el algoritmo **corta**: 6–7, 1–4, 3–5, 4–6 y 5–7 ni se evalúan. Resultado: **16**, igual que Prim.

Notar que durante la ejecución hay varios "pedacitos" sueltos (6–8 por un lado, 1–3–4 por otro) que se van uniendo. En Prim siempre hay un único árbol que crece.

**Casos especiales.**

| Situación | Comportamiento |
| --- | --- |
| Grafo vacío | Error. |
| Grafo no conexo | Advertencia. Devuelve un **bosque**: el árbol mínimo de cada componente, y el total es la suma de todos. |
| Empate | Entre aristas de igual peso se respeta el orden de carga. Avisa solo cuando otra arista pendiente del mismo peso uniría **los mismos dos grupos**. |
| Grafo dirigido | Se ignora el sentido. |
| Arista de un nodo a sí mismo | Se filtra antes de ordenar. |
| Pesos negativos o decimales | Se aceptan. |

### 4.2 Nivel técnico

**Archivo:** [kruskal.ts](src/algorithms/kruskal.ts). Función `kruskal(grafo)`.

**Estructura clave: conjuntos disjuntos (union-find)** ([kruskal.ts:11-34](src/algorithms/kruskal.ts#L11-L34)).

Responde rápido la pregunta "¿estos dos nodos ya están conectados?". Cada nodo guarda un `padre`; al principio cada uno es su propio padre (cada nodo es un grupo).

- `buscar(id)`: sube por los padres hasta la raíz, que identifica al grupo. De paso aplica **compresión de caminos**: cuelga todos los nodos visitados directo de la raíz para que la próxima búsqueda sea más corta.
- `unir(a, b)`: la raíz del grupo de `a` pasa a colgar de la raíz del grupo de `b`.

Dos nodos están en el mismo grupo ⇔ `buscar` devuelve la misma raíz ⇔ agregar una arista entre ellos formaría un ciclo.

**Estado interno.**

| Variable | Rol |
| --- | --- |
| `ordenadas` | Aristas sin lazos, ordenadas por peso ascendente. |
| `conjuntos` | Union-find con todos los nodos. |
| `elegidas`, `descartadas` | Aristas aceptadas y rechazadas. |
| `incluidos` | Nodos tocados por alguna arista elegida (para pintarlos de verde). |
| `objetivo` | `n − 1`: cantidad de aristas de un árbol. |

**Recorrido del código.**

| Línea | Qué hace |
| --- | --- |
| [42](src/algorithms/kruskal.ts#L42) | Copia con `dirigido: false`. |
| [44](src/algorithms/kruskal.ts#L44) | `filter` (saca lazos y crea una copia: no altera el grafo) + `sort` por peso. El sort de JavaScript es **estable**: a igual peso se mantiene el orden de carga. |
| [60-69](src/algorithms/kruskal.ts#L60-L69) | Paso "Inicio": muestra la lista ordenada y marca todas como evaluadas. |
| [71](src/algorithms/kruskal.ts#L71) | Bucle sobre las aristas ordenadas, **con corte** al llegar a `objetivo`. |
| [73-74](src/algorithms/kruskal.ts#L73-L74) | Grupo de cada extremo. |
| [77-87](src/algorithms/kruskal.ts#L77-L87) | **Mismo grupo → ciclo → descartar** y registrar el paso. |
| [90-95](src/algorithms/kruskal.ts#L90-L95) | Busca empates reales: aristas pendientes del mismo peso que unirían los mismos dos grupos. Se calcula **antes** de unir. |
| [97-102](src/algorithms/kruskal.ts#L97-L102) | Une los grupos y actualiza estado. |
| [104-114](src/algorithms/kruskal.ts#L104-L114) | Paso "Agregar". |
| [117-121](src/algorithms/kruskal.ts#L117-L121) | Conexidad, nodos fuera del componente del primer nodo, soluciones múltiples. |
| [152-168](src/algorithms/kruskal.ts#L152-L168) | Objeto `estrategia`: sin parámetros, `forzarNoDirigido`. |

**Cantidad de pasos:** 1 (inicio) + una por arista evaluada + 1 (resultado). Lauderdale: 10.

**Complejidad:** ordenar es O(E log E). La búsqueda de empates por paso y la detección de soluciones múltiples agregan recorridos lineales (del orden de V·E en total), aceptable para el tamaño de grafos de la app.

### 4.3 Qué pasa si modifico…

| Cambio | Efecto |
| --- | --- |
| `a.peso - b.peso` por `b.peso - a.peso` ([kruskal.ts:44](src/algorithms/kruskal.ts#L44)) | Árbol de expansión **máxima**. |
| El **orden de carga** de las aristas | Cambia el desempate entre pesos iguales → posible otro árbol, mismo total. |
| Quitar `&& elegidas.length < objetivo` ([kruskal.ts:71](src/algorithms/kruskal.ts#L71)) | Mismo resultado, pero se evalúan todas las aristas restantes y aparecen como descartadas: más pasos en pantalla (en Lauderdale, 5 más). |
| Quitar el chequeo de grupos ([kruskal.ts:77](src/algorithms/kruskal.ts#L77)) | Se aceptan aristas que cierran ciclos: deja de ser un árbol y el total queda mal. |
| Quitar la compresión de caminos ([kruskal.ts:21-27](src/algorithms/kruskal.ts#L21-L27)) | Mismo resultado; solo más lento en grafos grandes. |
| Calcular `alternativas` **después** de `unir` | Los dos grupos ya serían uno solo y nunca se detectaría un empate por paso. |
| Quitar el filtro de lazos ([kruskal.ts:44](src/algorithms/kruskal.ts#L44)) | Sin cambio en el resultado (un lazo siempre está en el mismo grupo y se descartaría), pero aparecería como un paso de descarte. |
| Quitar `forzarNoDirigido` | Igual que en Prim: la pantalla mostraría flechas que el cálculo ignora. |
| Un grafo no conexo | El bucle no llega a `objetivo` y recorre todas las aristas. Total = suma de los árboles de cada componente. |

---

## 5. Modelo 3: Ruta más corta — Dijkstra

### 5.1 Nivel funcional

**Problema.** Encontrar el camino de menor distancia total entre un nodo origen y un nodo destino (caso del libro: de la fábrica al almacén).

**Regla** (técnica de etiquetas del libro). Cada nodo tiene una etiqueta `[distancia acumulada, nodo previo]`, que puede ser temporal o permanente.

1. El origen arranca con distancia 0; el resto, con ∞.
2. Entre los nodos no fijados, elegir el de menor distancia y **fijarlo** (etiqueta permanente): ya no puede mejorar.
3. Para cada vecino no fijado del nodo recién fijado, calcular `distancia del fijado + peso de la arista`. Si es menor que la etiqueta del vecino, actualizarla.
4. Repetir 2 y 3 hasta fijar el destino.
5. Reconstruir la ruta yendo hacia atrás por los "previos" desde el destino.

**Entradas.** El grafo, **origen** y **destino**. Respeta si el grafo es dirigido.

**Salidas.**

- Ruta y distancia total.
- Tabla "Etiquetas por iteración": una fila por iteración y una columna por nodo.
- Avisos: rutas óptimas múltiples, no hay ruta.

**Qué se ve en cada paso.** El nodo recién fijado resaltado; en naranja las aristas hacia sus vecinos; en verde los nodos fijados y la arista por la que se llegó a cada uno; al final, la ruta en azul.

**Ejemplo: Leadville → Dillon (fig. 11.19), de 1 a 7.** El `*` marca etiqueta permanente; una celda con solo `*` es un nodo ya fijado cuya etiqueta no cambia más.

| It. | Fija | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | — | [0, —] | [∞, —] | [∞, —] | [∞, —] | [∞, —] | [∞, —] | [∞, —] |
| 1 | 1 | [0, —]* | [8, 1] | [16, 1] | [18, 1] | [∞, —] | [∞, —] | [∞, —] |
| 2 | 2 | * | [8, 1]* | [14, 2] | [18, 1] | [22, 2] | [∞, —] | [∞, —] |
| 3 | 3 | * | * | [14, 2]* | [18, 1] | [22, 2] | [26, 3] | [∞, —] |
| 4 | 4 | * | * | * | [18, 1]* | [22, 2] | [26, 3] | [∞, —] |
| 5 | 5 | * | * | * | * | [22, 2]* | [26, 3] | [34, 5] |
| 6 | 6 | * | * | * | * | * | [26, 3]* | [32, 6] |
| 7 | 7 | * | * | * | * | * | * | [32, 6]* |

Lectura hacia atrás: 7 ← 6 ← 3 ← 2 ← 1. Ruta **1 → 2 → 3 → 6 → 7**, distancia **32**.

Dos momentos para señalar al explicar: en la iteración 2 el nodo 3 **mejora** de 16 a 14 (conviene ir por 2), y en la 6 el nodo 7 mejora de 34 a 32 (conviene ir por 6).

**Ray Design (fig. 11.10), de 1 a 6:** ruta 1 → 2 → 3 → 5 → 6, distancia **290**, en 5 iteraciones. El nodo 4 **nunca se fija**: queda con etiqueta temporal [300, 2] porque el destino se fija antes y el algoritmo corta.

**Casos especiales.**

| Situación | Comportamiento |
| --- | --- |
| Grafo vacío | Error. |
| Origen = destino | Error: tienen que ser distintos. |
| **Pesos negativos** | Error que lista las aristas. Dijkstra no es correcto con negativos. |
| No hay ruta | No es error: ejecuta, fija lo alcanzable y el resultado dice "No hay ruta" (en dirigidos aclara "respetando el sentido de los arcos"). |
| Grafo dirigido | Una arista A→B no se puede recorrer de B a A. |
| Empate entre dos nodos a fijar | Se fija el que se creó primero. |
| Dos formas de llegar a un nodo con igual distancia | Se queda con la primera encontrada y avisa; si ese nodo está en la ruta final, informa rutas óptimas múltiples. |

### 5.2 Nivel técnico

**Archivo:** [dijkstra.ts](src/algorithms/dijkstra.ts). Función `dijkstra(grafo, origen, destino)`.

**Estado interno.**

| Variable | Tipo | Rol |
| --- | --- | --- |
| `ady` | `Map<id, Vecino[]>` | Lista de adyacencia. Acá se resuelve dirigido / no dirigido. |
| `dist` | `Map<id, number>` | Distancia acumulada; `Infinity` si no se alcanzó. |
| `previo` | `Map<id, {nodo, arista}>` | Desde dónde y por qué arista se llegó. |
| `alternativas` | `Map<id, id[]>` | Otros previos que dan exactamente la misma distancia. |
| `permanentes` | `Set<id>` | Nodos fijados. |
| `iteraciones` | `IteracionDijkstra[]` | Fotos de todas las etiquetas, para la tabla. |

**Recorrido del código.**

| Línea | Qué hace |
| --- | --- |
| [29](src/algorithms/dijkstra.ts#L29) | Arma la lista de adyacencia. |
| [30-36](src/algorithms/dijkstra.ts#L30-L36) | Inicializa todo en ∞ y el origen en 0. |
| [38-47](src/algorithms/dijkstra.ts#L38-L47) | `foto()`: copia el estado de todas las etiquetas. |
| [49-50](src/algorithms/dijkstra.ts#L49-L50) | `arbolActual()`: la arista "previo" de cada nodo fijado (lo que se pinta de verde). |
| [52-62](src/algorithms/dijkstra.ts#L52-L62) | Iteración 0 y paso "Inicio". |
| [64](src/algorithms/dijkstra.ts#L64) | Bucle: mientras el destino no esté fijado. |
| [65-66](src/algorithms/dijkstra.ts#L65-L66) | Candidatos: no fijados con distancia finita. Sin candidatos → no hay ruta → corta. |
| [68-70](src/algorithms/dijkstra.ts#L68-L70) | **Decisión**: el de menor distancia (`find` devuelve el primero en orden de creación) y se fija. |
| [75-91](src/algorithms/dijkstra.ts#L75-L91) | **Relajación** de cada vecino no fijado: si `nueva < actual` actualiza distancia y previo; si `nueva === actual` anota la alternativa. |
| [93-94](src/algorithms/dijkstra.ts#L93-L94) | Guarda la foto de la iteración. |
| [103-113](src/algorithms/dijkstra.ts#L103-L113) | Registra el paso, con su número de `iteracion`. |
| [121-140](src/algorithms/dijkstra.ts#L121-L140) | Reconstruye la ruta hacia atrás y junta los empates de los nodos **de la ruta**. |
| [142-155](src/algorithms/dijkstra.ts#L142-L155) | Paso "Resultado" con `aristasResultado`. |
| [183-198](src/algorithms/dijkstra.ts#L183-L198) | `validar`: parámetros, origen ≠ destino, pesos negativos. |

**Cómo se conecta la tabla con los pasos.** Cada `Paso` lleva `iteracion`. El panel muestra `resultado.iteraciones.slice(0, paso.iteracion + 1)` ([ResultsPanel.tsx:117-118](src/components/ResultsPanel.tsx#L117-L118)): por eso la tabla "crece" una fila al avanzar. La iteración 0 es la foto inicial; la iteración *k* corresponde al *k*-ésimo nodo fijado.

**Por qué se bloquean los negativos.** El algoritmo nunca revisa un nodo ya fijado (`if (permanentes.has(v)) continue`, [línea 76](src/algorithms/dijkstra.ts#L76)). Eso es correcto solo si alargar un camino nunca lo abarata, es decir, si no hay pesos negativos.

**Complejidad:** el mínimo se busca recorriendo todos los nodos → O(V²). Sin cola de prioridad, igual que en Prim y por la misma razón.

**Limitación conocida.** Con aristas de peso **0** puede no detectarse una ruta alternativa de igual distancia, porque el destino puede fijarse antes que el otro nodo previo empatado. La ruta y la distancia informadas siguen siendo correctas; solo puede faltar el aviso de "rutas múltiples".

### 5.3 Qué pasa si modifico…

| Cambio | Efecto |
| --- | --- |
| **Origen o destino** | Resultado distinto; hay que volver a ejecutar. |
| El toggle **Dirigido** | Cambia la lista de adyacencia: puede cambiar la ruta o dejar de existir. Hay que volver a ejecutar. |
| Quitar la validación de negativos ([dijkstra.ts:192-196](src/algorithms/dijkstra.ts#L192-L196)) | Deja ejecutar, pero el resultado puede ser **incorrecto** sin ningún aviso. Para negativos haría falta otro algoritmo (Bellman-Ford). |
| `nueva < actual` por `nueva <= actual` ([dijkstra.ts:80](src/algorithms/dijkstra.ts#L80)) | En empates se queda con el **último** previo en vez del primero: misma distancia, posible otra ruta. Además el `else if` de empates deja de ejecutarse y desaparece el aviso de rutas múltiples. |
| La condición del bucle ([dijkstra.ts:64](src/algorithms/dijkstra.ts#L64)) por `while (true)` | Fija todos los nodos alcanzables (árbol de rutas más cortas a todos). Misma ruta al destino, más iteraciones y filas en la tabla. |
| Quitar `if (permanentes.has(v)) continue` ([dijkstra.ts:76](src/algorithms/dijkstra.ts#L76)) | Sin negativos el resultado no cambia, pero aparecen en naranja (evaluadas) las aristas hacia nodos ya fijados y, con pesos 0, pueden salir avisos de empate que no corresponden. |
| `find` por "el último" en el desempate ([dijkstra.ts:69](src/algorithms/dijkstra.ts#L69)) | Cambia el orden en que se fijan nodos empatados; la distancia final es la misma. Puede fallar el test del orden de fijado. |
| El **orden de creación de nodos** | Mismo efecto que el anterior: es lo que desempata. |
| `forzarNoDirigido: true` en Dijkstra | Todo grafo se trataría como no dirigido y, si es el único con soporte, la opción "Dirigido" desaparecería de la barra. |
| Quitar "origen ≠ destino" | Ejecuta: fija el origen, corta y devuelve ruta de un solo nodo con distancia 0. |

---

## 6. Prim vs. Kruskal: en qué se diferencian

| | Prim | Kruskal |
| --- | --- | --- |
| Punto de vista | Nodos: hace crecer **un** árbol | Aristas: va uniendo **varios** grupos |
| Parámetro | Nodo inicial | Ninguno |
| En cada paso compara | Las aristas que salen del árbol actual | La siguiente arista de la lista ordenada |
| Cómo evita ciclos | Solo acepta aristas con un extremo afuera | Union-find: descarta si ambos extremos están en el mismo grupo |
| Aristas descartadas (gris) | Nunca | Sí |
| Grafo no conexo | Árbol del componente del nodo inicial | Bosque de todos los componentes |
| Total en grafo conexo | **Siempre igual** | **Siempre igual** |
| Aviso de empate por paso | Cualquier empate entre candidatas | Solo si la otra arista une los mismos grupos |
| Aviso final de soluciones múltiples | Misma función (`reemplazosEquivalentes`) | Misma función |

Ejemplo del caso no conexo (aristas `A–B 1` y `C–D 2`): Prim desde A da total 1 y deja afuera C y D; Kruskal da total 3 (los dos árboles) e informa que C y D están fuera del componente de A.

---

## 7. Qué pasa si modifico algo (general)

### 7.1 Usando la app

Después de ejecutar, el resultado queda atado a una **clave** = estrategia + parámetros + firma del grafo ([App.tsx:90-94](src/App.tsx#L90-L94), [grafo.ts:101-107](src/lib/grafo.ts#L101-L107)).

| Acción | ¿Se mantiene el resultado? |
| --- | --- |
| Mover nodos, Auto-layout, Centrar | **Sí.** La firma no incluye posiciones. |
| Cambiar un peso | No. |
| Agregar o borrar nodos o aristas | No. |
| Renombrar un nodo | No (el nombre forma parte de la firma). |
| Cambiar Dirigido / No dirigido | No (en Prim y Kruskal el toggle está forzado, así que no aplica). |
| Cambiar estrategia o un parámetro | No. |
| **Ctrl+Z** que deja el grafo como estaba al ejecutar | **Sí, reaparece**: los ids se conservan en el historial y la clave vuelve a coincidir. |

Cuando el resultado deja de ser vigente, se borran los colores y el panel muestra *"El grafo o los parámetros cambiaron: volvé a ejecutar"*. No se recalcula solo: es a propósito, para que el usuario decida cuándo ejecutar.

Otros comportamientos:

- **Borrar el nodo elegido como parámetro**: se toma el nodo por defecto (primero; para destino, el último).
- **Dijkstra con un solo nodo**: origen y destino por defecto coinciden → error "tienen que ser nodos distintos".
- **Ejecutar vs. Paso a paso**: el cálculo es el mismo; solo cambia si arranca animando o queda en el primer paso.

### 7.2 Configuración (`/config` y `config.json`)

| Cambio | Efecto |
| --- | --- |
| Sacar una estrategia de `estrategias` | Desaparece del selector, de la pantalla de inicio y sus ejemplos del libro. |
| Dejar solo Prim y/o Kruskal | Se oculta "Dirigido / No dirigido" y todo grafo se trata como no dirigido. |
| `animaciones: false` | Ejecutar salta directo al resultado; sin transiciones de color. |
| `pasoAPaso: false` | Sin botón Paso a paso, sin controles y sin leyenda. |
| `historialPasos: false` | Se oculta la lista "Todos los pasos". |
| Poner un id de estrategia que no existe | Se ignora; si no queda ninguno válido, se muestran todas. |

Ninguna opción de configuración cambia el resultado de un algoritmo: solo qué se muestra.

### 7.3 Código compartido

| Cambio | Efecto |
| --- | --- |
| Agregar un archivo en `src/algorithms/` que exporte `estrategia` | Aparece solo en el selector, con validación, paso a paso y colores. Si devuelve un `tipo` de resultado nuevo, hay que sumarlo a `Resultado` y agregar su vista en `ResultsPanel`. |
| Cambiar el `id` de una estrategia | Hay que actualizar `config.json` y el campo `estrategia` de los ejemplos en `libro.ts`; si no, el ejemplo queda oculto. Falla el test del registro. |
| Cambiar `orden` | Cambia la posición en el selector y cuál es la estrategia inicial. Falla el test del registro si se altera el orden. |
| Agregar un campo a `Paso` | No pasa nada hasta que `GraphCanvas` o `ResultsPanel` lo lean. |
| Quitar o renombrar un campo de `Paso` | TypeScript marca error en los tres algoritmos y en los dos componentes que lo usan. |
| Cambiar los colores | Solo [GraphCanvas.tsx:76-91](src/components/GraphCanvas.tsx#L76-L91) y la leyenda en [App.tsx:457-477](src/App.tsx#L457-L477). El orden de las reglas define qué color gana. |
| Cambiar `listaAdyacencia` | Afecta a Dijkstra, a la conexidad (Prim y Kruskal) y a la detección de soluciones múltiples. |
| Cambiar las velocidades | `VELOCIDADES` en [StepControls.tsx:1-5](src/components/StepControls.tsx#L1-L5) (milisegundos por paso). |

Después de cualquier cambio en `src/algorithms/`: `npm test` y `npm run typecheck`.

---

## 8. Tests que respaldan cada afirmación

`npm test` corre 39 tests (todos pasan). Los de algoritmos están en [algoritmos.test.ts](src/algorithms/algoritmos.test.ts):

| Qué se afirma | Test |
| --- | --- |
| Prim reproduce la tabla 11.1: orden 1-3, 3-4, 3-2, 2-5, 3-6, 6-8, 8-7, total 16, 9 pasos | `Prim desde el nodo 1 reproduce la tabla 11.1…` |
| Prim avisa empates en los pasos 3 y 4, y soluciones múltiples | `avisa empates y soluciones óptimas múltiples…` |
| Kruskal da el mismo total 16 con 7 aristas | `Kruskal obtiene la misma distancia total 16` |
| Prim da 16 desde cualquier nodo inicial | `Prim da 16 empiece donde empiece` |
| Grafo no conexo: se detecta y es advertencia | `detecta grafo no conexo` |
| Kruskal descarta aristas que forman ciclo | `Kruskal descarta aristas que forman ciclo` |
| Sin empates no se informan soluciones múltiples | `árbol único no marca soluciones múltiples` |
| Árbol mínimo ignora el sentido | `ignora la dirección de las aristas` |
| Leadville: ruta 1-2-3-6-7, distancia 32 | `ruta más corta 1-2-3-6-7 con distancia 32` |
| Leadville: orden de fijado 1:0, 2:8, 3:14, 4:18, 5:22, 6:26, 7:32 | `fija los nodos en el orden del libro…` |
| Ray Design: 1-2-3-5-6, distancia 290 | `ruta 1-2-3-5-6 con distancia 290` |
| Sin ruta al destino | `avisa si no hay ruta al destino` |
| Dijkstra respeta el sentido | `respeta el sentido en grafos dirigidos` |
| Pesos negativos bloqueados | `bloquea pesos negativos` |
| Origen ≠ destino | `exige origen y destino distintos` |
| Rutas óptimas múltiples | `detecta rutas óptimas múltiples` |

---

## 9. Preguntas típicas y respuesta corta

**¿Por qué Prim y Kruskal dan el mismo total?** Los dos son algoritmos voraces correctos para el mismo problema: el peso del árbol mínimo es único aunque el árbol no lo sea.

**¿Cómo evita ciclos cada uno?** Prim solo toma aristas con un extremo fuera del árbol. Kruskal usa union-find y descarta la arista si los dos extremos ya están en el mismo grupo.

**¿Qué pasa si hay empate?** Se elige según el orden de carga (aristas en Prim y Kruskal, nodos en Dijkstra) y se avisa. Al final se confirma si de verdad existe otra solución óptima.

**¿Por qué Dijkstra no acepta pesos negativos?** Porque fija un nodo como definitivo cuando es el más cercano y no lo vuelve a revisar; con un peso negativo podría aparecer después un camino más barato.

**¿Por qué Prim y Kruskal ignoran el sentido?** El árbol de expansión mínima está definido para grafos no dirigidos (conectar, no recorrer). La estrategia lo declara con `forzarNoDirigido`.

**¿Dónde está "la lógica"?** En `src/algorithms/`: un archivo por modelo, funciones puras sin interfaz. Las líneas de decisión son [prim.ts:42-47](src/algorithms/prim.ts#L42-L47), [kruskal.ts:77](src/algorithms/kruskal.ts#L77) y [dijkstra.ts:68-91](src/algorithms/dijkstra.ts#L68-L91).

**¿Cómo se anima?** No se anima el algoritmo: se calcula todo de una vez y se guarda la lista de pasos. La animación es un temporizador que suma 1 al índice ([App.tsx:100-108](src/App.tsx#L100-L108)).

**¿Cómo se agrega otro modelo (por ejemplo, flujo máximo)?** Un archivo nuevo en `src/algorithms/` que exporte `estrategia`. El registro es automático.

**¿Cómo sé que está bien?** Los tests reproducen los tres ejemplos del libro con sus resultados exactos (16, 32 y 290) y el orden de los pasos.
