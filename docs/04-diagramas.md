# Diagramas

## Diagrama de componentes

Muestra cómo se relacionan los módulos principales. `App.tsx` es el
orquestador: sostiene el estado y conecta la UI con la capa de dominio
(algoritmos, grafo, parsers).

```mermaid
flowchart TB
    subgraph entrada["Entrada"]
        main["main.tsx"]
    end

    subgraph appCore["App.tsx (estado principal)"]
        estadoGrafo["Grafo + historial"]
        estadoEjecucion["Ejecución vigente (resultado final)"]
    end

    subgraph ui["components/"]
        PantallaInicio
        Toolbar
        StrategySelector
        GraphCanvas["GraphCanvas (Cytoscape)"]
        ResultsPanel
        BulkLoadPanel
        DialogoEntrada
        IntegrantesDialog
    end

    subgraph dominio["Dominio (sin React)"]
        algorithms["algorithms/ (prim, kruskal)"]
        libGrafo["lib/grafo.ts"]
        parsers["parsers/ (texto, csv, json)"]
        aleatorio["lib/aleatorio.ts"]
    end

    main --> appCore

    appCore --> PantallaInicio
    appCore --> Toolbar
    appCore --> StrategySelector
    appCore --> GraphCanvas
    appCore --> ResultsPanel
    appCore --> BulkLoadPanel
    appCore --> DialogoEntrada
    appCore --> IntegrantesDialog

    StrategySelector -. "elegir estrategia/parámetros" .-> appCore
    appCore -- "estrategia.ejecutar(grafo, params)" --> algorithms
    algorithms -- "resultado" --> appCore
    appCore -- "resultado final" --> GraphCanvas
    appCore -- "resultado final" --> ResultsPanel

    GraphCanvas -. "onConectar / onMover / onEliminar" .-> appCore
    appCore -- "aplicar(fn)" --> libGrafo
    libGrafo -- "nuevo Grafo" --> appCore

    BulkLoadPanel --> parsers
    parsers -- "GrafoPlano" --> appCore
    appCore -- "desdePlano" --> libGrafo

    appCore -. "generar grafo" .-> aleatorio
```

**Lectura rápida:**
- Las flechas sólidas son dependencias de import/uso normal.
- Las flechas punteadas son callbacks/eventos que suben desde un componente
  hijo hacia `App.tsx`.
- Todo lo que está en **dominio** no importa nada de React: son los módulos
  más fáciles de testear en aislamiento (y son los que efectivamente tienen
  tests en `*.test.ts`).

---

## Diagrama de secuencia — ejecutar un algoritmo

Caso de uso UC-4.2: la persona usuaria elige una estrategia (Prim o Kruskal) y
toca "Ejecutar"; el resultado final aparece de inmediato.

```mermaid
sequenceDiagram
    actor U as Usuario
    participant SS as StrategySelector
    participant App as App.tsx
    participant Est as estrategia (prim/kruskal)
    participant GC as GraphCanvas
    participant RP as ResultsPanel

    U->>SS: elige estrategia + nodo inicial (si es Prim)
    SS->>App: onCambiarEstrategia / onCambiarParametro
    App->>App: recalcula validacion (estrategia.validar)
    App-->>SS: validación (errores/advertencias)

    U->>SS: click "Ejecutar"
    SS->>App: onEjecutar()
    App->>Est: ejecutar(grafoEfectivo, parametrosEfectivos)
    Est-->>App: resultado (árbol de aristas elegidas + distancia total)
    App->>App: guarda el resultado

    App->>GC: resultado final (aristasResultado)
    GC-->>U: resalta el árbol elegido sobre el grafo
    App->>RP: resultado final
    RP-->>U: tabla de aristas elegidas, distancia total, avisos (empates/no conexo)
```

---

## Diagrama de secuencia — carga masiva de un grafo

Caso de uso UC-3.1 a UC-3.6: pegar texto y confirmar la carga.

```mermaid
sequenceDiagram
    actor U as Usuario
    participant BLP as BulkLoadPanel
    participant Parsers as parsers/ (detectarFormato, parsear)
    participant App as App.tsx
    participant LibGrafo as lib/grafo.ts (desdePlano)

    U->>BLP: pega texto / sube archivo
    BLP->>Parsers: detectarFormato(texto, nombreArchivo)
    Parsers-->>BLP: 'texto' | 'csv' | 'json'
    BLP->>Parsers: parsear(texto, formato)
    Parsers-->>BLP: ResultadoParseo { grafo | null, errores[] }

    alt hay errores de formato
        BLP-->>U: lista de errores por línea
    else grafo válido
        U->>BLP: click "Reemplazar" o "Agregar"
        BLP->>App: onCargar(grafoPlano, modo)
        App->>LibGrafo: desdePlano(grafoPlano, dirigido=false, baseSiAgregar)
        LibGrafo-->>App: nuevo Grafo (con ids, fusionando por nombre)
        App->>App: aplicar(() => nuevoGrafo)  — historial
        App-->>U: grafo actualizado en el lienzo + aviso de cantidad cargada
    end
```

---

## Diagrama de secuencia — edición manual de una arista

Caso de uso UC-2.3: conectar dos nodos a mano.

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
        App->>Dlg: pedir({ titulo, etiqueta: 'Peso', validar })
        Dlg-->>U: formulario modal
        U->>Dlg: ingresa peso y confirma
        Dlg-->>App: peso (string) | null (si canceló)
        App->>LibGrafo: agregarArista(grafo, A, B, peso)
        LibGrafo-->>App: nuevo Grafo
        App->>App: aplicar(() => nuevoGrafo) — apila en historial
        App->>GC: re-render con la nueva arista
    end
```
