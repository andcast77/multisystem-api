# Plan de Diseño de Logo - ShopFlow POS

## Objetivo

Crear un sistema de identidad visual completo para ShopFlow POS con un logo corporativo que represente el concepto de flujo/movimiento, incluyendo todas las versiones necesarias para uso en diferentes contextos.

## Contexto del Proyecto

- **Nombre**: ShopFlow POS
- **Tipo**: Sistema de punto de venta (POS)
- **Paleta de colores**: Azules/indigo (blue-50 a indigo-100), con soporte para modo claro/oscuro
- **Estilo**: Corporativo y profesional
- **Concepto visual**: Flujo/movimiento (representando el flujo de ventas)

## Versiones del Logo a Crear

1. **Isotipo** - Solo símbolo/icono (sin texto)
2. **Logo Completo** - Símbolo + texto "ShopFlow POS"
3. **Isologo** - Símbolo y texto integrados en un solo elemento
4. **Versión Horizontal** - Logo completo en formato horizontal
5. **Versión Vertical** - Logo completo en formato vertical/apilado
6. **Favicon** - Versiones 16x16, 32x32, 48x48 para navegadores

## Concepto de Diseño

### Elementos Visuales

- **Símbolo principal**: Representación de flujo/movimiento usando:
  - Formas fluidas que sugieren movimiento
  - Flechas o curvas que indican dirección
  - Posible integración de elementos relacionados con comercio (líneas que sugieren productos, flujo de transacciones)

- **Tipografía**: 
  - Fuente sans-serif moderna y profesional
  - "ShopFlow" en negrita o semibold
  - "POS" en tamaño más pequeño o peso más ligero

- **Colores**:
  - Color principal: Azul/indigo (#3B82F6 a #6366F1) para representar confianza y tecnología
  - Color secundario: Gris oscuro para texto
  - Versiones en modo claro y oscuro

### Estilo Corporativo

- Líneas limpias y definidas
- Proporciones equilibradas
- Escalable desde favicon hasta tamaños grandes
- Funciona bien en fondos claros y oscuros

## Estructura de Archivos

```
public/
└── logo/
    ├── isotipo/
    │   ├── shopflow-isotipo.png (512x512)
    │   ├── shopflow-isotipo@2x.png (1024x1024)
    │   └── shopflow-isotipo-dark.png (versión para dark mode)
    ├── logo-completo/
    │   ├── shopflow-logo-horizontal.png (800x200)
    │   ├── shopflow-logo-horizontal@2x.png (1600x400)
    │   ├── shopflow-logo-vertical.png (300x400)
    │   └── shopflow-logo-vertical@2x.png (600x800)
    ├── isologo/
    │   ├── shopflow-isologo.png (600x150)
    │   └── shopflow-isologo@2x.png (1200x300)
    └── favicon/
        ├── favicon-16x16.png
        ├── favicon-32x32.png
        ├── favicon-48x48.png
        └── favicon.ico (formato ICO para compatibilidad)
```

## Fases del Plan

### Fase 0: Preparación y Configuración

#### 0.1 Crear Rama de Git

- [x] Crear rama de git para este plan: `git checkout -b feature/logo-design`
- [x] Verificar que la rama se creó correctamente
- [x] Asegurar que estamos en la rama correcta antes de comenzar

**Comandos**:
```bash
git checkout -b feature/logo-design
git status  # Verificar que estamos en la nueva rama
```

**Commit**: `git commit -m "chore: crear rama feature/logo-design"`

#### 0.2 Documentar Plan en la Documentación

- [x] Crear archivo del plan en `docs/plans/04-logo-design.md`
- [x] Copiar contenido completo del plan a la documentación
- [ ] Actualizar `docs/plans/README.md` para incluir referencia al nuevo plan
- [ ] Agregar sección de seguimiento de progreso en el plan documentado
- [ ] Verificar que la documentación esté correctamente formateada en Markdown

**Archivos a crear/modificar**:

- `docs/plans/04-logo-design.md` - Plan completo del diseño del logo (nuevo)
- `docs/plans/README.md` - Agregar referencia al nuevo plan en la sección de documentos

**Commit**: `git commit -m "docs: agregar plan de diseño de logo en docs/plans/04-logo-design.md"`

---

### Fase 1: Diseño Conceptual

#### 1.1 Crear Bocetos del Símbolo Principal

- [ ] Explorar formas que representen flujo (ondas, flechas curvas, líneas fluidas)
- [ ] Integrar concepto de comercio/ventas de manera sutil
- [ ] Asegurar que funcione bien en tamaños pequeños
- [ ] Crear al menos 3 variaciones conceptuales del símbolo

**Archivos a crear**:

- `docs/design/logo-sketches.md` - Documentación de bocetos y conceptos (opcional)

**Commit**: `git commit -m "design: crear bocetos conceptuales del símbolo del logo"`

#### 1.2 Definir Tipografía

- [ ] Seleccionar fuente profesional (Inter, Poppins, o similar)
- [ ] Definir tamaños y pesos para "ShopFlow" y "POS"
- [ ] Establecer espaciado entre letras (kerning)
- [ ] Documentar decisiones de tipografía

**Archivos a crear/modificar**:

- `docs/design/logo-typography.md` - Especificaciones de tipografía (opcional)

**Commit**: `git commit -m "design: definir tipografía para el logo"`

#### 1.3 Definir Paleta de Colores Específica

- [ ] Color primario del logo (azul/indigo)
- [ ] Color de texto
- [ ] Versiones para light/dark mode
- [ ] Documentar códigos de color específicos

**Archivos a crear/modificar**:

- `docs/design/logo-colors.md` - Paleta de colores del logo (opcional)

**Commit**: `git commit -m "design: definir paleta de colores del logo"`

---

### Fase 2: Creación Digital

#### 2.1 Crear el Símbolo (Isotipo)

- [ ] Diseñar en formato vectorial (SVG) primero
- [ ] Exportar a PNG en diferentes tamaños (512x512, 1024x1024)
- [ ] Crear versión para dark mode
- [ ] Asegurar transparencia en el fondo
- [ ] Guardar archivos en `public/logo/isotipo/`

**Archivos a crear**:

- `public/logo/isotipo/shopflow-isotipo.png` (512x512)
- `public/logo/isotipo/shopflow-isotipo@2x.png` (1024x1024)
- `public/logo/isotipo/shopflow-isotipo-dark.png` (versión para dark mode)

**Commit**: `git commit -m "feat: crear isotipo del logo en múltiples tamaños"`

#### 2.2 Crear Versiones con Texto

- [ ] Logo completo horizontal (símbolo + texto "ShopFlow POS")
- [ ] Logo completo vertical (símbolo + texto apilado)
- [ ] Isologo (integración símbolo-texto)
- [ ] Crear versiones @2x para cada variante
- [ ] Guardar archivos en `public/logo/logo-completo/` y `public/logo/isologo/`

**Archivos a crear**:

- `public/logo/logo-completo/shopflow-logo-horizontal.png` (800x200)
- `public/logo/logo-completo/shopflow-logo-horizontal@2x.png` (1600x400)
- `public/logo/logo-completo/shopflow-logo-vertical.png` (300x400)
- `public/logo/logo-completo/shopflow-logo-vertical@2x.png` (600x800)
- `public/logo/isologo/shopflow-isologo.png` (600x150)
- `public/logo/isologo/shopflow-isologo@2x.png` (1200x300)

**Commit**: `git commit -m "feat: crear versiones del logo con texto (horizontal, vertical, isologo)"`

#### 2.3 Crear Versiones para Diferentes Contextos

- [ ] Versiones @2x para pantallas de alta densidad (ya incluidas en pasos anteriores)
- [ ] Versiones para dark mode (ya incluidas en paso 2.1)
- [ ] Favicon en múltiples tamaños (16x16, 32x32, 48x48)
- [ ] Crear archivo .ico para compatibilidad
- [ ] Guardar archivos en `public/logo/favicon/`

**Archivos a crear**:

- `public/logo/favicon/favicon-16x16.png`
- `public/logo/favicon/favicon-32x32.png`
- `public/logo/favicon/favicon-48x48.png`
- `public/logo/favicon/favicon.ico`

**Commit**: `git commit -m "feat: crear favicon en múltiples tamaños y formato ICO"`

---

### Fase 3: Optimización y Exportación

#### 3.1 Optimizar Archivos PNG

- [ ] Comprimir sin pérdida de calidad visible
- [ ] Verificar transparencia en todos los archivos
- [ ] Asegurar que funcionen en fondos claros y oscuros
- [ ] Verificar tamaños de archivo razonables

**Commit**: `git commit -m "perf: optimizar archivos PNG del logo manteniendo calidad"`

#### 3.2 Verificar Calidad y Consistencia

- [ ] Probar el logo en diferentes fondos (claro, oscuro, con gradientes)
- [ ] Verificar que el favicon sea reconocible incluso en 16x16px
- [ ] Asegurar consistencia visual entre todas las versiones
- [ ] Documentar cualquier ajuste necesario

**Commit**: `git commit -m "test: verificar calidad y consistencia de todas las versiones del logo"`

---

### Fase 4: Documentación e Integración

#### 4.1 Crear Documentación del Logo

- [ ] Guía de uso del logo
- [ ] Especificaciones de tamaños mínimos
- [ ] Área de protección
- [ ] Colores y tipografía
- [ ] Ejemplos de uso correcto e incorrecto

**Archivos a crear**:

- `docs/design/logo-guidelines.md` - Guía completa de uso del logo

**Commit**: `git commit -m "docs: crear guía de uso del logo"`

#### 4.2 Integrar en la Aplicación

- [ ] Actualizar favicon en `public/favicon.ico`
- [ ] Actualizar componente Sidebar para usar nuevo logo
- [ ] Actualizar página de landing (`src/app/page.tsx`) si es necesario
- [ ] Verificar que el logo se muestre correctamente en todos los contextos

**Archivos a modificar**:

- `public/favicon.ico` - Actualizar con nuevo favicon
- `src/components/layout/Sidebar.tsx` - Actualizar referencia al logo
- `src/app/page.tsx` - Actualizar logo en landing page si es necesario

**Commit**: `git commit -m "feat: integrar nuevo logo en la aplicación"`

---

## Herramientas Sugeridas

- **Diseño**: Figma, Adobe Illustrator, o Inkscape (gratuito)
- **Exportación**: Herramientas nativas de diseño o ImageMagick para optimización
- **Favicon**: Online favicon generator o herramienta de diseño

## Especificaciones Técnicas

### Formatos de Exportación

- **PNG**: Con canal alpha (transparencia)
- **Resolución**: Mínimo 300 DPI para impresión, 72-96 DPI para web
- **Espacio de color**: RGB para web, CMYK si se necesita para impresión

### Tamaños Mínimos Recomendados

- **Isotipo**: Mínimo 24x24px para uso en UI
- **Logo horizontal**: Mínimo 200px de ancho
- **Logo vertical**: Mínimo 150px de ancho
- **Favicon**: 16x16px (mínimo), 32x32px (recomendado)

## Criterios de Éxito

- Logo es reconocible y único
- Funciona bien en tamaños pequeños (favicon)
- Mantiene legibilidad en todas las versiones
- Transparencia funciona correctamente
- Versiones para light/dark mode están disponibles
- Archivos optimizados para web (tamaño de archivo razonable)
- Consistente con la identidad corporativa del proyecto

## Archivos a Crear/Modificar

### Nuevos Archivos

- `public/logo/` - Carpeta completa con todas las versiones del logo
- `docs/plans/04-logo-design.md` - Plan completo del diseño del logo
- `docs/design/logo-guidelines.md` - Guía de uso del logo

### Archivos a Modificar

- `docs/plans/README.md` - Agregar referencia al nuevo plan
- `public/favicon.ico` - Actualizar con nuevo favicon
- `src/components/layout/Sidebar.tsx` - Actualizar referencia al logo
- `src/app/page.tsx` - Actualizar logo en landing page si es necesario

## Seguimiento del Plan

### Estado General

**Rama de Git**: `feature/logo-design`  
**Estado**: 🟡 En Implementación  
**Progreso**: 5% (Fase 0 completada parcialmente)

### Progreso por Fase

| Fase | Descripción | Estado | Progreso |
|------|-------------|--------|----------|
| **Fase 0** | Preparación y Configuración | 🟡 En Progreso | 50% |
| **Fase 1** | Diseño Conceptual | ⏳ Pendiente | 0% |
| **Fase 2** | Creación Digital | ⏳ Pendiente | 0% |
| **Fase 3** | Optimización y Exportación | ⏳ Pendiente | 0% |
| **Fase 4** | Documentación e Integración | ⏳ Pendiente | 0% |

### Última Actualización

**Fecha**: 2025-01-04  
**Notas**: Plan creado y documentado. Fase 0 en progreso.

---

## Notas de Implementación

- El logo debe diseñarse primero en formato vectorial (SVG) para facilitar escalado
- Exportar a PNG manteniendo alta calidad
- Probar el logo en diferentes fondos (claro, oscuro, con gradientes)
- Asegurar que el favicon sea reconocible incluso en 16x16px
- Considerar crear versiones en formato SVG para uso web (mejor calidad y menor tamaño)
- **Cada punto de cada fase debe tener su commit correspondiente**
- **La documentación del plan debe guardarse en `docs/plans/04-logo-design.md`**
