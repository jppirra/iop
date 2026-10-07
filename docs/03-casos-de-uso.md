# Casos de uso

Listado de lo que una persona usuaria puede hacer con la app, de punta a
punta. Qué casos están disponibles depende de la configuración (ver UC-6).

## 1. Empezar a trabajar

- **UC-1.1 — Elegir algoritmo y modo de carga al entrar** (pantalla de inicio):
  al abrir la web, elegir uno de los algoritmos habilitados (Prim, Kruskal,
  Dijkstra, Ford-Fulkerson, CPM, PERT) y cómo cargar el grafo: manual, carga
  masiva o ejemplo aleatorio.
- **UC-1.2 — Reabrir la pantalla de inicio** con el botón "Inicio" del header.
- **UC-1.3 — Generar un grafo aleatorio** (botón "Aleatorio"): crea un grafo
  conexo al azar, listo para ejecutar con cualquier algoritmo. Como origen se
  toma el primer nodo y como destino el más lejano.
- **UC-1.4 — Cargar un ejemplo resuelto** (menú "Ejemplos del libro"): carga
  el grafo, elige el algoritmo y los parámetros del ejemplo. Incluye
  Lauderdale (árbol mínimo), Leadville y Ray Design (ruta más corta), la red
  de transmisión (flujo máximo) y General Foundry (CPM y PERT).

## 2. Construir y editar el grafo a mano

- **UC-2.1 — Crear un nodo**: doble click en el lienzo; se pide un nombre libre
  (`1`, `A`, `Casa 1`…), con sugerencia automática del próximo entero libre.
- **UC-2.2 — Renombrar un nodo**: doble click sobre el nodo.
- **UC-2.3 — Crear una arista**: click en un nodo y luego en otro; se pide el
  peso (distancia, costo, capacidad o duración). `Esc` cancela la conexión en
  curso. Si ya existe una arista entre esos dos nodos, se avisa en vez de
  crear una duplicada.
- **UC-2.4 — Editar el peso de una arista**: click sobre la arista.
- **UC-2.5 — Cargar los tres tiempos de PERT**: al crear o editar una arista,
  escribir `optimista más probable pesimista` (por ejemplo `1 2 3`). La arista
  muestra `1 / 2 / 3`.
- **UC-2.6 — Elegir grafo dirigido o no dirigido** con el selector de la barra
  superior. Queda forzado a no dirigido con Prim y Kruskal, y a dirigido con
  CPM y PERT.
- **UC-2.7 — Eliminar nodos o aristas seleccionados**: tecla `Supr`.
- **UC-2.8 — Deshacer la última edición**: `Ctrl+Z` (o botón), sobre un
  historial en memoria.
- **UC-2.9 — Reacomodar el grafo**: arrastrar nodos manualmente, "Auto-layout"
  (recalcula posiciones) o "Centrar" (ajusta el zoom/paneo al contenido).
- **UC-2.10 — Vaciar el grafo**: botón "Limpiar" (pide confirmación; se puede
  deshacer).

## 3. Carga masiva de datos (pestaña "Carga masiva")

- **UC-3.1 — Pegar aristas como texto**: una por línea,
  `origen destino peso` (nombres con espacio entre comillas); `#` comenta la
  línea. Para PERT, cinco valores:
  `origen destino optimista másProbable pesimista`.
- **UC-3.2 — Pegar/subir un CSV** con encabezado `origen,destino,peso` (admite
  `,` o `;` como separador), y opcionalmente las columnas `optimista` y
  `pesimista`.
- **UC-3.3 — Pegar/subir JSON** con forma
  `{ dirigido, nodos: [...], aristas: [{origen,destino,peso}] }`; cada arista
  puede llevar además `optimista` y `pesimista`.
- **UC-3.4 — Subir un archivo** en vez de pegar texto (detecta el formato por
  extensión o por contenido).
- **UC-3.5 — Ver errores de carga por línea**: peso no numérico, línea mal
  formada, arista repetida, tiempos desordenados, etc., antes de confirmar la
  carga.
- **UC-3.6 — Reemplazar o agregar** el grafo cargado al que ya existe en el
  lienzo (fusiona por nombre de nodo).
- **UC-3.7 — Cargar un grafo grande**: con más de 20 nodos sin posición, el
  grafo se acomoda solo al cargarlo (probado con 200 nodos).
- **UC-3.8 — Descargar un JSON de ejemplo** para ver el formato, editarlo y
  subirlo.
- **UC-3.9 — Exportar el grafo actual** a JSON o CSV (conserva los tiempos de
  PERT).

## 4. Ejecutar un algoritmo

- **UC-4.1 — Elegir estrategia y parámetros**:

  | Algoritmo | Parámetros |
  |---|---|
  | Prim | Nodo inicial |
  | Kruskal | Ninguno |
  | Dijkstra | Origen y destino |
  | Ford-Fulkerson | Fuente y sumidero |
  | CPM, PERT | Ninguno |

  La app valida antes de habilitar "Ejecutar" (grafo vacío, origen igual al
  destino, pesos negativos, un ciclo en una red de proyecto) y muestra
  advertencias no bloqueantes (grafo no conexo, varios eventos iniciales,
  actividades sin tiempos de PERT).
- **UC-4.2 — Ejecutar con animación**: "Ejecutar" reproduce los pasos desde el
  principio. Se puede pausar, repetir y elegir velocidad lenta, normal o
  rápida.
- **UC-4.3 — Avanzar paso a paso**: "Paso a paso" deja la ejecución en el
  primer paso; se avanza con Reiniciar, Anterior, Siguiente y Final, o con la
  barra de progreso.
- **UC-4.4 — Leer la explicación de cada paso**: el panel de resultados
  muestra qué se evaluó y por qué se eligió. La lista "Todos los pasos"
  permite saltar a cualquiera.
- **UC-4.5 — Ver el resultado sobre el grafo**: naranja = lo evaluado en el
  paso; verde = lo ya incluido; gris = descartado; azul = resultado final;
  rojo = corte mínimo. La leyenda de colores cambia según el algoritmo.
- **UC-4.6 — Ver las tablas del resultado**:
  - Prim y Kruskal: aristas elegidas en orden, distancia acumulada y total.
  - Dijkstra: ruta, distancia total y etiquetas `[distancia, previo]` por
    iteración.
  - Ford-Fulkerson: flujo máximo, caminos de aumento con su cuello de
    botella, flujo y holgura por arco, y corte mínimo. Cada arco muestra
    `flujo/capacidad` sobre el grafo.
  - CPM y PERT: duración del proyecto, ruta crítica, tiempo más temprano y
    más tardío de cada evento, y por actividad inicio y terminación más
    cercanos y más lejanos y holgura. PERT agrega tiempo esperado, varianza y
    desvío.
- **UC-4.7 — Calcular la probabilidad de cumplir un plazo** (PERT): ingresar
  el plazo en el resultado; se muestra Z y la probabilidad, sin volver a
  ejecutar.
- **UC-4.8 — Recibir avisos de casos especiales** junto al resultado: empates,
  soluciones óptimas múltiples, grafo no conexo, ausencia de ruta, varias
  rutas críticas.
- **UC-4.9 — Detectar que el resultado quedó obsoleto**: si se edita el grafo,
  la estrategia o los parámetros después de ejecutar, el panel avisa que hay
  que volver a ejecutar en vez de mostrar un resultado desactualizado. Mover
  nodos no lo invalida.

## 5. Información del proyecto

- **UC-5.1 — Ver la lista de integrantes del grupo** (botón "Integrantes").
- **UC-5.2 — Ver la versión de la app** en el pie de página.
- **UC-5.3 — Ver el informe del trabajo** entrando a `/informe`: muestra
  `INFORME.md` con el estilo de la app, y permite descargarlo en Word o
  imprimirlo en PDF.

## 6. Configurar qué se muestra

- **UC-6.1 — Elegir los algoritmos visibles** entrando a `/config` (no hay
  enlace desde la app). Tiene que quedar al menos uno.
- **UC-6.2 — Mostrar u ocultar componentes**: pantalla de inicio, paso a paso,
  leyenda, animaciones, lista de pasos, ejemplos, aleatorio, carga masiva,
  exportar, JSON de ejemplo e integrantes.
- **UC-6.3 — Volver a la configuración del proyecto**, descartando los cambios
  hechos en ese navegador.
- **UC-6.4 — Aplicar la configuración para todos**: copiar o descargar el JSON
  y reemplazar `src/config/config.json` en el repositorio.

> Los cambios hechos en `/config` valen solo en ese navegador. Si ninguno de
> los algoritmos habilitados acepta grafos dirigidos, el selector de dirección
> no aparece.

---

### Casos fuera de alcance

- No hay persistencia de grafos en un servidor ni cuentas de usuario: cerrar la
  pestaña pierde el grafo (salvo que se haya exportado a archivo).
- No hay multigrafos con aristas paralelas entre el mismo par de nodos (se
  avisa y no se crea una arista duplicada).
- En CPM y PERT las actividades se identifican por sus eventos (por ejemplo
  `2→4`); no se les puede poner un nombre propio.
- Dijkstra no admite pesos negativos.
