# Guía de Uso del Logo - ShopFlow POS

## Introducción

Esta guía establece las reglas y mejores prácticas para el uso correcto del logo de ShopFlow POS en todos los contextos y aplicaciones.

## Versiones del Logo

### Isotipo (Símbolo Solo)

**Uso**: Cuando el espacio es limitado o el logo se usa como icono.

**Archivos disponibles**:
- `public/logo/isotipo/shopflow-isotipo.png` (512x512)
- `public/logo/isotipo/shopflow-isotipo@2x.png` (1024x1024)
- `public/logo/isotipo/shopflow-isotipo-dark.png` (512x512, para dark mode)

**Tamaño mínimo**: 24x24px

### Logo Completo Horizontal

**Uso**: Uso general en headers, documentos, presentaciones.

**Archivos disponibles**:
- `public/logo/logo-completo/shopflow-logo-horizontal.png` (800x200)
- `public/logo/logo-completo/shopflow-logo-horizontal@2x.png` (1600x400)

**Tamaño mínimo**: 200px de ancho

### Logo Completo Vertical

**Uso**: Cuando el espacio vertical es limitado o se requiere formato apilado.

**Archivos disponibles**:
- `public/logo/logo-completo/shopflow-logo-vertical.png` (300x400)
- `public/logo/logo-completo/shopflow-logo-vertical@2x.png` (600x800)

**Tamaño mínimo**: 150px de ancho

### Isologo

**Uso**: Versión integrada donde el símbolo y texto forman una unidad visual.

**Archivos disponibles**:
- `public/logo/isologo/shopflow-isologo.png` (600x150)
- `public/logo/isologo/shopflow-isologo@2x.png` (1200x300)

**Tamaño mínimo**: 300px de ancho

### Favicon

**Uso**: Icono del navegador y aplicaciones.

**Archivos disponibles**:
- `public/logo/favicon/favicon-16x16.png`
- `public/logo/favicon/favicon-32x32.png`
- `public/logo/favicon/favicon-48x48.png`
- `public/logo/favicon/favicon.ico`

## Área de Protección

El logo debe tener un espacio libre alrededor equivalente al **20% del tamaño del símbolo** o al menos **16px**, lo que sea mayor.

**Ejemplo**: Si el símbolo mide 100px, el área de protección mínima es 20px en todos los lados.

## Tamaños Mínimos

- **Isotipo**: 24x24px
- **Logo horizontal**: 200px de ancho
- **Logo vertical**: 150px de ancho
- **Isologo**: 300px de ancho
- **Favicon**: 16x16px

## Colores

### Modo Claro (Light Mode)

- **Símbolo**: Gradiente azul (#3B82F6) a indigo (#6366F1)
- **Texto "ShopFlow"**: Gris oscuro (#1F2937)
- **Texto "POS"**: Gris medio (#4B5563)

### Modo Oscuro (Dark Mode)

- **Símbolo**: Gradiente azul claro (#60A5FA) a indigo claro (#818CF8)
- **Texto "ShopFlow"**: Gris muy claro (#F9FAFB)
- **Texto "POS"**: Gris claro (#D1D5DB)

## Uso Correcto

### ✅ Hacer

- Usar el logo con suficiente espacio alrededor
- Mantener las proporciones originales
- Usar la versión apropiada para el contexto
- Asegurar buen contraste con el fondo
- Usar la versión dark en fondos oscuros

### ❌ No Hacer

- No distorsionar o estirar el logo
- No cambiar los colores del logo
- No rotar el logo
- No añadir efectos (sombras, bordes, etc.) sin autorización
- No usar el logo más pequeño que el tamaño mínimo
- No colocar el logo sobre fondos con bajo contraste
- No modificar el espaciado entre símbolo y texto

## Ejemplos de Uso en Código

### React/Next.js

```tsx
import Image from 'next/image'

// Logo horizontal
<Image
  src="/logo/logo-completo/shopflow-logo-horizontal.png"
  alt="ShopFlow POS"
  width={200}
  height={50}
  priority
/>

// Isotipo
<Image
  src="/logo/isotipo/shopflow-isotipo.png"
  alt="ShopFlow"
  width={32}
  height={32}
/>
```

### HTML

```html
<!-- Logo horizontal -->
<img 
  src="/logo/logo-completo/shopflow-logo-horizontal.png" 
  alt="ShopFlow POS"
  width="200"
  height="50"
/>

<!-- Favicon -->
<link rel="icon" type="image/png" sizes="32x32" href="/logo/favicon/favicon-32x32.png">
<link rel="icon" type="image/x-icon" href="/logo/favicon/favicon.ico">
```

## Versiones para Pantallas de Alta Densidad

Para pantallas Retina o de alta densidad, usar las versiones `@2x`:

```tsx
<Image
  src="/logo/logo-completo/shopflow-logo-horizontal@2x.png"
  alt="ShopFlow POS"
  width={200}
  height={50}
  srcSet="/logo/logo-completo/shopflow-logo-horizontal.png 1x, /logo/logo-completo/shopflow-logo-horizontal@2x.png 2x"
/>
```

## Formatos Disponibles

- **PNG**: Para uso web con transparencia
- **SVG**: Versiones vectoriales disponibles (mejor calidad, menor tamaño)
- **ICO**: Para favicon (compatibilidad con navegadores antiguos)

## Contacto

Para preguntas sobre el uso del logo o solicitudes de versiones adicionales, contactar al equipo de diseño.

---

**Última actualización**: 2025-01-04
