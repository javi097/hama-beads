# MEMORY.md — Hama Beads Studio

## Estado del Proyecto
- Inicializado proyecto con Vite + React + TypeScript + Tailwind CSS con alias `@/*`.
- **167/167 tests en verde (`npm test`), compilación estricta (`npx tsc --noEmit`), linter limpio (`npm run lint`) y build verificado.**
- Visor WebGL Three.js con InstancedMesh, despiece con vista explosionada, 3 modos volumétricos, selector 2D/3D reactivo y exportador PDF.
- **Arquitectura Volumétrica 3D Redondeada (Revolución Elipsoidal en 360°):**
  1. *Síntesis Volumétrica Pura (`synthesizeRoundedVolume`):* Inflado elipsoidal continuo por segmentos horizontales en cada fila $y$. $R_x = W/2$, $R_z = (W/W_{\max}) \times (depth/2)$. Produce sombrero esférico en cúpula y tallo cilíndrico en la seta sin deformaciones.
  2. *Modo Apilado Hueco (`hollow`):* Escultura 3D redondeada completa con vaciado perimétrico interior (1 o 2 perlas) para máximo ahorro de material y pegado capa a capa.
  3. *Modo Interlocking Lego (`cross_ribs`):* Genera TODAS las capas que conforman la escultura redondeada 3D en $Z$, vaciadas interiormente con `identifyInteriorVoxels3D(grid3D, 1)` garantizando que la piel exterior nunca se perfore. Aloja el eje conector interno en el núcleo.
  4. *Vista Explosionada:* Con `gap = 0`, ambos modos muestran la escultura 3D completa y redondeada; con `gap > 0`, las capas se separan simétricamente en $Z$ revelando el eje conector interno.
  5. *Separación `frontGrid` vs. `structuralGrid` y Geometría Continua:* Superficie frontal exterior ($z = zMax(x, y)$) reproduce fielmente `frontGrid`. Masa interior, laterales y dorso ($z < zMax$) emplean `structuralGrid` (absorbe detalles interiores pequeños en su región envolvente mediante contexto espacial, y preserva regiones estructurales grandes múltiples sin colapsar en un único color). Profundidad continua $zMin \to zMax$ en cada $(x, y)$ y continuidad X/Y sin huecos accidentales, respetando concavidades reales.

## Decisiones Técnicas y Arquitectura 3D
- **Representación Canónica Única:** `VoxelGrid3D` desacopla la generación de volumen del slicing de fabricación.
- **Interlocking Real:** Cero colisiones volumétricas en 3D (`occupancy.has(key) === false`), cero perlas fuera de la silueta redondeada y 100% de coherencia entre Three.js, inventario BOM y pasos de montaje PDF.

## Errores a Evitar
- Prohibido generar aletas planas aisladas o cajas rectangulares genéricas para figuras recortadas.
- No proyectar rasgos faciales oscuros (ojos) hacia la nuca/espalda en modelos 3D.
- La columna vertebral interna debe permanecer estrictamente confinada dentro de la cavidad hueca.
- Slicing simétrico y coherente en $Z$: las capas del cuerpo son planos XY que se desplazan simétricamente en la vista explosionada.
