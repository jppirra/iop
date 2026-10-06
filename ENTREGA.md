# Documento de entrega — TPI Modelos de red

**Investigación Operativa · Ingeniería en Sistemas de Información · UTN**
**Grupo 3 — IOP 2026** · Versión de la aplicación: **v1.000.005**

| Integrante | Legajo |
| --- | --- |
| Junco Paola | 43516 |
| Hernandez Lucas Adriel | 51895 |
| Moreno Pablo | 51452 |
| Pirra Juan Pablo | 54051 |
| Schneider Christian | 52682 |
| Vanzo David | 48463 |

Repositorio: <https://github.com/jppirra/iop>

Este documento responde a la consigna "Desarrollo de una aplicación para algoritmos de redes": qué pide, cómo lo cumple la aplicación, cómo hacer la demostración y qué responder a las preguntas sobre el desarrollo. El detalle línea por línea de cada algoritmo está en el [MANUAL.md](MANUAL.md).

## Índice

1. [Estado frente a la consigna](#1-estado-frente-a-la-consigna)
2. [Qué es la aplicación](#2-qué-es-la-aplicación)
3. [Guía para la demostración](#3-guía-para-la-demostración)
4. [Preguntas sobre el desarrollo](#4-preguntas-sobre-el-desarrollo)
5. [Decisiones de diseño y su justificación](#5-decisiones-de-diseño-y-su-justificación)
6. [Límites conocidos](#6-límites-conocidos)
7. [Pendientes antes de la entrega](#7-pendientes-antes-de-la-entrega)
8. [Dónde está el detalle](#8-dónde-está-el-detalle)

---

## 1. Estado frente a la consigna

### Requerimientos

| Requerimiento | Estado | Cómo se cumple |
| --- | --- | --- |
| Cargar grafos de diferentes tamaños (de 10 a 200 nodos) | Cumplido | Carga manual, carga masiva (texto, CSV o JSON, pegado o desde archivo) y generador aleatorio. Probado con 200 nodos y 371 aristas: se carga, se dibuja y se resuelve. Ver [3.2](#32-cargar-un-grafo-entregado-por-las-docentes) y [4.6](#46-cómo-verificaron-que-los-resultados-obtenidos-son-correctos). |
| Ingresar las conexiones y sus pesos | Cumplido | Cada arista lleva origen, destino y peso (distancia, costo o capacidad). Se editan con un click; admite decimales. |
| Representar adecuadamente el grafo y la información | Cumplido | Lienzo interactivo con nodos, aristas, pesos y flechas si es dirigido. Los grafos grandes se acomodan solos. |
| Implementar los algoritmos de la asignatura | **Parcial: 4 de 6** | Ver tabla siguiente. |
| Mostrar claramente los resultados | Cumplido | Resultado resaltado sobre el grafo, tablas por algoritmo y explicación en texto de cada paso. |

### Algoritmos

| Algoritmo | Estado | Observación |
| --- | --- | --- |
| Prim | Implementado | Árbol de expansión mínima desde un nodo inicial. |
| Kruskal | Implementado | Árbol de expansión mínima ordenando aristas. |
| Dijkstra | Implementado | Ruta más corta entre origen y destino. |
| Flujo máximo (Ford-Fulkerson) | Implementado | Flujo máximo de una fuente a un sumidero, con el corte mínimo. |
| CPM | **No implementado** | Pendiente. |
| PERT | **No implementado** | Pendiente. |

---

## 2. Qué es la aplicación

Aplicación web que permite armar un grafo, elegir un algoritmo y ver el resultado junto con **cada decisión que tomó el algoritmo**: qué comparó, qué eligió y por qué, en texto y con colores sobre el grafo. Se puede ver animado o avanzar paso a paso.

- **Tecnología:** React + TypeScript, compilado con Vite. El grafo se dibuja con Cytoscape. No tiene servidor ni base de datos: todo corre en el navegador.
- **Cómo ejecutarla:** `npm install` y `npm run dev` (abre en `http://localhost:5173`). Requiere Node 20 o superior. También se publica como sitio estático en Vercel.
- **Tests:** `npm test` corre 51 tests automáticos.

---

## 3. Guía para la demostración

La consigna pide cinco cosas durante la demostración. Esta sección indica cómo hacer cada una.

### 3.1 Antes de empezar

1. Abrir la aplicación. En la pantalla de inicio se elige el algoritmo y el modo de carga.
2. Si se quiere mostrar solo una parte, entrar a `/config` y apagar los algoritmos o componentes que no se van a usar (vale solo para ese navegador).
3. Tener a mano un archivo de texto para pegar los grafos que entreguen las docentes.

### 3.2 Cargar un grafo entregado por las docentes

Hay tres caminos. Para un grafo chico conviene el manual; para uno grande, la carga masiva.

**Carga manual** (sobre el lienzo):

| Acción | Cómo |
| --- | --- |
| Crear un nodo | Doble click en el lienzo. Pide el nombre (`1`, `A`, `Casa 1`…). |
| Crear una arista | Click en un nodo y luego en otro. Pide el peso. `Esc` cancela. |
| Cambiar un peso | Click en la arista. |
| Renombrar un nodo | Doble click en el nodo. |
| Eliminar | Seleccionar y `Supr`. |
| Deshacer | `Ctrl+Z`. |

**Carga masiva** (pestaña "Carga masiva"): se pega el texto o se sube un archivo. Los nodos no se declaran: se deducen de las aristas.

Formato texto, una arista por línea (`origen destino peso`):

```
# origen destino peso
1 2 8
1 3 16
2 3 6
"Casa 1" 3 4
```

Formato CSV (también acepta `;` como separador y coma decimal, como exporta Excel en español):

```
origen,destino,peso
1,2,8
1,3,16
```

Formato JSON:

```json
{
  "dirigido": false,
  "nodos": ["1", "2", "3"],
  "aristas": [{ "origen": "1", "destino": "2", "peso": 8 }]
}
```

El enlace "Descargar JSON de ejemplo" baja un archivo con este formato, listo para editar y subir.

Antes de cargar, la aplicación informa cuántos nodos y aristas detectó, y marca los errores **por línea** (peso no numérico, línea mal formada, arista repetida). Después se elige **Reemplazar grafo** o **Agregar al grafo**.

Si el grafo tiene más de 20 nodos, se acomoda solo. Con "Auto-layout" se vuelve a acomodar y con "Centrar" se ajusta el zoom.

**Si el grafo es dirigido**, elegir "Dirigido" en la barra superior (o `"dirigido": true` en el JSON). Prim y Kruskal siempre lo tratan como no dirigido.

### 3.3 Modificar los datos de entrada

Cualquier cambio se hace sobre el grafo ya cargado: click en una arista para cambiar el peso, agregar o borrar nodos y aristas, o cambiar el nodo de inicio, origen o destino. Al modificar algo, el resultado anterior se oculta y aparece el aviso *"El grafo o los parámetros cambiaron: volvé a ejecutar"*: la aplicación nunca muestra un resultado que no corresponda al grafo actual.

### 3.4 Ejecutar los algoritmos

| Algoritmo | Qué pide | Tipo de grafo |
| --- | --- | --- |
| Árbol mínimo - Prim | Nodo inicial | No dirigido |
| Árbol mínimo - Kruskal | Nada | No dirigido |
| Ruta más corta - Dijkstra | Origen y destino | Dirigido o no dirigido; pesos no negativos |
| Flujo máximo - Ford-Fulkerson | Fuente y sumidero | Dirigido o no dirigido; el peso es la capacidad |

- **Ejecutar** reproduce los pasos animados (velocidad lenta, normal o rápida; se puede pausar).
- **Paso a paso** permite avanzar a mano: Reiniciar, Anterior, Siguiente, Final.
- En un grafo grande conviene **Paso a paso** y luego **Final** para ir directo al resultado.

Si faltan datos o son inválidos (grafo vacío, origen igual al destino, pesos negativos en Dijkstra), el botón queda deshabilitado y se explica por qué.

### 3.5 Mostrar los resultados

| Algoritmo | Sobre el grafo | En el panel de resultados |
| --- | --- | --- |
| Prim, Kruskal | Árbol en azul | Aristas elegidas en orden, distancia de cada una, acumulada y total. Avisos de empates, de soluciones óptimas múltiples y de grafo no conexo. |
| Dijkstra | Ruta en azul | Ruta, distancia total y tabla de etiquetas `[distancia, previo]` por iteración. Avisos de rutas múltiples o de que no hay ruta. |
| Ford-Fulkerson | `flujo/capacidad` sobre cada arco; flujo en azul y corte mínimo en rojo | Flujo máximo, caminos de aumento con su cuello de botella, flujo y holgura por arco, y corte mínimo. |

Colores durante la ejecución: naranja = lo que se evalúa en ese paso; verde = lo ya incluido en la solución; gris = descartado; azul = resultado final.

### 3.6 Explicar cómo se procesa y se obtiene la solución

Cada paso tiene su explicación en el panel de resultados (por ejemplo: *"Se fija el nodo 3 con distancia 14, llegando desde 2, porque es el nodo sin fijar más cercano al origen"*). La lista "Todos los pasos" permite volver a cualquier momento de la ejecución. Para explicar la regla de cada algoritmo, ver el resumen de [4.4](#44-cómo-se-implementó-cada-algoritmo).

---

## 4. Preguntas sobre el desarrollo

Respuestas a las preguntas que anticipa la consigna.

### 4.1 ¿Cómo se representa internamente el grafo?

Como dos listas planas, definidas en [src/types/graph.ts](src/types/graph.ts):

```ts
interface Nodo   { id: string; nombre: string; x: number; y: number }
interface Arista { id: string; origen: string; destino: string; peso: number }
interface Grafo  { dirigido: boolean; nodos: Nodo[]; aristas: Arista[] }
```

No se guarda como matriz ni como lista de adyacencia. Cuando un algoritmo necesita saber quién es vecino de quién, arma la lista de adyacencia **en el momento** (`listaAdyacencia` en [src/algorithms/utils.ts](src/algorithms/utils.ts)) recorriendo las aristas una vez.

### 4.2 ¿Cómo se realiza la carga de un grafo?

- **Manual:** cada acción sobre el lienzo llama a una función de [src/lib/grafo.ts](src/lib/grafo.ts) (`agregarNodo`, `agregarArista`, `editarPeso`, `eliminar`) que devuelve un grafo nuevo.
- **Masiva:** el texto pasa por un parser según el formato ([src/parsers/](src/parsers/)), que devuelve un "grafo plano" con los nodos referidos por nombre, más la lista de errores por línea. Si no hay errores, `desdePlano` lo convierte al grafo real asignando un id a cada nodo y arista. El formato se detecta por la extensión del archivo o por el contenido.
- **Aleatoria:** [src/lib/aleatorio.ts](src/lib/aleatorio.ts) arma primero un árbol al azar (así el grafo siempre es conexo) y después agrega aristas entre nodos cercanos.

### 4.3 ¿Qué estructura de datos utilizaron y por qué?

| Estructura | Dónde | Por qué |
| --- | --- | --- |
| Dos listas (nodos y aristas) | Grafo | Es como se edita (agregar o quitar un elemento) y como se guarda en un archivo. El orden de carga queda registrado y se usa para desempatar. |
| Lista de adyacencia (`Map` de nodo a vecinos) | Dijkstra, conexidad | Permite recorrer los vecinos de un nodo sin revisar todas las aristas. |
| Conjuntos disjuntos (union-find) | Kruskal | Responde rápido si dos nodos ya están conectados, que es lo que evita formar ciclos. |
| Conjunto (`Set`) de nodos | Prim (conectados), Dijkstra (fijados) | Saber en tiempo constante si un nodo ya fue procesado. |
| Mapas de distancia y de nodo previo | Dijkstra | Son las etiquetas `[distancia, previo]`; con los previos se reconstruye la ruta. |
| Mapa de flujo por arista y cola (BFS) | Ford-Fulkerson | El flujo define la red residual; la cola busca el camino de aumento más corto. |
| Lista de pasos | Todos | Cada algoritmo devuelve todos sus pasos; la pantalla solo los recorre. |

No se usó cola de prioridad en Prim ni en Dijkstra: el mínimo se busca recorriendo la lista. Es más lento en teoría, pero el código queda igual a la regla que se explica en clase y para estos tamaños es instantáneo (ver tiempos en [4.6](#46-cómo-verificaron-que-los-resultados-obtenidos-son-correctos)).

### 4.4 ¿Cómo se implementó cada algoritmo?

Cada algoritmo es una función que recibe el grafo y devuelve `{ pasos, resultado }`. Están en [src/algorithms/](src/algorithms/), un archivo por algoritmo.

**Prim** ([prim.ts](src/algorithms/prim.ts)). Arranca con el nodo inicial como único conectado. En cada vuelta toma las aristas que tienen exactamente un extremo conectado, elige la de menor peso y conecta el nodo nuevo. Termina cuando no quedan nodos o no hay más aristas candidatas (grafo no conexo). Nunca forma ciclos porque una arista con los dos extremos conectados no es candidata.

**Kruskal** ([kruskal.ts](src/algorithms/kruskal.ts)). Ordena todas las aristas de menor a mayor. Las recorre en orden: si los dos extremos ya están en el mismo grupo la descarta (formaría un ciclo); si no, la agrega y une los grupos. Termina al juntar `n − 1` aristas.

**Dijkstra** ([dijkstra.ts](src/algorithms/dijkstra.ts)). El origen arranca con distancia 0 y el resto con infinito. En cada iteración fija el nodo no fijado más cercano y actualiza la etiqueta de sus vecinos si llegar por él es más corto. Termina al fijar el destino y reconstruye la ruta hacia atrás por los previos.

**Ford-Fulkerson** ([fordFulkerson.ts](src/algorithms/fordFulkerson.ts)). Arranca con flujo 0. Busca un camino de la fuente al sumidero con capacidad disponible, calcula su cuello de botella (la menor capacidad residual del camino) y envía esa cantidad. Repite hasta que no queda ningún camino. Los arcos inversos permiten deshacer una asignación anterior. Al terminar informa el corte mínimo, cuya capacidad es igual al flujo máximo.

El recorrido línea por línea de cada uno está en el [MANUAL.md](MANUAL.md), secciones 3 a 6.

### 4.5 ¿Cómo identifica la aplicación los nodos y las conexiones?

- Cada nodo y cada arista tiene un **id interno** único que se genera al crearlo y nunca cambia ni se muestra.
- El **nombre** del nodo es lo que ve y edita el usuario. No se puede repetir dentro del grafo.
- Las aristas guardan el **id** de sus dos nodos, no el nombre. Por eso renombrar un nodo no afecta a ninguna arista.
- En la carga masiva los nodos se identifican por nombre; al cargar se les asigna el id.
- No se permiten dos aristas entre el mismo par de nodos (en un grafo dirigido, A→B y B→A son distintas).

### 4.6 ¿Cómo verificaron que los resultados obtenidos son correctos?

Con 51 tests automáticos (`npm test`) y cuatro criterios:

1. **Casos con solución conocida.** Los tests reproducen los ejemplos del libro de la cátedra (Render, cap. 11) con el resultado y el orden de los pasos:

   | Ejemplo | Algoritmo | Resultado esperado y obtenido |
   | --- | --- | --- |
   | Lauderdale Construction (fig. 11.1) | Prim y Kruskal | Distancia total 16 |
   | Leadville → Dillon (fig. 11.19) | Dijkstra | Ruta 1-2-3-6-7, distancia 32 |
   | Ray Design (fig. 11.10) | Dijkstra | Ruta 1-2-3-5-6, distancia 290 |
   | Red de transmisión (apunte de Ford-Fulkerson) | Ford-Fulkerson | Flujo máximo 18 |

2. **Dos algoritmos que deben coincidir.** Prim y Kruskal resuelven el mismo problema por caminos distintos: si dan el mismo total, se validan entre sí. También se verifica que Prim dé el mismo total desde cualquier nodo inicial.
3. **Propiedades que siempre se cumplen.** El flujo máximo es igual a la capacidad del corte mínimo; ningún arco supera su capacidad; en cada nodo intermedio entra lo mismo que sale; la suma de los pesos de la ruta de Dijkstra es la distancia informada.
4. **Casos límite armados a propósito.** Grafo no conexo, empates, soluciones óptimas múltiples, pesos negativos, sin ruta, sentido de los arcos, capacidades decimales.

**Grafos grandes.** Los criterios 2 y 3 se verifican también sobre grafos aleatorios de 200 nodos. Tiempos de cálculo medidos sobre grafos aleatorios conexos:

| Nodos | Aristas | Prim | Kruskal | Dijkstra | Ford-Fulkerson |
| --- | --- | --- | --- | --- | --- |
| 10 | 15 | < 1 ms | < 1 ms | < 1 ms | 1 ms |
| 50 | 91 | 1 ms | 1 ms | 1 ms | 1 ms |
| 200 | 371 | 3 ms | 2 ms | 5 ms | 5 ms |
| 500 | 946 | 21 ms | 12 ms | 44 ms | 12 ms |

En todos los casos Prim y Kruskal dieron el mismo total y el flujo máximo fue igual al corte mínimo.

### 4.7 ¿Qué dificultades encontraron durante la implementación y cómo las resolvieron?

| Dificultad | Cómo se resolvió |
| --- | --- |
| Mostrar el algoritmo paso a paso sin complicar el código del algoritmo | Cada algoritmo calcula todo de una vez y devuelve la lista de pasos. La pantalla solo cambia un índice; "Anterior" y "Siguiente" no recalculan nada. |
| Con pesos iguales, el mismo grafo podía dar soluciones distintas | Los empates se resuelven siempre por orden de carga, así el resultado es reproducible y se puede testear contra el libro. |
| Un empate en un paso no siempre significa que haya otra solución óptima | Al final se comprueba de verdad: para cada arista fuera del árbol se busca si puede reemplazar a otra del mismo peso sin cambiar el total. |
| El resultado quedaba en pantalla aunque se modificara el grafo | Cada resultado se guarda junto con una firma del grafo. Si la firma actual no coincide, el resultado se oculta y se pide volver a ejecutar. Mover nodos no cambia la firma. |
| Tres formatos de carga con reglas distintas | Los tres parsers devuelven el mismo tipo de dato y el mismo tipo de error (ubicación y mensaje), así la pantalla los trata igual. |
| En flujo máximo, una primera elección de camino podía impedir llegar al máximo | Se implementó la red residual con arcos inversos, que permiten deshacer flujo ya asignado. Hay un test con un caso donde sin arcos inversos el resultado sería incorrecto. |
| Capacidades decimales producían valores como 0,30000000000000004 | Se redondea a 9 decimales en cada operación de flujo. |
| Un grafo de 200 nodos se dibujaba ilegible | Los nodos se ubicaban en círculo y el zoom mínimo no alcanzaba para verlo completo. Ahora, con más de 20 nodos, se acomodan solos y se amplió el zoom. |
| El dibujo del ejemplo del libro (fig. 11.1) no se leía completo en el material disponible | Las 7 aristas del árbol salen de la tabla 11.1; las restantes se reconstruyeron de los números de la figura. El resultado coincide con el libro. |

---

## 5. Decisiones de diseño y su justificación

| Decisión | Justificación |
| --- | --- |
| Aplicación web sin servidor | Se abre desde cualquier navegador, sin instalar nada. No hay datos que guardar entre sesiones; el grafo se puede exportar a un archivo. |
| Algoritmos separados de la pantalla | Los algoritmos no dependen de la interfaz, así se prueban solos y con tests automáticos. Para cambiar qué decide un algoritmo se toca un solo archivo. |
| Un formato único de salida (`pasos` + `resultado`) | Todos los algoritmos se muestran, animan y explican con el mismo código. Agregar un algoritmo nuevo es agregar un archivo. |
| Grafo como dos listas, adyacencia calculada al ejecutar | Mantener una sola estructura evita que dos representaciones queden desincronizadas al editar. Recalcular la adyacencia cuesta milisegundos. |
| Operaciones que devuelven un grafo nuevo en lugar de modificar el actual | Permite deshacer (`Ctrl+Z`) guardando los estados anteriores, sin lógica extra por cada operación. |
| Id interno separado del nombre | El usuario puede renombrar libremente y usar cualquier nombre sin romper las conexiones. |
| Validar antes de ejecutar | Los errores (pesos negativos en Dijkstra, origen igual a destino) se explican antes, en lugar de devolver un resultado incorrecto. |
| Avisar en lugar de bloquear cuando el grafo no es conexo | El árbol parcial también es información útil; se informa qué nodos quedaron afuera. |
| Búsqueda en anchura (BFS) para el camino de aumento | Garantiza que Ford-Fulkerson termine también con capacidades decimales y que el recorrido sea siempre el mismo. |
| Sin cola de prioridad | El código queda igual a la regla vista en clase y el tiempo es despreciable para los tamaños pedidos. |
| Pantalla de configuración (`/config`) | Permite mostrar u ocultar algoritmos y componentes sin tocar el código, y publicar un algoritmo recién cuando está terminado. |

---

## 6. Límites conocidos

- **CPM y PERT no están implementados** (ver [sección 7](#7-pendientes-antes-de-la-entrega)).
- No admite dos aristas entre el mismo par de nodos.
- El grafo no se guarda al cerrar la pestaña; hay que exportarlo (JSON o CSV) para conservarlo.
- En grafos grandes la animación completa es larga (un paso por nodo o arista): conviene ir directo al resultado con "Final". La tabla de etiquetas de Dijkstra tiene una columna por nodo y requiere desplazarse.
- Dijkstra no admite pesos negativos (lo informa y no ejecuta).
- En Dijkstra, con aristas de peso 0 puede faltar el aviso de "rutas múltiples"; la ruta y la distancia informadas son correctas.

---

## 7. Pendientes antes de la entrega

1. **Implementar CPM y PERT.** La consigna los pide y hoy no existen en la aplicación. Son los dos algoritmos que faltan para cumplir el requerimiento completo.
2. **Actualizar la carpeta [docs/](docs/).** Describe solo Prim y Kruskal; no menciona Dijkstra ni Flujo máximo.
3. **Ensayar la demostración** con un grafo que no sea ninguno de los ejemplos, cargado por texto, y con un cambio de pesos en vivo.

---

## 8. Dónde está el detalle

| Documento | Contenido |
| --- | --- |
| [README.md](README.md) | Instalación, uso, formatos de carga, configuración. |
| [MANUAL.md](MANUAL.md) | Cada algoritmo en nivel funcional y técnico, con trazas, referencias a líneas de código y qué pasa si se modifica cada parte. |
| [docs/](docs/) | Arquitectura, casos de uso y diagramas de componentes y de secuencia (hoy solo Prim y Kruskal). |
| [Lib/](Lib/) | Consigna del TPI y material de la cátedra usado. |
