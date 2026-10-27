# AGENTS.md — Hama Beads Studio
Aplicación web interactiva para la conversión, previsualización y ensamblaje de figuras en Hama Beads (perlas termofusibles de 5 mm) tanto en formato plano (2D) como tridimensional por capas (3D). Proyecto de refactorización desde prototipo monolítico a arquitectura profesional en React + TypeScript: modularidad por dominios (*feature-driven*), tipado estricto sin `any`, renderizado con HTML5 Canvas y Three.js, diseño reactivo con Tailwind CSS y gestión de estado predecible con Zustand.

## Stack y estructura
- React (Vite, TypeScript en modo estricto) y Tailwind CSS.
- Gráficos y renderizado: HTML5 Canvas API (para vista 2D/rejilla) y Three.js (para visor 3D interactivo por capas).
- Gestión de estado: Zustand con persistencia en `localStorage` (clave `hama-storage`).
- Arquitectura modular con alias `@/*` apuntando a `./src/*`:
```
src/
├── assets/                 # Iconos SVG y recursos gráficos
├── components/             # Componentes transversales compartidos
│   ├── custom/             # Componentes propios (Dropzone, MetricBadge, ColorSwatch...)
│   └── ui/                 # Componentes base primitivos (button, card, slider, tabs, modal...)
├── interfaces/             # Contratos de datos globales (*.interface.ts)
├── lib/                    # Utilidades puras (utils.ts con cn, color-converters...)
├── hama/                   # Dominio / Feature principal de la aplicación
│   ├── actions/            # Carga de imágenes, exportación (PDF/PNG) y pipeline de cuantización
│   ├── components/         # Componentes de la UI de Hama:
│   │   ├── Canvas2D/       # Grid2DCanvas, PegboardOverlay, ZoomControls
│   │   ├── Scene3D/        # VoxelScene3D, LayerStack, OrbitControls
│   │   ├── Controls/       # DimensionInput, ThresholdSlider, ModeToggle
│   │   └── Guide/          # ColorInventoryTable, StepByStepInstructions, LayerSlider
│   ├── core/               # Lógica matemática pura desacoplada de React:
│   │   ├── palette.const.ts     # Paleta oficial Hama Beads Midi (HEX, RGB, ID, nombres)
│   │   ├── quantizer.ts         # Mapeo de color euclidiano / Delta E
│   │   ├── grid-calculator.ts   # Conversión de dimensiones: cm -> número de perlas (5 mm)
│   │   └── voxelizer.ts         # Descomposición 2D en capas 3D superpuestas
│   ├── hooks/              # Custom hooks (useImageProcessor, useCanvasRenderer, useThreeScene)
│   ├── layouts/            # SplitPaneLayout (visor izquierda, panel de instrucciones derecha)
│   ├── pages/              # StudioPage.tsx
│   └── store/              # hama.store.ts (Zustand con persistencia)
├── index.css               # Estilos globales y tokens semánticos de Tailwind
├── App.tsx                 # Contenedor raíz con proveedores globales y SplitPaneLayout
└── main.tsx                # Punto de entrada de Vite
```
## Convenciones
- Nombres de archivos, interfaces, tipos, variables y componentes en inglés.
- Textos de interfaz y guías técnicas en español o inglés consistente (según el componente de guía).
- Tipado estricto innegociable: cero `any`, contratos explícitos con sufijo `.interface.ts` en `src/interfaces/`, y props de componentes tipadas con `interface Props`.
- Funciones matemáticas (`src/hama/core/`) completamente puras: no dependen de estados de React, elementos DOM ni canvas. Deben recibir datos y devolver resultados predecibles.
- Estilos exclusivamente con utilidades de Tailwind CSS combinadas mediante `cn()` de `@/lib/utils`. Diseño responsivo con soporte para panel lateral plegable.

## Dominio y reglas de negocio (fácil equivocarse)
- **Escala de perlas:** El estándar es Hama Beads Midi (5 mm de diámetro = 0.5 cm).
  - Fórmula: $\text{cuentas} = \text{redondear}(\text{medida en cm} / 0.5)$.
- **Cuantización de color:** La sustitución de color compara el valor RGB de cada píxel de la imagen escalada contra los valores RGB de `HAMA_PALETTE` usando distancia euclidiana mínima.
- **Transparencia:** Píxeles con canal alfa $< 128$ (o fondos transparentes) deben ignorarse (representados como `null` en la matriz de la cuadrícula).
- **Modo 3D:** La generación tridimensional desglosa la figura en una pila de capas horizontales (`VoxelLayer[]`). Cada capa debe poder visualizarse de forma independiente o en conjunto mediante un índice de capa activa.
- **Estado de Zustand inmutable:** Cualquier actualización de la cuadrícula o de las dimensiones debe retornar un nuevo objeto o matriz mediante desestructuración (`...state`), sin mutar matrices bidimensionales directamente.

## Forma de trabajar
- Haz solo lo que se pide: no instales librerías innecesarias ni agregues funcionalidades no contempladas.
- Desarrollo guiado por especificaciones (SDD): lee la spec activa antes de tocar código.
- Refactorización incremental: migra la lógica del archivo monolítico por capas (`core` -> `types` -> `store` -> `components`).
- Al terminar, resume qué has cambiado, qué archivos se han creado y las decisiones tomadas.

## Skills y Metodología (.agents/skills/)
El agente tiene a su disposición las siguientes skills locales:
- **`sdd`**: Flujo de desarrollo guiado por especificaciones (`sdd-spec`, `sdd-plan`, `sdd-tasks`, `sdd-implement`).
- **`frontend-design` & `web-design-guidelines`**: Directrices de espaciado, contraste, canvas nítido en pantallas de alta densidad (DPR) y paneles divididos legibles.
- **`systematic-debugging`**: Protocolo sistemático de diagnóstico de errores (aislamiento de fallos, trazas y reproducción) antes de alterar código funcional.

## Memoria
- Al empezar, lee `MEMORY.md` para conocer el estado del proyecto y las decisiones tomadas.
- Al terminar una tarea, actualízalo: estado actual, decisiones importantes (con su porqué) y errores a evitar.
- Mantenlo breve (máximo ~50 líneas).
- Si algo se convierte en una regla permanente, propón moverlo a `AGENTS.md`.
- No guardes nunca datos sensibles (claves de API o tokens).

## Comandos
- Servidor local: `npm run dev`
- Comprobación de tipos: `npx tsc --noEmit`
- Linter: `npm run lint`
- Compilación: `npm run build`

## Reglas y Límites
- ✅ Siempre: mantener la modularidad por carpetas (`src/hama/`, `src/interfaces/`, `src/components/ui/`) y los alias `@/*`.
- ✅ Siempre: actualizar `MEMORY.md` al terminar cada tarea.
- ⚠️ Pregunta antes: agregar dependencias pesadas no acordadas (por ejemplo, librerías complejas de canvas adicionales a Three.js).
- 🚫 Nunca: usar `any` en TypeScript, meter estilos CSS en línea (excepto posiciones dinámicas de canvas) o dejar la compilación en rojo (`npx tsc --noEmit`).

## Verificación
- **Estática:** Comprueba tipos con `npx tsc --noEmit` y linter con `npm run lint`.
- **UI y Ejecución (Chrome DevTools MCP):** Abre `http://localhost:5173/`, verifica que la imagen cargue, que el canvas dibuje la cuadrícula sin desenfoque, que el visor 3D responda al ratón y que la tabla de colores cuente las perlas correctamente[cite: 9].
- **Consulta de Documentación (Context7 MCP):** Ante dudas sobre Three.js, Canvas API, Zustand o Tailwind, usa Context7 para consultar la documentación oficial.
- Para empezar de cero en pruebas: DevTools → Application → Local Storage → borrar la clave `hama-storage`.