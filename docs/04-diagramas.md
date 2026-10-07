# Diagramas

## Diagrama de componentes

Muestra cómo se relacionan los módulos principales. `App.tsx` es el
orquestador: sostiene el estado y conecta la UI con la capa de dominio
(algoritmos, grafo, parsers).

```mermaid
flowchart TB
    subgraph entrada["Entrada"]
        main["main.tsx - ruteo por URL"]
        ConfigPage["ConfigPage - /config"]
        InformePage["InformePage - /informe"]
    end

    subgraph appCore["App.tsx - estado principal"]
        estadoGrafo["Grafo + historial"]
        estadoEjecucion["Ejecución vigente: pasos + resultado"]
        estadoPaso["Índice del paso actual"]
    end

    subgraph ui["components/"]
        PantallaInicio
        Toolbar
        StrategySelector
        StepControls
        GraphCanvas["GraphCanvas - Cytoscape"]
        ResultsPanel
        BulkLoadPanel
        DialogoEntrada
        IntegrantesDialog
    end

    subgraph dominio["Dominio - sin React"]
        algorithms["algorithms/ - prim, kruskal, dijkstra, fordFulkerson, cpm, pert"]
        proyecto["algorithms/proyecto.ts - cálculo común de CPM y PERT"]
        libGrafo["lib/grafo.ts"]
        parsers["parsers/ - texto, csv, json"]
        aleatorio["lib/aleatorio.ts"]
        ejemplos["examples/libro.ts"]
    end

    subgraph configuracion["config/"]
        configJson["config.json"]
        useConfig["useConfiguracion"]
    end

    main --> appCore
    main --> ConfigPage
    main --> InformePage

    appCore --> PantallaInicio
    appCore --> Toolbar
    appCore --> StrategySelector
    appCore --> StepControls
    appCore --> GraphCanvas
    appCore --> ResultsPanel
    appCore --> BulkLoadPanel
    appCore --> DialogoEntrada
    appCore --> IntegrantesDialog

    StrategySelector -. "elegir estrategia y parámetros" .-> appCore
    appCore -- "validar y ejecutar" --> algorithms
    algorithms --> proyecto
    algorithms -- "pasos + resultado" --> appCore
    StepControls -. "onIr, onReproducir" .-> appCore
    appCore -- "paso actual" --> GraphCanvas
    appCore -- "paso actual + resultado" --> ResultsPanel
    ResultsPanel -. "onIr" .-> appCore

    GraphCanvas -. "onConectar, onMover, onEliminar" .-> appCore
    appCore -- "aplicar" --> libGrafo
    libGrafo -- "nuevo Grafo" --> appCore

    BulkLoadPanel --> parsers
    parsers -- "GrafoPlano" --> appCore
    appCore -- "desdePlano" --> libGrafo

    appCore -. "generar grafo" .-> aleatorio
    appCore -. "cargar ejemplo" .-> ejemplos

    configJson --> useConfig
    useConfig -- "qué se muestra" --> appCore
    ConfigPage -. "cambios locales" .-> useConfig
```

**Lectura rápida:**
- Las flechas sólidas son dependencias de import/uso normal.
- Las flechas punteadas son callbacks/eventos que suben desde un componente
  hijo hacia `App.tsx`.
- Todo lo que está en **dominio** no importa nada de React: son los módulos
  más fáciles de testear en aislamiento (y son los que efectivamente tienen
  tests en `*.test.ts`).
- La configuración solo decide **qué se muestra**; nunca cambia un resultado.

---

## Diagrama de secuencia — ejecutar un algoritmo

Casos de uso UC-4.1 a UC-4.6: la persona usuaria elige una estrategia y toca
"Ejecutar". El algoritmo se calcula una sola vez; lo que se anima es el índice
del paso.

```mermaid
sequenceDiagram
    actor U as Usuario
    participant SS as StrategySelector
    participant App as App.tsx
    participant Est as estrategia
    participant GC as GraphCanvas
    participant RP as ResultsPanel

    U->>SS: elige estrategia y parámetros
    SS->>App: onCambiarEstrategia / onCambiarParametro
    App->>App: arma grafo efectivo (dirigido o no según la estrategia)
    App->>Est: validar(grafoEfectivo, parametros)
    Est-->>App: errores y advertencias
    App-->>SS: habilita o bloquea "Ejecutar"

    U->>SS: click "Ejecutar"
    SS->>App: onEjecutar()
    App->>Est: ejecutar(grafoEfectivo, parametros)
    Est-->>App: pasos + resultado
    App->>App: guarda ejecución con su clave, índice = 0

    loop un paso por vez (temporizador)
        App->>GC: paso actual
        GC-->>U: colores y textos sobre el grafo
        App->>RP: paso actual + resultado
        RP-->>U: explicación del paso y tablas parciales
        App->>App: índice + 1
    end

    App->>GC: último paso (aristasResultado)
    GC-->>U: resultado resaltado en azul
    App->>RP: resultado final
    RP-->>U: totales, tablas completas y avisos
```

---

## Diagrama de secuencia — avanzar paso a paso

Caso de uso UC-4.3: ir y volver por los pasos no recalcula nada.

```mermaid
sequenceDiagram
    actor U as Usuario
    participant SS as StrategySelector
    participant SC as StepControls
    participant App as App.tsx
    participant Est as estrategia
    participant GC as GraphCanvas
    participant RP as ResultsPanel

    U->>SS: click "Paso a paso"
    SS->>App: onPasoAPaso()
    App->>Est: ejecutar(grafoEfectivo, parametros)
    Est-->>App: pasos + resultado
    App->>App: índice = 0, sin reproducir

    U->>SC: click "Siguiente" / "Anterior" / "Final"
    SC->>App: onIr(nuevoIndice)
    App->>GC: pasos[nuevoIndice]
    GC-->>U: resaltado de ese paso
    App->>RP: pasos[nuevoIndice]
    RP-->>U: explicación y tablas hasta ese paso

    U->>RP: click en un paso de "Todos los pasos"
    RP->>App: onIr(indice)
    App-->>U: salta a ese paso
```

---

## Diagrama de secuencia — carga masiva de un grafo

Caso de uso UC-3.1 a UC-3.7: pegar texto y confirmar la carga.

```mermaid
sequenceDiagram
    actor U as Usuario
    participant BLP as BulkLoadPanel
    participant Parsers as parsers/
    participant App as App.tsx
    participant LibGrafo as lib/grafo.ts
    participant GC as GraphCanvas

    U->>BLP: pega texto / sube archivo
    BLP->>Parsers: detectarFormato(texto, nombreArchivo)
    Parsers-->>BLP: texto, csv o json
    BLP->>Parsers: parsear(texto, formato)
    Parsers-->>BLP: grafo plano o lista de errores

    alt hay errores de formato
        BLP-->>U: lista de errores por línea
    else grafo válido
        BLP-->>U: cantidad de nodos y aristas detectados
        U->>BLP: click "Reemplazar" o "Agregar"
        BLP->>App: onCargar(grafoPlano, modo)
        App->>LibGrafo: desdePlano(grafoPlano, dirigido, baseSiAgregar)
        LibGrafo-->>App: nuevo Grafo (con ids, fusionando por nombre)
        App->>App: aplicar(nuevoGrafo) - historial
        alt más de 20 nodos sin posición
            App->>GC: autoLayout()
        else grafo chico o con posiciones
            App->>GC: ajustar()
        end
        GC-->>U: grafo en el lienzo
    end
```

---

## Diagrama de secuencia — edición manual de una arista

Caso de uso UC-2.3 y UC-2.5: conectar dos nodos a mano.

```mermaid
sequenceDiagram
    actor U as Usuario
    participant GC as GraphCanvas
    participant App as App.tsx
    participant Dlg as DialogoEntrada
    participant LibGrafo as lib/grafo.ts

    U->>GC: click en nodo A
    U->>GC: click en nodo B
    GC->>App: onConectar(A, B)
    App->>App: existeArista(grafoEfectivo, A, B)?
    alt ya existe
        App-->>U: aviso "ya existe una arista..."
    else no existe
        App->>Dlg: pedir(titulo, etiqueta, validar)
        Dlg-->>U: formulario modal
        U->>Dlg: ingresa un peso, o tres tiempos para PERT
        Dlg->>Dlg: valida número y orden de los tiempos
        Dlg-->>App: texto ingresado o null si canceló
        App->>LibGrafo: agregarArista(grafo, A, B, tiempos)
        LibGrafo-->>App: nuevo Grafo
        App->>App: aplicar(nuevoGrafo) - apila en historial
        App->>GC: re-render con la nueva arista
    end
```

---

## Diagrama de secuencia — configuración

Caso de uso UC-6: qué algoritmos y componentes se muestran.

```mermaid
sequenceDiagram
    actor U as Usuario
    participant CP as ConfigPage
    participant Hook as useConfiguracion
    participant LS as localStorage
    participant App as App.tsx (otra pestaña)

    U->>CP: entra a /config
    CP->>Hook: lee configuración
    Hook->>LS: ¿hay configuración local?
    alt hay
        LS-->>Hook: configuración local
    else no hay
        Hook-->>Hook: usa config.json del proyecto
    end
    Hook-->>CP: configuración vigente

    U->>CP: apaga un algoritmo o un componente
    CP->>Hook: actualizar(cambio)
    Hook->>LS: guarda la configuración local
    LS-->>App: evento storage
    App->>App: vuelve a leer y oculta lo apagado

    U->>CP: "Volver a la del proyecto"
    CP->>Hook: usarDelProyecto()
    Hook->>LS: borra la configuración local
```
