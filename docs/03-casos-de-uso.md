# Casos de uso

Listado de lo que una persona usuaria puede hacer con la app, de punta a
punta.

## 1. Empezar a trabajar

- **UC-1.1 — Elegir algoritmo y modo de carga al entrar** (pantalla de inicio):
  al abrir la web, elegir entre Prim o Kruskal y cómo cargar el grafo: manual,
  carga masiva o ejemplo aleatorio.
- **UC-1.2 — Reabrir la pantalla de inicio** con el botón "Inicio" del header.
- **UC-1.3 — Generar un grafo aleatorio** (botón "Aleatorio"): crea un grafo
  conexo al azar, listo para ejecutar.

## 2. Construir y editar el grafo a mano

- **UC-2.1 — Crear un nodo**: doble click en el lienzo; se pide un nombre libre
  (`1`, `A`, `Casa 1`…), con sugerencia automática del próximo entero libre.
- **UC-2.2 — Renombrar un nodo**: doble click sobre el nodo.
- **UC-2.3 — Crear una arista**: click en un nodo y luego en otro; se pide el
  peso (distancia/costo). `Esc` cancela la conexión en curso. Si ya existe una
  arista entre esos dos nodos, se avisa en vez de crear una duplicada.
- **UC-2.4 — Editar el peso de una arista**: click sobre la arista.
- **UC-2.5 — Eliminar nodos o aristas seleccionados**: tecla `Supr`.
- **UC-2.6 — Deshacer la última edición**: `Ctrl+Z` (o botón), sobre un
  historial en memoria.
- **UC-2.7 — Reacomodar el grafo**: arrastrar nodos manualmente, "Auto-layout"
  (recalcula posiciones) o "Centrar" (ajusta el zoom/paneo al contenido).
- **UC-2.8 — Vaciar el grafo**: botón "Limpiar" (pide confirmación; se puede
  deshacer).

> El grafo siempre se trabaja como **no dirigido**: tanto Prim como Kruskal lo
> requieren, por lo que el toggle de dirección no aparece en la interfaz.

## 3. Carga masiva de datos (pestaña "Carga masiva")

- **UC-3.1 — Pegar aristas como texto**: una por línea,
  `origen destino peso` (nombres con espacio entre comillas); `#` comenta la
  línea.
- **UC-3.2 — Pegar/subir un CSV** con encabezado `origen,destino,peso` (admite
  `,` o `;` como separador).
- **UC-3.3 — Pegar/subir JSON** con forma
  `{ dirigido, nodos: [...], aristas: [{origen,destino,peso}] }`.
- **UC-3.4 — Subir un archivo** en vez de pegar texto (detecta el formato por
  extensión o por contenido).
- **UC-3.5 — Ver errores de carga por línea**: peso no numérico, línea mal
  formada, arista repetida, etc., antes de confirmar la carga.
- **UC-3.6 — Reemplazar o agregar** el grafo cargado al que ya existe en el
  lienzo (fusiona por nombre de nodo).
- **UC-3.7 — Exportar el grafo actual** a JSON o CSV.

## 4. Ejecutar un algoritmo

- **UC-4.1 — Elegir estrategia y parámetros**: nodo inicial (solo para Prim;
  Kruskal no pide parámetros). La app valida antes de habilitar "Ejecutar"
  (grafo vacío, nodo inexistente) y muestra advertencias no bloqueantes si el
  grafo no es conexo.
- **UC-4.2 — Ejecutar y ver el resultado**: al tocar "Ejecutar" se muestra
  directamente el árbol resultante resaltado sobre el grafo, junto con la
  tabla de aristas elegidas (en orden, con distancia acumulada) y la distancia
  total.
- **UC-4.3 — Recibir avisos de casos especiales** junto al resultado: empates
  en la elección de una arista, más de un árbol óptimo posible (con el detalle
  de qué arista podría reemplazar a cuál sin cambiar el total), o grafo no
  conexo (árbol parcial, con los nodos que quedaron sin conectar).
- **UC-4.4 — Detectar que el resultado quedó obsoleto**: si se edita el grafo,
  la estrategia o los parámetros después de ejecutar, el panel avisa que hay
  que volver a ejecutar en vez de mostrar un resultado desactualizado.

## 5. Información del proyecto

- **UC-5.1 — Ver la lista de integrantes del grupo** (botón "Integrantes").
- **UC-5.2 — Ver la versión de la app** en el pie de página.

---

### Casos fuera de alcance

- No hay persistencia de grafos en un servidor ni cuentas de usuario: cerrar la
  pestaña pierde el grafo (salvo que se haya exportado a archivo).
- No hay multigrafos con aristas paralelas entre el mismo par de nodos (se
  avisa y no se crea una arista duplicada).
- No se trabaja con grafos dirigidos (Prim y Kruskal solo tienen sentido sobre
  grafos no dirigidos).
