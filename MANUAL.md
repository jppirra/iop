# Manual de los modelos de redes — Grupo 3, IOP 2026

Este manual explica cómo está resuelto cada modelo de la app (Prim, Kruskal, Dijkstra y Ford-Fulkerson) en dos niveles:

- **Nivel funcional**: qué problema resuelve, qué regla aplica en cada paso, qué muestra la pantalla y qué casos especiales contempla. No hace falta leer código.
- **Nivel técnico**: en qué archivo y línea está cada decisión, qué estructuras de datos usa y **qué pasa si se modifica** cada parte.

Las trazas de los ejemplos son la salida real del código sobre los ejemplos del libro (cap. 11 de Render, *Métodos cuantitativos para los negocios*) y, para flujo máximo, sobre la red del apunte de Ford-Fulkerson ([Lib/](Lib/)).

## Índice

1. [Idea central de la solución](#1-idea-central-de-la-solución)
2. [Piezas comunes a todos los modelos](#2-piezas-comunes-a-todos-los-modelos)
3. [Modelo 1: Árbol de expansión mínima — Prim](#3-modelo-1-árbol-de-expansión-mínima--prim)
4. [Modelo 2: Árbol de expansión mínima — Kruskal](#4-modelo-2-árbol-de-expansión-mínima--kruskal)
5. [Modelo 3: Ruta más corta — Dijkstra](#5-modelo-3-ruta-más-corta--dijkstra)
6. [Modelo 4: Flujo máximo — Ford-Fulkerson](#6-modelo-4-flujo-máximo--ford-fulkerson)
7. [Prim vs. Kruskal: en qué se diferencian](#7-prim-vs-kruskal-en-qué-se-diferencian)
8. [Qué pasa si modifico algo (general)](#8-qué-pasa-si-modifico-algo-general)
9. [Tests que respaldan cada afirmación](#9-tests-que-respaldan-cada-afirmación)
10. [Preguntas típicas y respuesta corta](#10-preguntas-típicas-y-respuesta-corta)

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

## 2. Piezas comunes a todos los modelos

### 2.1 Los datos: `Grafo`, `Paso`, `Resultado`

Definidos en [graph.ts](src/types/graph.ts).

| Tipo | Qué es | Detalle importante |
| --- | --- | --- |
| `Nodo` | `id`, `nombre`, `x`, `y` | El `id` es interno y no cambia; el `nombre` es lo que ve el usuario. Los algoritmos trabajan con `id` y traducen a `nombre` solo para los textos. |
| `Arista` | `id`, `origen`, `destino`, `peso` | `origen`/`destino` son ids de nodo. En un grafo no dirigido el orden origen/destino no importa. |
| `Grafo` | `dirigido`, `nodos[]`, `aristas[]` | El **orden** de `nodos` y `aristas` es el orden de carga, y es el que desempata. |
| `Paso` | Una "foto" de la ejecución | Ver tabla siguiente. |
| `Resultado` | `ResultadoArbol`, `ResultadoRuta` o `ResultadoFlujo` | Unión discriminada por `tipo` (`'arbol'` / `'ruta'` / `'flujo'`). |

Campos de un `Paso` ([graph.ts:27-50](src/types/graph.ts#L27-L50)) y cómo se ven:

| Campo | Significado | Color en el grafo |
| --- | --- | --- |
| `titulo`, `descripcion` | Texto explicativo del paso | — (panel de resultados) |
| `nodosActuales` | Protagonista del paso | Nodo naranja con borde grueso |
| `aristasEvaluadas` | Aristas comparadas en este paso | Naranja punteado |
| `nodosIncluidos`, `aristasIncluidas` | Lo que ya forma parte de la solución | Verde |
| `aristasDescartadas` | Aristas rechazadas (ciclo) | Gris punteado |
| `aristasResultado` | Solución final | Azul |
| `aristasCorte` | Arcos del corte mínimo (solo Ford-Fulkerson) | Rojo punteado |
| `etiquetasAristas` | Texto que reemplaza al peso sobre cada arista: `flujo/capacidad` (solo Ford-Fulkerson) | — (cambia el número de la arista) |
| `empate` | Aviso de empate | Cartel amarillo |
| `iteracion` | Fila de la tabla de etiquetas (Dijkstra) o estado del flujo por arco (Ford-Fulkerson) | — |

El pintado está en [GraphCanvas.tsx:184-206](src/components/GraphCanvas.tsx#L184-L206). Si una arista cae en dos listas a la vez gana la regla que está **más abajo** en la hoja de estilos ([GraphCanvas.tsx:76-96](src/components/GraphCanvas.tsx#L76-L96)): descartada < evaluada < incluida < resultado < corte. Por eso la arista recién elegida se ve verde aunque también figure como "evaluada", y un arco del corte mínimo se ve rojo aunque también lleve flujo.

En el mismo efecto se cambia el texto de cada arista ([GraphCanvas.tsx:190-193](src/components/GraphCanvas.tsx#L190-L193)): si el paso trae `etiquetasAristas` se muestra ese texto; si no (o si no hay ejecución vigente) vuelve el peso.

### 2.2 El contrato `Estrategia`

Cada modelo exporta un objeto `estrategia` ([graph.ts:151-165](src/types/graph.ts#L151-L165)) con:

| Campo | Para qué sirve |
| --- | --- |
| `id` | Identificador. Lo usan `config.json` y los ejemplos del libro. |
| `nombre`, `grupo`, `descripcion` | Textos del selector "Estrategia". |
| `orden` | Posición en el selector (Prim 10, Kruskal 20, Dijkstra 30, Ford-Fulkerson 40). |
| `parametros` | Qué nodos hay que pedirle al usuario (`inicio`, `origen`, `destino`). |
| `forzarNoDirigido` | Si es `true`, el grafo se trata y se dibuja como no dirigido. |
| `leyenda` | Opcional. Textos propios para la leyenda de colores; si falta, se usan los generales. Hoy solo la define Ford-Fulkerson. |
| `validar(grafo, parametros)` | Devuelve `errores` (deshabilitan Ejecutar) y `advertencias` (solo avisan). |
| `ejecutar(grafo, parametros)` | Devuelve `{ pasos, resultado }`. |

El registro es automático: [index.ts](src/algorithms/index.ts) usa `import.meta.glob` para tomar todo archivo de `src/algorithms/` que exporte `estrategia`. No hay una lista escrita a mano.

Que esté registrado no significa que se vea: solo se muestran las estrategias cuyo `id` figura en `estrategias` de [config.json](src/config/config.json). Ford-Fulkerson está registrado pero **no figura ahí**, así que queda oculto hasta habilitarlo en `/config` (ver [sección 8.2](#82-configuración-config-y-configjson)).

### 2.3 Qué hace `App` antes de llamar al algoritmo

Todo en [App.tsx](src/App.tsx):

1. **Grafo efectivo** ([App.tsx:70-74](src/App.tsx#L70-L74)): si la estrategia tiene `forzarNoDirigido` (Prim, Kruskal), o la configuración no permite dirigidos, se pasa una copia con `dirigido: false`. El grafo original no se toca.
2. **Parámetros efectivos** ([App.tsx:77-85](src/App.tsx#L77-L85)): si el usuario no eligió nodo, o el nodo elegido fue borrado, se usa uno por defecto: el **primer** nodo para `inicio`/`origen` y el **último** para `destino`.
3. **Validación** ([App.tsx:87-90](src/App.tsx#L87-L90)): se recalcula en cada cambio; con errores, los botones quedan deshabilitados.
4. **Ejecución** ([App.tsx:141-148](src/App.tsx#L141-L148)): guarda `{ clave, datos }`, donde `clave` identifica con qué estrategia, parámetros y grafo se calculó.
5. **Vigencia** ([App.tsx:93-97](src/App.tsx#L93-L97)): el resultado solo se muestra mientras la clave actual coincida con la guardada. Ver [sección 8.1](#81-usando-la-app).

### 2.4 Utilidades compartidas

En [utils.ts](src/algorithms/utils.ts):

| Función | Qué hace | Quién la usa |
| --- | --- | --- |
| `listaAdyacencia` | Para cada nodo, sus vecinos y la arista que los une. Si el grafo no es dirigido, cada arista se carga en los dos sentidos. | Dijkstra, conexidad (Ford-Fulkerson arma la suya, porque necesita también los arcos inversos) |
| `esConexo` | Recorrido en profundidad desde el primer nodo, ignorando sentido. | Prim, Kruskal |
| `reemplazosEquivalentes` | Detecta si existe **otro** árbol con el mismo total. | Prim, Kruskal |
| `mapaNombres`, `describirArista` | Traducen ids a textos (`1–3`, `A→B`). | Todos |
| `validarGrafoNoVacio`, `validarParametroNodo` | Validaciones comunes. | Todos |
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

**Cómo se conecta la tabla con los pasos.** Cada `Paso` lleva `iteracion`. El panel muestra `resultado.iteraciones.slice(0, paso.iteracion + 1)` ([ResultsPanel.tsx:118-119](src/components/ResultsPanel.tsx#L118-L119)): por eso la tabla "crece" una fila al avanzar. La iteración 0 es la foto inicial; la iteración *k* corresponde al *k*-ésimo nodo fijado.

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

## 6. Modelo 4: Flujo máximo — Ford-Fulkerson

> **Oculto por defecto.** Este modelo no figura en `config.json`: para verlo hay que habilitarlo en `/config` (vale solo en ese navegador) o sumar `"ford-fulkerson"` a `estrategias` en [config.json](src/config/config.json) para que lo vean todos.

### 6.1 Nivel funcional

**Problema.** Dada una red donde cada arco tiene una **capacidad** (lo máximo que puede transportar), encontrar cuánto se puede enviar como máximo desde un nodo **fuente (S)** hasta un nodo **sumidero (T)**. Caso del apunte: una red de transmisión de datos, en Mbps.

**Reglas de la red** (las tres del apunte):

- Todo el flujo sale de la fuente y llega al sumidero; ningún otro nodo genera ni destruye unidades.
- **Capacidad**: el flujo de un arco nunca supera su capacidad (`0 ≤ flujo ≤ capacidad`).
- **Conservación**: en cada nodo intermedio, lo que entra es igual a lo que sale.

**Conceptos.**

| Concepto | Qué es |
| --- | --- |
| Capacidad residual | Lo que todavía se puede enviar por un arco: `capacidad − flujo`. |
| Red residual | La red vista con las capacidades residuales en lugar de las originales. |
| Arco inverso | Si un arco A→B ya lleva flujo, en la red residual se puede "ir" de B a A por hasta ese flujo. Hacerlo no envía nada hacia atrás: **deshace** flujo ya asignado para reencauzarlo por otro lado. |
| Camino de aumento | Un camino de S a T en la red residual, usando solo tramos con capacidad residual positiva. |
| Cuello de botella (`k`) | La menor capacidad residual del camino: lo máximo que cabe enviar por él. |
| Corte mínimo | Conjunto de arcos saturados que separa la fuente del sumidero. Su capacidad es igual al flujo máximo. |

**Regla** (el bucle del apunte).

1. Arrancar con flujo 0 en todos los arcos.
2. Buscar un camino de aumento de S a T en la red residual.
3. Calcular el cuello de botella `k` del camino.
4. Sumar `k` al flujo de cada arco del camino (en un arco inverso, restarlo).
5. Repetir 2 a 4 hasta que no quede ningún camino de aumento.

**Entradas.** El grafo, la **fuente** y el **sumidero**. El peso de cada arista se interpreta como su capacidad. Respeta si el grafo es dirigido.

**Salidas.**

- Flujo máximo.
- Tabla "Caminos de aumento": una fila por iteración, con el camino, su cuello de botella `k` y el flujo acumulado.
- Tabla "Flujo por arco": flujo / capacidad y holgura (`capacidad − flujo`) de cada arco; "0 (lleno)" si está saturado.
- Corte mínimo: los nodos de cada lado, los arcos que cruzan y su capacidad.

**Qué se ve en cada paso.** Sobre cada arco aparece `flujo/capacidad` en lugar del peso. Cada iteración son **dos pasos**:

- *Camino de aumento*: el camino encontrado en naranja, con la capacidad residual de cada tramo y el cálculo de `k`.
- *Aumentar el flujo*: los números de los arcos se actualizan; en verde, todos los arcos que llevan flujo.

Al final hay dos pasos más: *Condición de parada* (en verde los nodos todavía alcanzables desde la fuente, en rojo punteado el corte mínimo) y *Resultado* (en azul el flujo final, en rojo el corte).

**Ejemplo: red de transmisión del apunte**, de S a T. Arcos: S→A 10, A→T 8, A→B 2, S→B 10, B→T 10.

| Paso | Qué pasa | Flujo acumulado |
| --- | --- | --- |
| Inicio | Todos los arcos en 0 | 0 |
| Iteración 1: camino | S → A → T. Residuales: S→A = 10, A→T = 8. `k = min(10, 8) = 8` | 0 |
| Iteración 1: aumento | S→A 8/10, A→T 8/8. Se satura A→T | 8 |
| Iteración 2: camino | S → B → T. Residuales: S→B = 10, B→T = 10. `k = min(10, 10) = 10` | 8 |
| Iteración 2: aumento | S→B 10/10, B→T 10/10. Se saturan S→B y B→T | 18 |
| Condición de parada | Desde S se alcanza {S, A, B}; no se alcanza {T}. Corte: A→T (8), B→T (10) | 18 |
| Resultado | Flujo máximo `8 + 10 = 18`, igual a la capacidad del corte | 18 |

Estado final de los arcos:

| Arco | Flujo / Capacidad | Holgura |
| --- | --- | --- |
| S → A | 8 / 10 | 2 |
| A → T | 8 / 8 | 0 (lleno) |
| A → B | 0 / 2 | 2 |
| S → B | 10 / 10 | 0 (lleno) |
| B → T | 10 / 10 | 0 (lleno) |

**Diferencia con el apunte en el corte mínimo.** El apunte (pág. 6) da la partición {S, A} | {B, T} con los arcos A→T y S→B, capacidad 18. Esa partición también la cruza A→B (capacidad 2), así que en realidad vale 8 + 10 + 2 = 20 y no es un corte mínimo. La app informa {S, A, B} | {T}, con A→T (8) + B→T (10) = **18**: después de la iteración 2 todavía se puede llegar de S a A (holgura 2) y de A a B (holgura 2), por eso B queda del lado de la fuente. El flujo máximo (18) coincide con el apunte.

**Ejemplo de arco inverso.** Red dirigida con todas las capacidades en 1: S→A, A→B, B→T, S→C, C→B, A→D, D→E, E→T.

| Iteración | Camino | `k` | Qué pasa |
| --- | --- | --- | --- |
| 1 | S → A → B → T | 1 | Es el camino más corto. Ocupa A→B. |
| 2 | S → C → B → A → D → E → T | 1 | El tramo B→A va **en contra** del flujo de A→B: lo deshace. A→B vuelve a 0/1. |

Resultado: flujo máximo **2**. Los dos caminos que quedan en la práctica son S → A → D → E → T y S → C → B → T: la unidad que en la iteración 1 iba por A→B se reencauzó por A→D. Sin arcos inversos el algoritmo se habría trabado en 1, porque la primera elección bloqueaba a la segunda.

**Casos especiales.**

| Situación | Comportamiento |
| --- | --- |
| Grafo vacío | Error. |
| Fuente = sumidero | Error: tienen que ser distintos. |
| **Capacidades negativas** | Error que lista los arcos. |
| Capacidad 0 | Se acepta: el arco nunca lleva flujo. |
| Capacidades decimales | Se aceptan; los resultados se redondean para no arrastrar errores (0,1 + 0,2 da 0,3). |
| No hay camino de S a T | No es error: ejecuta y el resultado dice que el flujo máximo es 0. |
| Grafo dirigido | Cada arco solo lleva flujo en su sentido (más el arco inverso, que solo deshace). |
| **Grafo no dirigido** | Advertencia (deja ejecutar). Cada arista puede llevar flujo en cualquiera de los dos sentidos, hasta su capacidad. La tabla muestra cada arco en el sentido en que quedó el flujo. |
| Varios caminos posibles | Se elige el más corto en cantidad de arcos; entre iguales, el que aparece primero según el orden de carga de las aristas. |
| Arista de un nodo a sí mismo | Se ignora. |

### 6.2 Nivel técnico

**Archivo:** [fordFulkerson.ts](src/algorithms/fordFulkerson.ts). Función `fordFulkerson(grafo, fuente, sumidero)`.

**Estado interno.**

| Variable | Tipo | Rol |
| --- | --- | --- |
| `aristas` | `Arista[]` | Las aristas del grafo sin lazos. |
| `flujo` | `Map<idArista, number>` | Flujo **neto** de cada arista: positivo si va de `origen` a `destino`, negativo si va al revés (solo puede ser negativo en grafos no dirigidos). |
| `salidas` | `Map<id, Tramo[]>` | Lista de adyacencia de la red residual: por cada arista hay dos tramos, uno en su sentido (`sentido: 1`) y uno al revés (`sentido: -1`). |
| `iteraciones` | `IteracionFlujo[]` | Foto del flujo de todos los arcos después de cada iteración, para las tablas. La 0 es el estado inicial. |
| `total` | `number` | Flujo acumulado. |
| `pasos` | `Paso[]` | Dos entradas por iteración, más inicio, condición de parada y resultado. |

**No se construye una red residual aparte.** Se calcula al vuelo con `residual(tramo)` ([fordFulkerson.ts:58-62](src/algorithms/fordFulkerson.ts#L58-L62)):

| Tramo | Grafo dirigido | Grafo no dirigido |
| --- | --- | --- |
| En el sentido de la arista | `capacidad − flujo` | `capacidad − flujo` |
| Al revés | `flujo` (solo se puede deshacer lo enviado) | `capacidad + flujo` (deshacer lo enviado y además enviar en el otro sentido) |

**Recorrido del código.**

| Línea | Qué hace |
| --- | --- |
| [20-22](src/algorithms/fordFulkerson.ts#L20-L22) | `EPS` y `limpiar()`: tolerancia y redondeo a 9 decimales para capacidades decimales. |
| [44](src/algorithms/fordFulkerson.ts#L44) | Descarta los lazos. |
| [46](src/algorithms/fordFulkerson.ts#L46) | Flujo 0 en todas las aristas. |
| [51-55](src/algorithms/fordFulkerson.ts#L51-L55) | Arma `salidas`: los dos tramos de cada arista. |
| [58-62](src/algorithms/fordFulkerson.ts#L58-L62) | `residual()`: capacidad residual de un tramo (tabla de arriba). |
| [64](src/algorithms/fordFulkerson.ts#L64) | `esInverso()`: el tramo va en contra del flujo ya asignado. |
| [68-84](src/algorithms/fordFulkerson.ts#L68-L84) | **Búsqueda del camino**: BFS desde la fuente por tramos con residual positiva. Corta al alcanzar el sumidero. Devuelve el camino (o `null`) y los nodos alcanzados. |
| [86-93](src/algorithms/fordFulkerson.ts#L86-L93) | `arcos()`, `etiquetas()`, `conFlujo()`: arman la foto para la tabla, el texto `flujo/capacidad` de cada arista y la lista de arcos con flujo. |
| [95-106](src/algorithms/fordFulkerson.ts#L95-L106) | Iteración 0 y paso "Inicio". |
| [109](src/algorithms/fordFulkerson.ts#L109) | Bucle: mientras exista un camino de aumento. |
| [115-116](src/algorithms/fordFulkerson.ts#L115-L116) | **Cuello de botella**: `k` = mínimo de las residuales del camino. |
| [119-135](src/algorithms/fordFulkerson.ts#L119-L135) | Paso "camino de aumento". Todavía no se modificó el flujo. |
| [137](src/algorithms/fordFulkerson.ts#L137) | **Aumento**: a cada arista del camino se le suma `sentido × k` (suma si va en su sentido, resta si es inverso). |
| [140](src/algorithms/fordFulkerson.ts#L140) | Arcos que quedaron saturados (flujo = capacidad). |
| [147-163](src/algorithms/fordFulkerson.ts#L147-L163) | Guarda la foto de la iteración y registra el paso "aumentar el flujo". |
| [165](src/algorithms/fordFulkerson.ts#L165) | Busca el próximo camino. |
| [169-178](src/algorithms/fordFulkerson.ts#L169-L178) | **Corte mínimo**: `lado` = nodos alcanzados en la última búsqueda (la que no encontró camino); el corte son las aristas que van de un nodo alcanzado a uno no alcanzado. |
| [183-199](src/algorithms/fordFulkerson.ts#L183-L199) | Paso "Condición de parada" con `aristasCorte`. |
| [202-218](src/algorithms/fordFulkerson.ts#L202-L218) | Paso "Resultado" con `aristasResultado` y `aristasCorte`. |
| [233-268](src/algorithms/fordFulkerson.ts#L233-L268) | Objeto `estrategia`: parámetros `origen` (fuente) y `destino` (sumidero), leyenda propia, validación. |

**Cantidad de pasos:** 1 (inicio) + 2 por iteración + 1 (condición de parada) + 1 (resultado). Red del apunte: 7.

**Por qué BFS.** El apunte permite buscar el camino con BFS o DFS. Con BFS (variante conocida como Edmonds-Karp) siempre se toma el camino con menos arcos, lo que garantiza que el algoritmo **termina** también con capacidades decimales, y que el recorrido sea siempre el mismo para un mismo grafo.

**Por qué el corte sale de la última búsqueda.** Cuando el BFS no llega al sumidero, recorrió todo lo alcanzable desde la fuente con residual positiva. Todo arco que sale de ese conjunto tiene residual 0, o sea está saturado: esos arcos son el corte, y la suma de sus capacidades es exactamente el flujo que pasa. Es el teorema de flujo máximo = corte mínimo, y por eso el resultado es óptimo. Si hay varios cortes mínimos, se informa el más cercano a la fuente.

**Cómo se conectan las tablas con los pasos.** Cada `Paso` lleva `iteracion` = cantidad de iteraciones **ya aplicadas**: el paso "camino de aumento" de la iteración *n* lleva `n − 1` y el paso "aumentar el flujo" lleva `n`. El panel ([ResultsPanel.tsx:198-200](src/components/ResultsPanel.tsx#L198-L200)) muestra los caminos `1..iteracion` y el flujo por arco de `iteraciones[iteracion]`. Por eso las tablas cambian recién en el paso de aumento.

**Por qué los parámetros se llaman `origen` y `destino`.** Se reutilizan las claves de Dijkstra, con otras etiquetas ("fuente (S)", "sumidero (T)"). Así valen los mismos valores por defecto (primer y último nodo) y el botón "Aleatorio" funciona sin cambios.

**Complejidad:** cada búsqueda es O(E) y con BFS hay a lo sumo O(V·E) iteraciones → O(V·E²). Para los grafos de la app es instantáneo.

### 6.3 Qué pasa si modifico…

| Cambio | Efecto |
| --- | --- |
| **Fuente o sumidero** | Resultado distinto; hay que volver a ejecutar. |
| El toggle **Dirigido** | Cambia la red residual: en no dirigido cada arista sirve en los dos sentidos, así que el flujo máximo puede ser mayor. Hay que volver a ejecutar. |
| El **orden de carga** de las aristas | Puede cambiar qué camino se elige entre los de igual longitud y cómo se reparte el flujo en los arcos. El **flujo máximo no cambia**. Puede fallar el test que compara los caminos del apunte. |
| `cola.shift()` por `cola.pop()` ([fordFulkerson.ts:72](src/algorithms/fordFulkerson.ts#L72)) | La búsqueda pasa de BFS a DFS. Mismo flujo máximo con capacidades enteras; cambian los caminos y la cantidad de iteraciones, y con capacidades decimales se pierde la garantía de terminación. Fallan los tests que comparan los caminos. |
| Quitar los tramos inversos ([fordFulkerson.ts:54](src/algorithms/fordFulkerson.ts#L54)) | El algoritmo deja de poder corregir decisiones tempranas: puede informar un flujo **menor al máximo** sin ningún aviso (en el ejemplo de arco inverso daría 1 en vez de 2). Falla ese test. |
| `residual(t) <= EPS` por `< 0` ([fordFulkerson.ts:74](src/algorithms/fordFulkerson.ts#L74)) | Se aceptarían tramos sin capacidad: caminos con `k = 0` y bucle infinito. |
| `Math.min` por `Math.max` ([fordFulkerson.ts:116](src/algorithms/fordFulkerson.ts#L116)) | Se enviaría más de lo que admite el arco más chico: se viola la capacidad y el resultado no es válido. |
| Quitar `limpiar()` ([fordFulkerson.ts:22](src/algorithms/fordFulkerson.ts#L22)) | Con enteros no cambia nada. Con decimales aparecen valores como 0,30000000000000004 en las tablas. Falla el test de decimales. |
| Quitar la validación de negativos ([fordFulkerson.ts:258-262](src/algorithms/fordFulkerson.ts#L258-L262)) | Deja ejecutar; un arco con capacidad negativa nunca se usa en su sentido, pero su arco inverso tampoco, y el corte mínimo puede sumar mal. |
| Pasar la advertencia de no dirigido a `errores` ([fordFulkerson.ts:263-264](src/algorithms/fordFulkerson.ts#L263-L264)) | El algoritmo exigiría grafo dirigido, como el apunte. Falla el test que espera una advertencia, y "Aleatorio" (que genera grafos no dirigidos) dejaría de poder ejecutarse hasta cambiar el toggle. |
| `forzarNoDirigido: true` | Toda red se trataría como no dirigida. |
| Quitar `leyenda` de la estrategia ([fordFulkerson.ts:243-248](src/algorithms/fordFulkerson.ts#L243-L248)) | Se mostraría la leyenda general (con "Descartado (formaría ciclo)" y sin el rojo del corte). |
| Quitar `etiquetasAristas` de los pasos | Los arcos mostrarían solo la capacidad; el flujo se vería únicamente en la tabla. Falla un test. |
| Sacar `"ford-fulkerson"` de la configuración | Desaparece del selector, de la pantalla de inicio y su ejemplo del menú. No cambia ningún cálculo. |

---

## 7. Prim vs. Kruskal: en qué se diferencian

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

## 8. Qué pasa si modifico algo (general)

### 8.1 Usando la app

Después de ejecutar, el resultado queda atado a una **clave** = estrategia + parámetros + firma del grafo ([App.tsx:93-97](src/App.tsx#L93-L97), [grafo.ts:101-107](src/lib/grafo.ts#L101-L107)).

| Acción | ¿Se mantiene el resultado? |
| --- | --- |
| Mover nodos, Auto-layout, Centrar | **Sí.** La firma no incluye posiciones. |
| Cambiar un peso | No. |
| Agregar o borrar nodos o aristas | No. |
| Renombrar un nodo | No (el nombre forma parte de la firma). |
| Cambiar Dirigido / No dirigido | No (en Prim y Kruskal el toggle está forzado, así que no aplica). |
| Cambiar una capacidad (Ford-Fulkerson) | No: la capacidad es el peso de la arista. |
| Cambiar estrategia o un parámetro | No. |
| **Ctrl+Z** que deja el grafo como estaba al ejecutar | **Sí, reaparece**: los ids se conservan en el historial y la clave vuelve a coincidir. |

Cuando el resultado deja de ser vigente, se borran los colores, las aristas vuelven a mostrar su peso (en Ford-Fulkerson dejan de mostrar `flujo/capacidad`) y el panel muestra *"El grafo o los parámetros cambiaron: volvé a ejecutar"*. No se recalcula solo: es a propósito, para que el usuario decida cuándo ejecutar.

Otros comportamientos:

- **Cargar un grafo grande**: si la carga masiva trae más de 20 nodos sin posición, se acomodan solos con Auto-layout en lugar de dibujarse en círculo (`NODOS_EN_CIRCULO` en [App.tsx:35-36](src/App.tsx#L35-L36)).
- **Borrar el nodo elegido como parámetro**: se toma el nodo por defecto (primero; para destino, el último).
- **Dijkstra o Ford-Fulkerson con un solo nodo**: origen y destino por defecto coinciden → error "tienen que ser nodos distintos".
- **Cambiar de estrategia**: los nodos elegidos se conservan entre Dijkstra y Ford-Fulkerson, porque usan los mismos parámetros (`origen` y `destino`).
- **Ejecutar vs. Paso a paso**: el cálculo es el mismo; solo cambia si arranca animando o queda en el primer paso.

### 8.2 Configuración (`/config` y `config.json`)

| Cambio | Efecto |
| --- | --- |
| Sacar una estrategia de `estrategias` | Desaparece del selector, de la pantalla de inicio y sus ejemplos del libro. |
| Un algoritmo registrado que **no figura** en `estrategias` de `config.json` | Queda oculto para todos. Es el caso actual de Ford-Fulkerson (`ford-fulkerson`). |
| Habilitar Ford-Fulkerson en `/config` | Lo ve solo ese navegador (configuración local). Aparecen la estrategia, su tarjeta en la pantalla de inicio y el ejemplo "Red de transmisión". |
| Sumar `"ford-fulkerson"` a `estrategias` en `config.json` y hacer push | Lo ven todos. |
| Dejar solo Prim y/o Kruskal | Se oculta "Dirigido / No dirigido" y todo grafo se trata como no dirigido. |
| `animaciones: false` | Ejecutar salta directo al resultado; sin transiciones de color. |
| `pasoAPaso: false` | Sin botón Paso a paso, sin controles y sin leyenda. |
| `historialPasos: false` | Se oculta la lista "Todos los pasos". |
| Poner un id de estrategia que no existe | Se ignora; si no queda ninguno válido, se muestran todas. |

Ninguna opción de configuración cambia el resultado de un algoritmo: solo qué se muestra.

### 8.3 Código compartido

| Cambio | Efecto |
| --- | --- |
| Agregar un archivo en `src/algorithms/` que exporte `estrategia` | Queda registrado, con validación, paso a paso y colores, pero **oculto** hasta sumar su `id` a `config.json` (o habilitarlo en `/config`). Si devuelve un `tipo` de resultado nuevo, hay que sumarlo a `Resultado` y agregar su vista en `ResultsPanel`. Así se sumó Ford-Fulkerson. |
| Cambiar el `id` de una estrategia | Hay que actualizar `config.json` y el campo `estrategia` de los ejemplos en `libro.ts`; si no, el ejemplo queda oculto. Falla el test del registro. |
| Cambiar `orden` | Cambia la posición en el selector y cuál es la estrategia inicial. Falla el test del registro si se altera el orden. |
| Agregar un campo a `Paso` | No pasa nada hasta que `GraphCanvas` o `ResultsPanel` lo lean. |
| Quitar o renombrar un campo de `Paso` | TypeScript marca error en los algoritmos y en los dos componentes que lo usan. |
| Cambiar los colores | Solo [GraphCanvas.tsx:76-96](src/components/GraphCanvas.tsx#L76-L96) y la leyenda en [App.tsx:463-496](src/App.tsx#L463-L496). El orden de las reglas define qué color gana. |
| Cambiar los textos de la leyenda | Los generales están en `LEYENDA_GENERAL` ([App.tsx:471-476](src/App.tsx#L471-L476)); los de Ford-Fulkerson, en el campo `leyenda` de su estrategia. Un color solo aparece en la leyenda si tiene texto. |
| Cambiar `listaAdyacencia` | Afecta a Dijkstra, a la conexidad (Prim y Kruskal) y a la detección de soluciones múltiples. No afecta a Ford-Fulkerson. |
| Cambiar las velocidades | `VELOCIDADES` en [StepControls.tsx:1-5](src/components/StepControls.tsx#L1-L5) (milisegundos por paso). |

Después de cualquier cambio en `src/algorithms/`: `npm test` y `npm run typecheck`.

---

## 9. Tests que respaldan cada afirmación

`npm test` corre 50 tests (todos pasan). Los de algoritmos están en [algoritmos.test.ts](src/algorithms/algoritmos.test.ts):

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
| Red del apunte: caminos S-A-T (8) y S-B-T (10), flujo máximo 18, 7 pasos, etiqueta `8/10` en S→A | `red de transmisión del apunte…` |
| Corte mínimo {S, A, B} con A→T y B→T, capacidad igual al flujo máximo | `el corte mínimo tiene la misma capacidad que el flujo máximo` |
| Un arco inverso corrige la primera asignación (flujo 2, A→B vuelve a 0) | `usa un arco inverso para corregir una asignación temprana` |
| Ningún arco supera su capacidad y en cada nodo intermedio entra lo mismo que sale (red de 6 nodos, flujo 23) | `cumple capacidad y conservación en cada nodo intermedio` |
| Grafo no dirigido: cada arista sirve en los dos sentidos | `en un grafo no dirigido cada arista sirve en los dos sentidos` |
| Sin camino respetando el sentido, el flujo es 0 | `respeta el sentido de los arcos: sin camino el flujo es 0` |
| Capacidades decimales sin errores de redondeo (0,1 + 0,2 = 0,3) | `no acumula errores de redondeo con capacidades decimales` |
| Fuente ≠ sumidero, capacidades no negativas, advertencia en no dirigido | `valida fuente distinta del sumidero y capacidades no negativas` |
| Con 200 nodos, Prim y Kruskal dan 199 aristas y el mismo total | `Prim y Kruskal conectan los 200 nodos…` |
| Con 200 nodos, la ruta de Dijkstra suma su distancia y el flujo máximo iguala al corte mínimo | `Dijkstra devuelve una ruta válida y Ford-Fulkerson iguala…` |

---

## 10. Preguntas típicas y respuesta corta

**¿Por qué Prim y Kruskal dan el mismo total?** Los dos son algoritmos voraces correctos para el mismo problema: el peso del árbol mínimo es único aunque el árbol no lo sea.

**¿Cómo evita ciclos cada uno?** Prim solo toma aristas con un extremo fuera del árbol. Kruskal usa union-find y descarta la arista si los dos extremos ya están en el mismo grupo.

**¿Qué pasa si hay empate?** Se elige según el orden de carga (aristas en Prim y Kruskal, nodos en Dijkstra) y se avisa. En Ford-Fulkerson, entre caminos de igual longitud se toma el primero según el orden de carga, sin aviso: el flujo máximo es el mismo. Al final se confirma si de verdad existe otra solución óptima.

**¿Por qué Dijkstra no acepta pesos negativos?** Porque fija un nodo como definitivo cuando es el más cercano y no lo vuelve a revisar; con un peso negativo podría aparecer después un camino más barato.

**¿Por qué Prim y Kruskal ignoran el sentido?** El árbol de expansión mínima está definido para grafos no dirigidos (conectar, no recorrer). La estrategia lo declara con `forzarNoDirigido`.

**¿Dónde está "la lógica"?** En `src/algorithms/`: un archivo por modelo, funciones puras sin interfaz. Las líneas de decisión son [prim.ts:42-47](src/algorithms/prim.ts#L42-L47), [kruskal.ts:77](src/algorithms/kruskal.ts#L77), [dijkstra.ts:68-91](src/algorithms/dijkstra.ts#L68-L91) y [fordFulkerson.ts:68-84](src/algorithms/fordFulkerson.ts#L68-L84) (búsqueda del camino) junto con [fordFulkerson.ts:116](src/algorithms/fordFulkerson.ts#L116) y [fordFulkerson.ts:137](src/algorithms/fordFulkerson.ts#L137) (cuello de botella y aumento).

**¿Cómo se anima?** No se anima el algoritmo: se calcula todo de una vez y se guarda la lista de pasos. La animación es un temporizador que suma 1 al índice ([App.tsx:103-111](src/App.tsx#L103-L111)).

**¿Cómo se agrega otro modelo?** Un archivo nuevo en `src/algorithms/` que exporte `estrategia`; el registro es automático. Así se agregó flujo máximo. Queda oculto hasta sumar su `id` a `config.json`.

**¿Por qué no veo Ford-Fulkerson en la app?** Porque no figura en `config.json`. Se habilita en `/config` (solo para ese navegador) o agregando `"ford-fulkerson"` a `estrategias`.

**¿Qué es un camino de aumento?** Un camino de la fuente al sumidero por el que todavía cabe flujo. Lo que se puede enviar por él es su cuello de botella: la menor capacidad residual de sus tramos.

**¿Para qué sirven los arcos inversos?** Para deshacer una decisión anterior. Sin ellos, una mala primera elección de camino podría dejar al algoritmo en un flujo menor al máximo.

**¿Cómo sé que el flujo encontrado es el máximo?** Porque coincide con la capacidad del corte mínimo: los arcos saturados que separan la fuente del sumidero. Ningún flujo puede superar la capacidad de un corte, así que si lo iguala es óptimo.

**¿Por qué el corte mínimo no es el del apunte?** El del apunte ({S, A} | {B, T}) omite el arco A→B y en realidad vale 20. La app informa {S, A, B} | {T}, que vale 18 como el flujo máximo.

**¿Ford-Fulkerson funciona con grafos no dirigidos?** Sí, con una advertencia: cada arista puede llevar flujo en cualquiera de los dos sentidos hasta su capacidad.

**¿Cómo sé que está bien?** Los tests reproducen los tres ejemplos del libro con sus resultados exactos (16, 32 y 290) y el orden de los pasos, y la red del apunte de Ford-Fulkerson (flujo máximo 18), además de verificar capacidad y conservación del flujo.
