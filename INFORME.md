<!--
BORRADOR PARA EDITAR ENTRE TODOS. Límite: 4 páginas.
Revisar antes de entregar:
- Sección 1: CPM y PERT se implementaron con actividad en el arco; confirmar que es la convención que se vio en clase.
- Sección 4: las alternativas descartadas son las técnicamente razonables; ajustar a lo que el grupo realmente comparó.
- Sección 7: ordenar los pendientes según las clases que quedan y poner responsables.
Este comentario no se ve al exportar el documento.
-->

# Informe — Aplicación para algoritmos de redes

**Investigación Operativa · UTN · Grupo 3 — IOP 2026**
Junco Paola (43516) · Hernandez Lucas Adriel (51895) · Moreno Pablo (51452) · Pirra Juan Pablo (54051) · Schneider Christian (52682) · Vanzo David (48463)

Repositorio: <https://github.com/jppirra/iop> · Versión actual: v1.000.006

## 1. Algoritmos

Los algoritmos a implementar son los seis de la consigna. Los seis ya funcionan en la aplicación.

| Algoritmo | Problema que resuelve | Qué hace | Estado |
| --- | --- | --- | --- |
| Prim | Árbol de expansión mínima | Parte de un nodo y en cada paso conecta el nodo más cercano al árbol. | Implementado |
| Kruskal | Árbol de expansión mínima | Ordena las aristas de menor a mayor y agrega las que no forman ciclo. | Implementado |
| Dijkstra | Ruta más corta | Fija en cada iteración el nodo más cercano al origen y actualiza las distancias de sus vecinos. | Implementado |
| Ford-Fulkerson | Flujo máximo | Envía flujo por caminos de la fuente al sumidero hasta que no queda ninguno con capacidad. | Implementado |
| CPM | Duración de un proyecto | Calcula tiempos más tempranos y más tardíos de cada actividad, las holguras y la ruta crítica. | Implementado |
| PERT | Duración con incertidumbre | Igual que CPM, pero cada actividad tiene tres tiempos estimados; da la duración esperada y la probabilidad de cumplir un plazo. | Implementado |

**Diferencias entre ellos.**

- **Prim y Kruskal** resuelven el mismo problema y dan el mismo total. Prim hace crecer un único árbol desde un nodo; Kruskal mira las aristas y va uniendo grupos sueltos. Prim pide un nodo inicial, Kruskal no.
- **Dijkstra** no conecta todos los nodos: busca un camino entre dos. Respeta el sentido de los arcos y no admite pesos negativos.
- **Ford-Fulkerson** interpreta el peso como capacidad, no como distancia, y trabaja sobre una red con fuente y sumidero.
- **CPM y PERT** trabajan sobre una red de actividades (dirigida y sin ciclos) donde el peso es una duración. Se diferencian entre sí en que CPM usa un tiempo fijo por actividad y PERT tres estimaciones (optimista, más probable y pesimista).

**Adaptaciones para incorporarlos a la aplicación.**

- Todos devuelven, además del resultado, la **lista de pasos** con su explicación, para poder mostrarlos animados o paso a paso.
- Los **empates** se resuelven siempre por orden de carga, así el mismo grafo da siempre el mismo resultado. Al final se informa si existe más de una solución óptima.
- Prim y Kruskal tratan todo grafo como **no dirigido**. Si el grafo no es conexo, devuelven el árbol parcial y avisan qué nodos quedaron afuera.
- Dijkstra se detiene al fijar el destino y **bloquea los pesos negativos** antes de ejecutar.
- En Ford-Fulkerson el camino se busca **en anchura (BFS)**, lo que garantiza que termine. Además se informa el **corte mínimo** y se admite grafo no dirigido.
- En CPM y PERT cada **actividad es un arco** y cada nodo un evento, así se cargan como cualquier otro grafo. El inicio y el fin del proyecto se deducen de la red, y se detectan los ciclos antes de ejecutar.
- Para PERT la arista admite **tres tiempos** (optimista, más probable y pesimista), y el plazo para calcular la probabilidad se ingresa sobre el resultado, sin volver a ejecutar.

## 2. Ingreso de datos

El usuario puede cargar el grafo de tres formas:

- **Manual, sobre el dibujo.** Doble click crea un nodo y pide su nombre; click en un nodo y luego en otro crea una arista y pide su peso. Se puede renombrar, cambiar pesos, borrar y deshacer.
- **Carga masiva**, pegando texto o subiendo un archivo. Pensada para grafos grandes (se probó con 200 nodos).
- **Grafo aleatorio**, para probar rápido.

La información que hay que dar es, por cada conexión: **nodo origen, nodo destino y peso** (distancia, costo, capacidad o duración). Para PERT el peso se reemplaza por tres tiempos: optimista, más probable y pesimista. Los nodos no se declaran aparte: se deducen de las conexiones. Además se indica si el grafo es dirigido y, según el algoritmo, el nodo inicial o el par origen–destino.

Formatos aceptados en la carga masiva:

| Formato | Ejemplo |
| --- | --- |
| Texto, una arista por línea | `1 2 8` |
| CSV con encabezado | `origen,destino,peso` |
| JSON | `{ "dirigido": false, "aristas": [{ "origen": "1", "destino": "2", "peso": 8 }] }` |

Antes de cargar, la aplicación informa cuántos nodos y aristas detectó y marca los errores por línea (peso no numérico, línea mal formada, arista repetida). El grafo se puede exportar a JSON o CSV.

## 3. Representación del grafo

El grafo se guarda como **dos listas**: una de nodos y una de aristas, más un indicador de si es dirigido.

- **Nodo:** identificador interno, nombre y posición en el dibujo.
- **Arista:** identificador interno, nodo origen, nodo destino y peso.

Cada nodo tiene un **identificador interno** que no cambia y un **nombre** que elige el usuario. Las aristas guardan el identificador de sus nodos, no el nombre, así renombrar un nodo no afecta a ninguna conexión.

Para ejecutar, cada algoritmo arma en el momento la estructura que necesita a partir de esas dos listas:

| Estructura | Quién la usa | Para qué |
| --- | --- | --- |
| Lista de adyacencia | Dijkstra, Ford-Fulkerson | Recorrer los vecinos de un nodo. |
| Conjuntos disjuntos (union-find) | Kruskal | Saber si dos nodos ya están conectados y evitar ciclos. |
| Conjunto de nodos procesados | Prim, Dijkstra | Saber si un nodo ya fue conectado o fijado. |
| Mapas de distancia y nodo previo | Dijkstra | Etiquetas de cada nodo y reconstrucción de la ruta. |
| Mapa de flujo por arista | Ford-Fulkerson | Calcular la capacidad residual. |
| Orden topológico de los eventos | CPM, PERT | Calcular cada evento después de los que lo preceden y detectar ciclos. |

Se eligieron dos listas porque es como se edita el grafo (agregar o quitar un elemento) y como se guarda en un archivo. Mantener una sola estructura evita que dos representaciones queden desincronizadas.

## 4. Herramientas

| Herramienta | Para qué se usa | Ventaja frente a otras alternativas |
| --- | --- | --- |
| Aplicación web (sin servidor) | Toda la aplicación corre en el navegador | Frente a una aplicación de escritorio, no hay que instalar nada: se abre desde un enlace en cualquier máquina. |
| TypeScript | Lenguaje | Frente a JavaScript sin tipos, detecta errores antes de ejecutar (por ejemplo, usar un nombre donde va un identificador). |
| React | Interfaz | Frente a manipular la página a mano, la pantalla se actualiza sola cuando cambia el grafo o el paso actual. |
| Cytoscape | Dibujo del grafo | Frente a dibujar con canvas o SVG a mano, ya resuelve arrastrar nodos, zoom, flechas y acomodar el grafo automáticamente. |
| Vite | Compilación y servidor de desarrollo | Arranque y recarga inmediatos al guardar un cambio. |
| Vitest | Tests automáticos | Se integra con Vite sin configuración adicional. |
| Git y GitHub | Control de versiones y trabajo en grupo | Historial de cambios y trabajo en paralelo de los integrantes. |
| Vercel | Publicación | Cada cambio subido al repositorio se publica solo. |

## 5. Decisiones técnicas

- **Algoritmos separados de la pantalla.** Cada algoritmo es una función que recibe el grafo y devuelve pasos y resultado, sin depender de la interfaz. Así se prueban solos, con tests automáticos.
- **Calcular todo de una vez y recorrer los pasos.** La animación y los botones Anterior/Siguiente solo cambian qué paso se muestra; no se recalcula nada.
- **Un formato de salida común.** Todos los algoritmos se muestran y explican con el mismo código. Agregar uno nuevo es agregar un archivo.
- **Operaciones que no modifican el grafo, sino que devuelven uno nuevo.** Permite deshacer guardando los estados anteriores.
- **Validar antes de ejecutar.** Los datos inválidos se explican al usuario en lugar de devolver un resultado incorrecto.
- **No mostrar resultados desactualizados.** Si el grafo cambia después de ejecutar, el resultado se oculta y se pide volver a ejecutar.
- **Sin cola de prioridad en Prim y Dijkstra.** El código queda igual a la regla vista en clase; con 200 nodos el cálculo tarda menos de 10 milisegundos.
- **Pantalla de configuración.** Permite mostrar u ocultar algoritmos y componentes sin tocar el código.

## 6. Implementación

Estado actual:

- **Desarrollado:** carga manual, carga masiva (texto, CSV, JSON) y aleatoria; edición y deshacer; dibujo del grafo dirigido o no dirigido; los seis algoritmos (Prim, Kruskal, Dijkstra, Ford-Fulkerson, CPM y PERT) con ejecución animada y paso a paso; tablas de resultados por algoritmo; avisos de empates, soluciones múltiples, grafo no conexo y datos inválidos; exportación.
- **Verificado:** 66 tests automáticos. Reproducen los ejemplos del libro de la cátedra (Lauderdale = 16, Leadville = 32, Ray Design = 290, General Foundry = 15 semanas con sus holguras y probabilidad) y la red del apunte de flujo máximo (18). También comprueban que Prim y Kruskal coincidan y que el flujo máximo sea igual al corte mínimo, incluso en grafos de 200 nodos.
- **Publicado:** la aplicación está desplegada y el código está en el repositorio.
- **Sin comenzar:** nada de lo pedido en la consigna.

CPM y PERT siguen el mismo esquema que los cuatro anteriores (una función que devuelve pasos y resultado, más su tabla) y comparten el cálculo de la red: solo cambia cómo se obtiene la duración de cada actividad.

## 7. Pasos pendientes para futuras clases

1. Confirmar con la cátedra la convención de CPM y PERT (se usó actividad en el arco) y probarlos con ejercicios resueltos en clase.
2. Evaluar si conviene poder ponerle nombre a cada actividad (A, B, C…) además de identificarla por sus eventos.
3. Probar la aplicación con los grafos que entreguen las docentes, incluido uno de 200 nodos.
4. Ensayar la demostración con grafos nuevos y con cambios de datos en vivo.
5. Repartir entre los integrantes la explicación de cada algoritmo y de las decisiones técnicas.
