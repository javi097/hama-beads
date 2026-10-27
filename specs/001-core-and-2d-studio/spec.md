# Spec 001 — Core y Estudio 2D
Estado: aprobada

---

## Contexto y objetivo

Hama Beads Studio es una aplicación web que convierte imágenes digitales en patrones de perlas termofusibles (*hama beads*) listos para montar. El usuario sube una imagen, configura las dimensiones físicas deseadas y el tipo de perla, y la aplicación genera automáticamente la cuadrícula de colores cuantizados, el inventario de materiales y un visor interactivo del patrón.

Esta spec cubre el **núcleo funcional de la aplicación** (motor de conversión) y el **estudio 2D** (visor plano interactivo). Es la base sobre la que se construirán todas las funcionalidades posteriores.

**Objetivo principal:** que un usuario con una imagen y unas medidas en mente pueda, en menos de un minuto, ver exactamente qué perlas necesita y dónde colocarlas.

---

## Usuarios

- **Aficionado a las manualidades:** conoce las perlas Hama, tiene placas en casa y quiere convertir un dibujo o foto en un patrón fácil de seguir.
- **Creador de diseños personalizados:** quiere explorar distintos tamaños, paletas reducidas y exportar el patrón para compartirlo o imprimirlo.

---

## Historias de usuario

- **HU-1.** Como usuario, quiero subir mi propia imagen (PNG, JPG, WEBP o SVG) para convertirla en un patrón de perlas Hama personalizado.
- **HU-2.** Como usuario, quiero elegir el tipo de perla (Mini, Midi o Maxi) para adaptar el patrón al material que tengo en casa.
- **HU-3.** Como usuario, quiero indicar las dimensiones físicas del resultado en centímetros para que el patrón encaje en el espacio que tengo disponible.
- **HU-4.** Como usuario, quiero que la aplicación elimine automáticamente el fondo blanco de mis imágenes JPG para que solo se cuenten las perlas del diseño real.
- **HU-5.** Como usuario, quiero ver el patrón en un visor 2D interactivo con zoom y cuadrícula para revisar los detalles antes de empezar a montar.
- **HU-6.** Como usuario, quiero ver el código oficial Hama en cada celda del visor para saber exactamente qué perla colocar en cada posición.
- **HU-7.** Como usuario, quiero filtrar el visor por un color concreto para concentrarme en colocar todas las perlas de ese color de una vez.
- **HU-8.** Como usuario, quiero una tabla de materiales con el recuento exacto de perlas por color para saber cuántas unidades de cada bote necesito comprar.
- **HU-9.** Como usuario, quiero saber cuántas placas base necesito y en qué disposición para preparar mi espacio de trabajo.
- **HU-10.** Como usuario, quiero descargar el patrón como imagen PNG de alta resolución con los códigos impresos para usarla de guía mientras monto.
- **HU-11.** Como usuario, quiero restringir la paleta a los colores que tengo disponibles en casa para que el patrón sea directamente realizable.

---

## Definiciones

| Término | Significado en este dominio |
|---|---|
| **Perla / Cuenta** | Unidad física circular de plástico termofusible de diámetro normalizado. |
| **Tipo de perla** | Variante de tamaño: Mini (2,5 mm), Midi (5,0 mm) o Maxi (10,0 mm). |
| **Cuadrícula** | Matriz bidimensional de celdas, una por perla, resultado de la conversión. |
| **Celda** | Posición discreta de la cuadrícula; contiene un color Hama o está vacía (transparente). |
| **Paleta Hama oficial** | Conjunto de 30 colores de la gama Midi con identificador numérico, nombre y valor HEX definido. Los códigos no son consecutivos: series 01–30 (con saltos en 13–16, 19, 23–25, 31–42), 43–48 y 70–71. La lista con los valores HEX incluida en el prototipo (`prototype.html`) es la **fuente de verdad definitiva** de esta spec y refleja fielmente el catálogo Hama Beads Midi comercial. |
| **Paleta activa** | Subconjunto de la paleta oficial habilitado por el usuario para la cuantización. |
| **Cuantización** | Proceso de sustituir el color exacto de cada píxel por el color más cercano de la paleta activa. |
| **Placa base** | Tablero de clavijas cuadrado sobre el que se colocan las perlas; cada tipo tiene un tamaño estándar: Mini 28×28, Midi 29×29, Maxi 15×15. |
| **BOM (Bill of Materials)** | Tabla de inventario de materiales con recuento de perlas por color. |
| **Píxel transparente** | Píxel cuyo canal alfa es inferior a 120; se descarta y no genera perla. |
| **Eliminación de fondo** | Proceso opcional de detección y descarte del color de fondo en imágenes sin transparencia real (p. ej. JPG). |

---

## Requisitos funcionales

### RF-1 — Carga de imagen

**RF-1.1.** El sistema deberá aceptar imágenes en los formatos PNG, JPG/JPEG, WEBP y SVG.

**RF-1.2.** Cuando el usuario seleccione un archivo mediante el explorador de archivos, el sistema deberá cargar y procesar la imagen inmediatamente.

**RF-1.3.** Cuando el usuario arrastre y suelte un archivo de imagen sobre la zona de carga (*drag & drop*), el sistema deberá cargar y procesar la imagen de la misma forma que si se hubiese seleccionado mediante explorador.

**RF-1.4.** Cuando se cargue una nueva imagen con el bloqueo de proporción activo, el sistema deberá recalcular automáticamente la dimensión de alto en centímetros para mantener la relación de aspecto original de la imagen, dejando el ancho como referencia.

**RF-1.5.** El sistema deberá ofrecer al menos tres imágenes de demostración seleccionables directamente desde la interfaz (sin necesidad de subir un archivo), accesibles en todo momento.

**RF-1.6.** Al iniciar la aplicación por primera vez, el sistema deberá cargar automáticamente una imagen de demostración predefinida para que el visor, la cuadrícula y la tabla de materiales sean visibles desde el primer instante.

**RF-1.7.** Si el usuario intenta cargar un archivo en un formato no soportado, el sistema deberá mostrar un mensaje de error claro e ignorar el archivo sin alterar el estado actual.

---

### RF-2 — Selección de tipo de perla

**RF-2.1.** El sistema deberá permitir al usuario seleccionar uno de los tres tipos de perla oficiales: Mini (2,5 mm), Midi (5,0 mm) o Maxi (10,0 mm).

**RF-2.2.** Cuando el usuario cambie el tipo de perla, el sistema deberá recalcular inmediatamente la cuadrícula con el nuevo diámetro de perla aplicado a las dimensiones en centímetros vigentes.

**RF-2.3.** Cuando el usuario cambie el tipo de perla, el sistema deberá actualizar el tamaño de placa base utilizado para el cálculo de placas necesarias (Mini: 28×28, Midi: 29×29, Maxi: 15×15).

---

### RF-3 — Configuración de dimensiones físicas

**RF-3.1.** El sistema deberá permitir al usuario introducir las dimensiones físicas del patrón en centímetros, con una resolución mínima de 0,5 cm por paso.

**RF-3.2.** El sistema deberá aceptar valores entre 4 cm y 100 cm para cada dimensión.

**RF-3.3.** Si el usuario introduce un valor inferior a 4 cm, el sistema deberá forzar el campo al mínimo (4 cm).

**RF-3.4.** Si el usuario introduce un valor superior a 100 cm, el sistema deberá forzar el campo al máximo (100 cm).

**RF-3.5.** Cuando el usuario modifique cualquier dimensión, el sistema deberá recalcular y mostrar inmediatamente la resolución resultante en perlas (columnas × filas).

---

### RF-4 — Bloqueo de proporción de aspecto

**RF-4.1.** El sistema deberá disponer de un control que permita activar o desactivar el bloqueo de proporción de aspecto de la imagen.

**RF-4.2.** Mientras el bloqueo de proporción esté activo y el usuario modifique el ancho en centímetros, el sistema deberá ajustar automáticamente el alto para mantener la proporción original de la imagen.

**RF-4.3.** Mientras el bloqueo de proporción esté activo y el usuario modifique el alto en centímetros, el sistema deberá ajustar automáticamente el ancho para mantener la proporción original de la imagen.

**RF-4.4.** Mientras el bloqueo de proporción esté desactivado, el sistema deberá permitir modificar ancho y alto de forma completamente independiente.

---

### RF-5 — Cálculo de la cuadrícula

**RF-5.1.** El sistema deberá calcular el número de perlas de cada lado mediante la fórmula `redondear(dimensión_cm / diámetro_perla_cm)`.

**RF-5.2.** Si el cálculo resulta en menos de 8 perlas en cualquier lado, el sistema deberá forzar ese lado a 8 perlas.

**RF-5.3.** Si el cálculo resulta en más de 120 perlas en cualquier lado, el sistema deberá limitar ese lado a 120 perlas.

**RF-5.4.** El sistema deberá mostrar la resolución final de la cuadrícula (columnas × filas) de forma visible y actualizada en tiempo real al cambiar tipo de perla o dimensiones.

---

### RF-6 — Gestión de transparencia y eliminación de fondo

**RF-6.1.** El sistema deberá descartar automáticamente cualquier píxel con canal alfa inferior a 120; las celdas correspondientes quedarán vacías (sin perla).

**RF-6.2.** El sistema deberá disponer de un control visible que permita al usuario activar o desactivar la eliminación de fondo, estando activo por defecto.

**RF-6.3.** Mientras la eliminación de fondo esté activa, el sistema deberá detectar el color predominante del fondo muestreando las cuatro esquinas de la imagen escalada y descartar los píxeles cuyo color sea suficientemente cercano a ese fondo. La detección solo se activará cuando el color de fondo detectado sea claro (valores R, G y B todos superiores a 240) y la distancia de color empleada será la distancia euclidiana RGB estándar con un umbral máximo de 20. Este valor garantiza absorber el ruido y artefactos de compresión JPEG sin descartar tonos Hama cercanos al blanco, como Crema (#F3E5AB) o los colores pastel.

**RF-6.4.** Mientras la eliminación de fondo esté desactivada, el sistema deberá tratar todos los píxeles no transparentes como parte del diseño y mapearlos al color Hama más cercano, incluyendo el blanco.

**RF-6.5.** Cuando el usuario active o desactive la eliminación de fondo, el sistema deberá regenerar la cuadrícula y actualizar el visor y la tabla de materiales inmediatamente.

---

### RF-7 — Cuantización de color

**RF-7.1.** El sistema deberá asignar a cada píxel no descartado el color de la paleta activa más cercano, calculando la distancia mediante la fórmula Redmean (distancia euclidiana RGB con ponderación perceptual de luminancia).

**RF-7.2.** El sistema deberá realizar la cuantización exclusivamente contra los colores de la paleta activa en el momento del procesamiento.

**RF-7.3.** Cuando la paleta activa cambie, el sistema deberá recuantizar la imagen completa y actualizar la cuadrícula, el visor y la tabla de materiales.

---

### RF-8 — Paleta activa y modal de paleta

**RF-8.1.** El sistema deberá mostrar un control accesible desde la cabecera que permita abrir el modal de gestión de paleta, indicando cuántos colores están actualmente activos sobre el total disponible.

**RF-8.2.** El modal de paleta deberá mostrar los 30 colores de la paleta oficial Hama con su muestra de color, código numérico oficial y nombre, permitiendo activar o desactivar cada uno individualmente.

**RF-8.3.** El sistema deberá garantizar que siempre haya al menos un color activo en la paleta; si el usuario intenta desactivar el último color activo, el sistema deberá ignorar la acción.

**RF-8.4.** El modal de paleta deberá ofrecer dos preselecciones rápidas:
  - **"Todos los colores"**: activa los 30 colores de la paleta oficial.
  - **"Colores básicos"**: activa únicamente los 6 colores fundamentales (#01 Blanco, #03 Amarillo, #05 Rojo, #08 Azul, #10 Verde, #18 Negro).

---

### RF-9 — Visor 2D interactivo

**RF-9.1.** El sistema deberá renderizar la cuadrícula en un lienzo (*canvas*) 2D compensando el *Device Pixel Ratio* (DPR) de la pantalla para garantizar líneas y perlas nítidas en monitores de alta densidad.

**RF-9.2.** El visor deberá mostrar reglas numéricas en el eje superior (columnas) y en el eje izquierdo (filas) para facilitar la localización de cada celda durante el montaje.

**RF-9.3.** Cada celda vacía (píxel transparente o fondo descartado) deberá mostrarse con un patrón ajedrezado sutil y una clavija central visible para representar la placa base.

**RF-9.4.** El sistema deberá ofrecer una opción que permita al usuario alternar entre dos modos de representación visual de las perlas:
  - **Vista perla**: círculo con hueco central que simula la forma real de la perla Hama.
  - **Vista píxel**: cuadrado sólido de color (estilo *pixel art*).

**RF-9.5.** Cuando la opción de cuadrícula esté activa, el sistema deberá dibujar las líneas divisorias entre celdas, diferenciando visualmente con un trazo más grueso y en color distinto los límites de placa base (cada N celdas según el tipo de perla seleccionado).

**RF-9.6.** Cuando la opción de códigos esté activa y el tamaño de celda sea suficiente para su legibilidad, el sistema deberá mostrar el código numérico oficial Hama en el interior de cada perla, con color de texto adaptado a la luminancia del color de fondo para garantizar el contraste.

---

### RF-10 — Control de zoom del visor 2D

**RF-10.1.** El sistema deberá ofrecer controles de incremento y decremento del zoom en pasos del 25%, con un rango entre el 50% y el 300%, mostrando el porcentaje actual.

**RF-10.2.** Cuando el canvas supere el área visible del visor, el sistema deberá activar barras de desplazamiento (*scroll*) nativas para permitir la exploración de toda la cuadrícula.

**RF-10.3.** En entornos de escritorio con rueda de ratón o trackpad, el sistema deberá permitir hacer zoom con `Ctrl + rueda del ratón` centrado en la posición del puntero, sin sobrepasar los límites del 50% y el 300%. En dispositivos táctiles el zoom se gestiona exclusivamente mediante los botones (+/−) de la interfaz.

---

### RF-11 — Resalte de color (*highlight*)

**RF-11.1.** Cuando el usuario haga clic en un color de la tabla de materiales, el sistema deberá atenuar todas las perlas del visor que no sean de ese color (opacidad reducida a aproximadamente el 18%), destacando visualmente únicamente las perlas del color seleccionado.

**RF-11.2.** Cuando el usuario haga clic de nuevo en el mismo color ya resaltado, el sistema deberá desactivar el resalte y restaurar todos los colores a su opacidad completa.

**RF-11.3.** Mientras haya un color resaltado, el sistema deberá mostrar un control en el pie del visor que permita al usuario quitar el filtro y restaurar la vista completa con un solo clic.

---

### RF-12 — Tabla de inventario de materiales (BOM)

**RF-12.1.** El sistema deberá mostrar una tabla de inventario de materiales con una fila por cada color de la paleta activa que aparezca en la cuadrícula, incluyendo: muestra de color, código numérico oficial, nombre del color y recuento exacto de perlas.

**RF-12.2.** La tabla deberá ordenarse de mayor a menor recuento de perlas.

**RF-12.3.** El sistema deberá mostrar el recuento total de perlas del diseño (suma de todas las celdas no vacías) de forma destacada sobre la tabla.

**RF-12.4.** Cuando la cuadrícula se regenere (por cambio de imagen, dimensiones, tipo de perla o paleta activa), el sistema deberá actualizar la tabla de materiales de forma automática y sincronizada.

---

### RF-13 — Cálculo de placas base necesarias

**RF-13.1.** El sistema deberá calcular y mostrar el número mínimo de placas base necesarias para cubrir la cuadrícula completa, expresado como disposición en rejilla (columnas × filas de placas) y como total de unidades.

**RF-13.2.** El cálculo deberá usar el tamaño de placa correspondiente al tipo de perla activo (Mini: 28×28, Midi: 29×29, Maxi: 15×15) y aplicar la fórmula `ceil(perlas_lado / tamaño_placa)`.

**RF-13.3.** Cuando cambie el tipo de perla o las dimensiones físicas, el sistema deberá actualizar el cálculo de placas de forma automática.

---

### RF-14 — Exportación del patrón en PNG

**RF-14.1.** El sistema deberá ofrecer una acción de descarga que genere un archivo PNG de alta resolución del patrón.

**RF-14.2.** El PNG exportado deberá incluir una cabecera legible con los metadatos del patrón: título, tipo de perla seleccionado, dimensiones en centímetros y resolución en perlas (columnas × filas).

**RF-14.3.** El PNG exportado deberá incluir reglas numéricas en los ejes para facilitar la localización de cada celda.

**RF-14.4.** El PNG exportado deberá representar cada perla como un círculo con el código numérico oficial Hama impreso en su interior, con color de texto adaptado a la luminancia del color de fondo para garantizar el contraste.

**RF-14.5.** El PNG exportado deberá usar un fondo blanco limpio, independientemente del tema visual activo en la interfaz (claro u oscuro).

**RF-14.6.** Cuando el usuario active la descarga, el sistema deberá generar el archivo y descargarlo directamente al dispositivo sin navegar a una nueva página.

---

## Requisitos no funcionales

**RNF-1 — Rendimiento:** El procesamiento completo de la imagen (escalado, cuantización y renderizado del visor) deberá completarse en menos de 2 segundos para cuadrículas de hasta 120×120 perlas en un ordenador de escritorio de gama media.

**RNF-2 — Nitidez visual:** El canvas 2D deberá compensar el *Device Pixel Ratio* en todo momento para evitar borrosidad en pantallas de alta densidad (Retina, HiDPI).

**RNF-3 — Reactividad:** Cualquier cambio en los controles (tipo de perla, dimensiones, paleta, toggles de vista) deberá reflejarse en el visor y en la tabla de materiales sin necesidad de que el usuario pulse ningún botón de "recalcular".

**RNF-4 — Persistencia:** La configuración del usuario (tipo de perla, dimensiones, colores activos, preferencias de vista) deberá persistir entre sesiones mediante almacenamiento local en el navegador, con valores por defecto seguros ante cambios de estructura.

**RNF-5 — Accesibilidad básica:** Los controles interactivos deberán ser operables mediante teclado. El contraste de texto sobre las perlas en el visor y en el PNG exportado deberá ajustarse automáticamente a la luminancia del color de fondo.

**RNF-6 — Compatibilidad:** La aplicación deberá funcionar correctamente en las versiones actuales de Chrome, Firefox, Safari y Edge en escritorio.

---

## Casos límite

**CL-1 — Imagen de un solo color sólido (sin transparencia):** Todos los píxeles se mapean al mismo color de la paleta activa. La tabla de materiales muestra una única fila; el visor renderiza una cuadrícula uniforme. Comportamiento válido.

**CL-2 — Imagen completamente transparente:** Ningún píxel supera el umbral de alfa. La cuadrícula resultante es completamente vacía. El sistema deberá mostrar la cuadrícula vacía (solo clavijas) y la tabla de materiales sin filas de colores, con un total de 0 perlas.

**CL-3 — Imagen con fondo blanco y eliminación de fondo activa, donde el diseño también contiene blanco legítimo:** La tolerancia de detección de fondo puede descartar perlas blancas internas. Este es un comportamiento conocido y documentado; el usuario puede desactivar el toggle para preservar todos los píxeles.

**CL-4 — Dimensión que produce exactamente 8 perlas (mínimo forzado):** El sistema aplica el mínimo de 8 sin mostrar error; el visor muestra una cuadrícula de al menos 8×8 y la proporción puede verse alterada respecto a la imagen original.

**CL-5 — Dimensión que produce más de 120 perlas (máximo forzado):** El sistema aplica el límite de 120 sin mostrar error; las dimensiones en cm permanecen tal como las introdujo el usuario, pero la resolución en perlas está limitada.

**CL-6 — Paleta activa de un único color:** Todos los píxeles no descartados se mapean a ese único color. Comportamiento válido para patrones monocromáticos; el sistema no debe bloquearlo.

**CL-7 — Cuadrícula muy pequeña con zoom al 300%:** Las celdas serán grandes; los códigos de color deben ser legibles. El contenedor deberá mostrar scroll si el canvas supera el área visible.

**CL-8 — Cuadrícula de 120×120 con zoom al 300%:** El canvas puede alcanzar dimensiones extremas. El sistema deberá mantener el renderizado fluido y funcional con barras de scroll, aunque el rendimiento esté cerca de su límite declarado.

**CL-9 — SVG con formas vectoriales:** El sistema deberá rasterizarlos correctamente antes de escalar; si el SVG usa características no compatibles con el contexto de renderizado, el resultado puede ser impredecible. No se garantiza soporte perfecto de SVG complejos con scripts o animaciones.

**CL-10 — Imagen no cuadrada con bloqueo de proporción:** Al cambiar el ancho, el alto calculado puede resultar en un valor con decimales. El sistema deberá redondear a un decimal visible (resolución 0,1 cm) y recalcular la cuadrícula desde ese valor.

---

## Fuera de alcance

- Visor 3D (escena de vóxeles interactiva): cubierto en la Spec 002.
- Guía de montaje por capas para figuras tridimensionales: cubierta en la Spec 002.
- Exportación a PDF: cubierta en la Spec 002 junto con la guía de montaje completa.
- Exportación a otros formatos (SVG, CSV, JSON, etc.).
- Edición manual de celdas individuales de la cuadrícula (pintar/borrar perlas con el ratón).
- Detección automática de fondo distinto del blanco/claro (fondos de color, degradados, texturas).
- Soporte de paletas Hama distintas a la Midi (Mini y Maxi tienen paletas propias con diferente número de colores; esta spec usa la paleta Midi de 30 colores para los tres tipos de perla).
- Modo multijugador o colaborativo.
- Autenticación de usuarios o almacenamiento en servidor.
- Estimación de coste económico de materiales.

---

## Criterios de finalización

La spec 001 se considera **implementada** cuando:

- [ ] El usuario puede cargar una imagen propia por explorador de archivos o *drag & drop*.
- [ ] Los tres tipos de perla (Mini, Midi, Maxi) calculan cuadrículas distintas para las mismas dimensiones en cm.
- [ ] Las dimensiones en cm respetan el rango [4, 100] y la cuadrícula respeta el rango de perlas [8, 120] por lado.
- [ ] El bloqueo de proporción ajusta la segunda dimensión automáticamente al modificar la primera.
- [ ] Los píxeles con alfa < 120 generan celdas vacías; el toggle de eliminación de fondo funciona correctamente con imágenes JPG de fondo blanco.
- [ ] La cuantización asigna a cada celda el color Hama más próximo según la fórmula Redmean sobre la paleta activa.
- [ ] El modal de paleta permite activar/desactivar colores individualmente, con los dos presets rápidos, y nunca desciende de 1 color activo.
- [ ] El visor 2D renderiza el patrón nítido (DPR compensado) con reglas, cuadrícula, límites de placa y alternancia perla/píxel.
- [ ] El visor 2D tiene zoom funcional entre 50% y 300% con barras de scroll cuando es necesario.
- [ ] El resalte por clic en la tabla de materiales atenúa los demás colores y se desactiva con un segundo clic o con el botón "Quitar filtro".
- [ ] La tabla de materiales muestra el recuento exacto por color, ordenado de mayor a menor, y el total global de perlas.
- [ ] El número de placas base necesarias se calcula y muestra correctamente para cada tipo de perla.
- [ ] La descarga de PNG genera un archivo con cabecera de metadatos, reglas numéricas, perlas con código interior y fondo blanco.
- [ ] `npx tsc --noEmit` y `npm run lint` no reportan errores ni advertencias.
- [ ] La configuración del usuario persiste al recargar la página.

---

## Dudas abiertas

*(Ninguna. Todas las ambigüedades fueron resueltas antes de la aprobación de la spec.)*
