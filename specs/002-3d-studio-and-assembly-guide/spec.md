# Spec 002 — Estudio 3D y Guía de Montaje Multicapa
Estado: implementada

---

## Contexto y objetivo

Hama Beads Studio dispone actualmente de un motor de conversión y un visor plano 2D para la composición de figuras sobre placas base estándar. Sin embargo, las figuras tridimensionales reales con perlas termofusibles requieren técnicas específicas de ingeniería física: apilado multicapa (fusión por capas horizontales) y ensamblado ortogonal machihembrado (encaje a 90° mediante ranuras y pestañas mecánicas).

Esta especificación define el **Estudio 3D interactivo** y el **Generador de Guías de Montaje paso a paso**, permitiendo a los usuarios transformar cualquier diseño plano en un modelo tridimensional físicamente construible, inspeccionarlo visualmente con libertad espacial y exportar un manual de instrucciones completo.

**Objetivo principal:** permitir que cualquier usuario transforme un diseño en una figura 3D física viable (hueca por apilado, ensamblada por encastre o en bajorrelieve), reduciendo el desperdicio de material y proporcionando una guía secuencial paso a paso sin ambigüedades.

---

## Usuarios

- **Constructor y maker de figuras 3D:** crea modelos volumétricos (cajas, cámaras, portalápices, dioramas) y necesita saber cómo encajan las piezas sin deformarse ni colapsar.
- **Coleccionista y aficionado:** busca construir figuras estables con el menor gasto posible de perlas mediante técnicas de vaciado interno.
- **Educador / Tallerista infantil:** requiere manuales impresos o digitales paso a paso muy claros para enseñar a niños o adultos el ensamblaje capa por capa.

---

## Historias de usuario

- **HU-1.** Como usuario, quiero alternar entre la vista 2D y el Estudio 3D para previsualizar mi modelo en volumen espacial interactivo.
- **HU-2.** Como usuario, quiero generar un modelo de **Apilado Multicapa Hueco**, seleccionando el número total de capas de profundidad y el grosor de pared perimetral, para ahorrar material sin perder resistencia estructural.
- **HU-3.** Como usuario, quiero inspeccionar las capas del modelo con una **Vista Explosionada** ajustable para comprender el orden de apilamiento y la estructura interna.
- **HU-4.** Como usuario, quiero generar un modelo de **Ensamblado Interlocking** eligiendo entre estructura de caja cerrada (6 placas) o figura con costillas ortogonales en cruz, con ranuras de encaje mecánicas a 90 grados.
- **HU-5.** Como usuario, quiero mantener la opción de **Relieve por Luminancia** con niveles configurables (2 a 6 capas de elevación acumulativa) para esculturas en bajorrelieve.
- **HU-6.** Como usuario, quiero aislar una capa o placa individual en el visor 3D para enfocarme exclusivamente en la pieza que estoy montando.
- **HU-7.** Como usuario, quiero rotar, hacer zoom y desplazar la cámara 3D libremente para inspeccionar la figura desde cualquier ángulo.
- **HU-8.** Como usuario, quiero exportar un **Manual de Montaje en PDF** de alta fidelidad, con portada, vista 3D final, lista global de materiales (BOM) y desglose secuencial de cada placa o capa con cuadrícula numerada y códigos de color oficiales.

---

## Definiciones

| Término | Significado en este dominio |
|---|---|
| **Apilado Multicapa Hueco (Hollow Slicing)** | Técnica constructiva en la que una figura se divide en capas horizontales superpuestas en el eje Z; la capa base y la superior son sólidas, y las intermedias tienen su núcleo vacío conservando un borde perimetral. |
| **Grosor perimetral (Wall Thickness)** | Número de perlas continuas desde el contorno exterior hacia el centro que forman la pared exterior en capas huecas (1 o 2 perlas). |
| **Ensamblado Interlocking (Ranurado / Machihembrado)** | Técnica de montaje donde varias placas planas se intersectan perpendicularmente a 90° mediante dientes (tabs) y ranuras (slots) de 1 perla de paso sin necesidad de adhesivo. |
| **Costilla ortogonal (Cross Rib)** | Placa transversal que atraviesa la placa principal de una figura para aportarle profundidad y sustentación física estable. |
| **Vista Explosionada (Exploded View)** | Separación artificial animada o ajustable a lo largo de los ejes espaciales para visualizar cómo ensamblan las piezas desglosadas. |
| **Relieve por Luminancia (Bas-Relief)** | Elevación de perlas en el eje Z según su brillo relativo en niveles discretos acumulativos. |
| **Manual de Montaje (Assembly Guide)** | Documento imprimible con diagramas secuenciales numerados, recuentos parciales y totales de perlas con códigos oficiales Hama. |

---

## Requisitos funcionales

### RF-1 — Navegación y selector de modo 3D

**RF-1.1.** El sistema deberá permitir alternar entre la vista del "Estudio 2D" y el "Estudio 3D" en cualquier momento sin perder los datos del diseño ni la imagen cargada.

**RF-1.2.** En el Estudio 3D, el sistema deberá ofrecer exactamente tres modos de generación tridimensional:
1. *Apilado Multicapa Hueco (Slicing Inteligente)*
2. *Ensamblado Interlocking (Ranurado y Cajas)*
3. *Relieve por Capas (Luminancia)*

**RF-1.3.** Cuando el usuario cambie de modo 3D, el sistema deberá regenerar inmediatamente la estructura tridimensional y actualizar el visor.

---

### RF-2 — Modo 1: Apilado Multicapa Hueco (Slicing Inteligente)

**RF-2.1.** El sistema deberá permitir al usuario configurar el número total de capas de profundidad entre 3 y 30 capas (por defecto: 6 capas).

**RF-2.2.** El sistema deberá generar la capa base (inferior, Z=1) y la capa superior (Z=N) como placas completamente sólidas basadas en la cuadrícula de perlas del diseño 2D.

**RF-2.3.** Para todas las capas intermedias (Z=2 hasta Z=N-1), el sistema deberá ejecutar un algoritmo morfológico de ahuecado interior (Hollow Core) que conserve únicamente una pared exterior cerrada y vacíe las celdas interiores.

**RF-2.4.** El sistema deberá permitir seleccionar un grosor perimetral de pared de **1 perla** o **2 perlas**.

**RF-2.5.** Si una celda interior vaciada está conectada directamente con el exterior o transparencia, el sistema deberá mantener intacta la continuidad perimetral para evitar roturas estructurales.

**RF-2.6.** El sistema deberá proveer un control deslizante de "Vista Explosionada" (Exploded View) con rango de separación entre 0 mm (apilado compacto para unión) y 50 mm (capas separadas para inspección).

---

### RF-3 — Modo 2: Ensamblado Interlocking (Ranurado / Cajas y Figuras)

**RF-3.1.** El sistema deberá permitir al usuario elegir entre dos subtipos de estructura interlocking:
- *Caja 3D (Prisma cerrado de 6 placas)*
- *Figura con costillas ortogonales (Placa principal + costillas transversales)*

**RF-3.2.** Cuando se seleccione *Caja 3D*, el sistema deberá descomponer el modelo en 6 placas independientes: Frontal (con el diseño del usuario), Trasera, Lateral Izquierda, Lateral Derecha, Tapa Superior y Base Inferior.

**RF-3.3.** Para cada arista adyacente a 90°, el sistema deberá generar un patrón alternado machihembrado con paso de exactamente 1 perla (1 perla diente / 1 perla hueco), garantizando que las pestañas de una placa encajen de forma exacta y no colisionen con las ranuras de la placa perpendicular.

**RF-3.4.** Cuando se seleccione *Figura con costillas ortogonales*, el sistema deberá situar el diseño 2D como placa vertical central e insertar al menos dos costillas transversales perpendiculares con ranuras de inserción de 1 perla de grosor que alcancen la mitad de la altura de la junta.

**RF-3.5.** El sistema deberá proveer un control deslizante de ensamblado/despiece que desplace las placas perpendiculares hacia afuera de su posición de encaje final para apreciar la orientación de montaje.

---

### RF-4 — Modo 3: Relieve por Capas (Luminancia)

**RF-4.1.** El sistema deberá permitir al usuario configurar el número de niveles de relieve entre 2 y 6 niveles de altura acumulativa (por defecto: 3 niveles).

**RF-4.2.** El sistema deberá clasificar la luminancia perceptual de cada celda ($0.0$ a $1.0$) en rangos equitativos correspondientes al número de niveles configurado.

**RF-4.3.** Para que la escultura sea físicamente construible y no existan perlas flotando en el aire, el sistema deberá rellenar sólidamente todas las capas inferiores a la altura asignada a cada celda.

---

### RF-5 — Visor 3D Interactivo

**RF-5.1.** El sistema deberá renderizar en tiempo real cada perla como un cilindro tridimensional realista con orificio central simulado o prisma voxel según la preferencia de forma del usuario.

**RF-5.2.** El sistema deberá aplicar los colores exactos de la paleta oficial Hama asignados a cada perla con iluminación volumétrica adecuada (luz ambiental y direccional).

**RF-5.3.** El sistema deberá permitir rotación en 360°, paneo y zoom mediante controles de cámara orbital interactivos con ratón o gestos táctiles.

**RF-5.4.** El sistema deberá proveer un selector de capa/placa activa que permita:
- Ver el modelo completo ensamblado.
- O aislar una única capa horizontal o placa ortogonal individual, ocultando o atenuando el resto.

**RF-5.5.** Al cambiar de modo o dimensiones, el sistema deberá reencuadrar automáticamente la cámara 3D para centrar la figura en el visor.

---

### RF-6 — Generador de Manual de Montaje en PDF

**RF-6.1.** El sistema deberá permitir exportar el manual completo de la figura 3D activa en formato de documento PDF descargable.

**RF-6.2.** La primera página (Portada) del manual deberá incluir:
- Título del proyecto y modo 3D seleccionado.
- Imagen renderizada en perspectiva isométrica o frontal del modelo final ensamblado.
- Metadatos clave: tipo de perla, dimensiones totales en centímetros (ancho × alto × profundidad) y número de placas base necesarias.
- Tabla global de materiales (BOM) con código oficial Hama, muestra de color, nombre y cantidad total requerida de cada color.

**RF-6.3.** Las páginas subsiguientes deberán detallar la secuencia de montaje paso a paso en orden cronológico:
- Para *Apilado Multicapa*: desde la Capa 1 (base) hasta la Capa N (superior).
- Para *Ensamblado Interlocking*: placa por placa con indicación de su posición (Frontal, Lateral, Tapa, etc.) y diagrama de encaje.

**RF-6.4.** Cada paso individual deberá incluir:
- Número de paso y nombre identificador de la pieza/capa.
- Diagrama gráfico de cuadrícula de alta resolución con reglas métricas de coordenadas (números de fila y columna).
- Código oficial Hama impreso en el centro de cada perla con contraste automático (texto blanco en perlas oscuras, texto negro en perlas claras).
- Mini-tabla de recuento de perlas requeridas exclusivamente para ese paso.
- Consejo de ensamblaje (ej. *"Aplicar calor uniforme"*, *"Ensamblar a 90° con la ranura B"*).

**RF-6.5.** El sistema deberá generar el documento íntegramente en el navegador del cliente sin enviar datos a servidores externos, completando la descarga en menos de 4 segundos.

---

## Requisitos no funcionales

- **RNF-1. Rendimiento 3D:** El renderizado tridimensional interactivo deberá mantener una tasa de refresco estable de al menos 45 FPS en equipos convencionales para modelos de hasta 10.000 perlas volumétricas.
- **RNF-2. Eficiencia de memoria:** Al cambiar de modo, desmontar el visor o cerrar la pestaña 3D, el sistema deberá liberar de forma explícita todas las geometrías, materiales y texturas generadas para evitar fugas de memoria en la GPU.
- **RNF-3. Fidelidad de impresión:** El documento PDF generado deberá utilizar resolución vectorial y canvas de alta densidad para que los números y colores de las perlas sean perfectamente legibles en impresión en papel A4 estándar.
- **RNF-4. Autonomía cliente:** La generación de capas, juntas machihembradas y el ensamblado del manual PDF se ejecutan localmente en el cliente sin latencia de red.

---

## Casos límite

- **Figura 2D con partes desconectadas:** Si el diseño 2D contiene islas aisladas de perlas, en el modo de apilado hueco el ahuecado debe preservar las paredes de cada isla por separado sin provocar celdas flotantes.
- **Placas de ancho impar en juntas machihembradas:** Si la longitud de una arista es impar, el sistema deberá centrar la alternancia de dientes para que ambas esquinas exteriores queden cerradas.
- **Modelos de gran tamaño (> 40 capas):** En la generación de PDF, el sistema deberá gestionar la adición de páginas de forma progresiva sin bloquear la interfaz de usuario.
- **Vaciado en figuras muy estrechas (< 3 perlas de ancho):** Si el grosor total de una sección es menor a $2 \times \text{grosor de pared} + 1$, esa sección debe permanecer sólida para evitar un agujero nulo o debilitamiento estructural.

---

## Fuera de alcance

- Simulación física de resistencia mecánica o cálculo de temperatura de planchado.
- Edición manual libre vóxel a vóxel en 3D (la fuente de verdad de la figura proviene del diseño 2D de la placa base).
- Exportación a formatos de impresión 3D filamentaria como STL u OBJ (el propósito es el montaje físico con perlas Hama reales).

---

## Criterios de finalización

1. Selector de modo 3D operativo en la interfaz con los 3 sistemas: Apilado Hueco, Interlocking y Relieve por Luminancia.
2. Algoritmo de ahuecado (Hollow Core) con selector de grosor (1 o 2 perlas) que reduce el inventario de perlas intermedias de forma medible.
3. Algoritmo de juntas machihembradas (Tabs & Slots) que genera placas ortogonales complementarias sin colisiones en esquinas.
4. Visor 3D con control orbital, vista explosionada dinámica y selector de capa activa.
5. Exportación de manual PDF multi-página con portada isométrica, tabla BOM global y desglose paso a paso numerado y legible.
6. 100% de la suite de pruebas unitarias en verde y cero errores de TypeScript (`npx tsc --noEmit`) y ESLint (`npm run lint`).
