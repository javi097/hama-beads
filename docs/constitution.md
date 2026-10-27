# Constitución — Hama Beads Studio

Principios innegociables. Toda spec, plan y tarea debe cumplirlos sin excepción.

1. **Arquitectura modular por dominios**: la lógica de negocio, procesamiento y renderizado vive estrictamente en `src/hama/` (`core`, `components`, `store`, `hooks`, `layouts`, `pages`) y los componentes base reutilizables en `src/components/ui/` o `src/components/custom/`. Prohibido crear archivos o utilidades dispersos en la raíz de `src/`.
2. **La spec manda**: nada se implementa si no está recogido en la spec activa (`specs/NNN-*/`). Si falta un requisito, un caso de borde (imágenes sin transparencia, formatos no cuadrados, dimensiones extremas) o una decisión de diseño, el agente se detiene y pregunta antes de asumir.
3. **Tipado estricto innegociable**: cero `any` y cero tipos implícitos. Todas las entidades (matrices de cuentas, catálogo de colores, capas de vóxeles, inventario de materiales) derivan de contratos explícitos en `src/interfaces/*.interface.ts`, y todo componente tipa sus propiedades mediante `interface Props`.
4. **Pureza matemática en el core**: las funciones ubicadas en `src/hama/core/` (cuantización de color, distancia euclidiana RGB/Delta E, conversión cm a perlas y descomposición en capas 3D) son estrictamente puras. No dependen de hooks de React, variables globales, elementos del DOM ni del contexto de Canvas, garantizando tests unitarios deterministas.
5. **Estado predecible e inmutable**: las mutaciones del store de Zustand (`src/hama/store/hama.store.ts`) deben ser puras, atómicas e inmutables. Matrices bidimensionales (`BeadCell[][]`) y colecciones de capas se actualizan generando nuevas estructuras clonadas (`...state`), previniendo mutaciones directas y renders fantasmas.
6. **Integridad de datos y persistencia**: persistencia defensiva en `localStorage` bajo la clave `hama-storage` para configuración de usuario y patrones activos. Cualquier cambio en las interfaces del estado debe incorporar valores por defecto para evitar roturas tras recargar la página.
7. **Rendimiento gráfico y accesibilidad visual**:
   - El canvas 2D debe compensar obligatoriamente el Device Pixel Ratio (DPR) de la pantalla para evitar líneas de cuadrícula borrosas.
   - La escena en Three.js debe liberar geometrías y materiales (`dispose()`) al desmontar componentes para prevenir fugas de memoria en WebGL.
   - Estilos visuales construidos exclusivamente con utilidades de Tailwind CSS combinadas mediante el helper `cn()` de `@/lib/utils`.
8. **Compilación y verificación como puerta de paso**: prohibido dar por cerrada una tarea o avanzar con errores en `npx tsc --noEmit`, avisos de `npm run lint` o fallos en el empaquetado de producción (`npm run build`).
9. **Convención lingüística**: código, variables, contratos de TypeScript, nombres de carpetas y commits en inglés; documentación de gobernanza (`docs/`), especificaciones (`specs/`), memoria (`MEMORY.md`) y textos de ayuda en la interfaz en español.