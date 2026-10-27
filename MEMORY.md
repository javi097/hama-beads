# MEMORY.md — Hama Beads Studio

## Estado del Proyecto
- Inicializado proyecto con Vite + React + TypeScript + Tailwind CSS.
- Alias `@/*` configurado en `tsconfig.json`, `tsconfig.app.json` y `vite.config.ts`.
- Repositorio vinculado a GitHub y despliegue continuo activo en Vercel.
- Configurada guía de agentes en `AGENTS.md`.

## Decisiones Técnicas
- **Estructura modular:** Dominio principal en `src/hama/` desacoplando el motor matemático (`core/`) de la presentación (`components/`).
- **Escala base:** Cuentas Midi de 5 mm de diámetro (0.5 cm por celda de la cuadrícula).
- **Zustand:** Estado global centralizado para coordinar la vista 2D/3D con el desglose de materiales.

## Próximos Pasos
- Crear contratos de interfaces en `src/interfaces/`.
- Extraer paleta oficial Hama y funciones puras a `src/hama/core/`.
- Migrar el código del archivo `index.html` original.