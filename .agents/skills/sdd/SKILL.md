---
name: sdd
description: Metodología de Desarrollo Dirigido por Especificaciones (SDD). Úsala para redactar, revisar o cambiar specs, planes y tareas, o implementar y validar tareas en specs/.
---

# Spec-Driven Development (SDD)

## Flujo de trabajo
Constitución → Spec → Clarificación → Plan → Tareas → Implementación → Validación → Cambio.
- Nunca pases a la siguiente fase sin la aprobación explícita del usuario.
- La spec manda: si algo no está en la spec, no se implementa. Si falta una decisión, para y pregunta.
- Un cambio de requisitos se hace primero en la spec, luego en el plan y las tareas, y por último en el código.
- Cada spec vive en su carpeta: `specs/NNN-nombre/` con `spec.md`, `plan.md` y `tasks.md`.
- Al terminar cada fase, actualiza `MEMORY.md`.

---

## Comandos y acciones disponibles
Para ejecutar cada fase del flujo, utiliza las instrucciones detalladas de la carpeta `commands/`:

- **/sdd-constitution**: Principios base en `docs/constitution.md`.
- **/sdd-spec**: Redacción de requisitos funcionales en `specs/NNN-nombre/spec.md`.
- **/sdd-clarify**: Auditoría QA de ambigüedades y casos límite en la spec.
- **/sdd-plan**: Diseño de arquitectura técnica en `specs/NNN-nombre/plan.md`.
- **/sdd-tasks**: Desglose de tareas atómicas en `specs/NNN-nombre/tasks.md`.
- **/sdd-implement**: Implementación de una única tarea con TDD estricto.
- **/sdd-validate**: Validación de la suite de pruebas y criterios RF por RF.
- **/sdd-change**: Modificación controlada de una spec existente.
- **/sdd-status**: Consulta de avance y estado de la spec activa.
- **/feature**: Flujo ágil para cambios menores que no requieren spec formal.

### Referencias a comandos
@[sdd-constitution](commands/sdd-constitution.md)
@[sdd-spec](commands/sdd-spec.md)
@[sdd-clarify](commands/sdd-clarify.md)
@[sdd-plan](commands/sdd-plan.md)
@[sdd-tasks](commands/sdd-tasks.md)
@[sdd-implement](commands/sdd-implement.md)
@[sdd-validate](commands/sdd-validate.md)
@[sdd-change](commands/sdd-change.md)
@[sdd-status](commands/sdd-status.md)
@[feature](commands/feature.md)

---

## Plantilla de spec (spec.md)
```markdown
# Spec NNN — <Nombre>
Estado: borrador | aprobada | implementada

## Contexto y objetivo
## Usuarios
## Historias de usuario
- HU-1. Como <rol>, quiero <acción> para <beneficio>.
## Definiciones (solo si hay términos que puedan interpretarse de varias formas)
## Requisitos funcionales
## Requisitos no funcionales
## Casos límite
## Fuera de alcance
## Criterios de finalización
## Dudas abiertas
- [NECESITA ACLARACIÓN] <duda>