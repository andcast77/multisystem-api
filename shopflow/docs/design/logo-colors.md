# Paleta de Colores del Logo - ShopFlow POS

## Colores Principales

### Modo Claro (Light Mode)

#### Color Primario del Símbolo
- **Azul Principal**: `#3B82F6` (blue-500)
- **Indigo Secundario**: `#6366F1` (indigo-500)
- **Gradiente**: De azul principal a indigo secundario

#### Color del Texto
- **ShopFlow**: `#1F2937` (gray-800)
- **POS**: `#4B5563` (gray-600)

#### Fondo
- Transparente o blanco según contexto

### Modo Oscuro (Dark Mode)

#### Color Primario del Símbolo
- **Azul Claro**: `#60A5FA` (blue-400)
- **Indigo Claro**: `#818CF8` (indigo-400)
- **Gradiente**: De azul claro a indigo claro

#### Color del Texto
- **ShopFlow**: `#F9FAFB` (gray-50)
- **POS**: `#D1D5DB` (gray-300)

#### Fondo
- Transparente o fondo oscuro según contexto

## Especificaciones Técnicas

### RGB

**Modo Claro**:
- Azul Principal: `rgb(59, 130, 246)`
- Indigo Secundario: `rgb(99, 102, 241)`
- Texto ShopFlow: `rgb(31, 41, 55)`
- Texto POS: `rgb(75, 85, 99)`

**Modo Oscuro**:
- Azul Claro: `rgb(96, 165, 250)`
- Indigo Claro: `rgb(129, 140, 248)`
- Texto ShopFlow: `rgb(249, 250, 251)`
- Texto POS: `rgb(209, 213, 219)`

### HSL

**Modo Claro**:
- Azul Principal: `hsl(217, 91%, 60%)`
- Indigo Secundario: `hsl(239, 84%, 67%)`
- Texto ShopFlow: `hsl(222, 47%, 11%)`
- Texto POS: `hsl(215, 16%, 47%)`

**Modo Oscuro**:
- Azul Claro: `hsl(217, 96%, 68%)`
- Indigo Claro: `hsl(239, 83%, 74%)`
- Texto ShopFlow: `hsl(210, 20%, 98%)`
- Texto POS: `hsl(214, 32%, 91%)`

## Uso en Tailwind CSS

```css
/* Modo Claro */
.symbol-color { @apply bg-gradient-to-br from-blue-500 to-indigo-500; }
.text-shopflow { @apply text-gray-800; }
.text-pos { @apply text-gray-600; }

/* Modo Oscuro */
.dark .symbol-color { @apply bg-gradient-to-br from-blue-400 to-indigo-400; }
.dark .text-shopflow { @apply text-gray-50; }
.dark .text-pos { @apply text-gray-300; }
```

## Contraste

Todos los colores cumplen con WCAG AA:
- Texto sobre fondo claro: Contraste mínimo 4.5:1
- Texto sobre fondo oscuro: Contraste mínimo 4.5:1
- Símbolo sobre fondos claros/oscuros: Suficiente contraste para reconocibilidad

## Área de Protección

- Mínimo espacio alrededor del logo: 20% del tamaño del símbolo
- No colocar otros elementos dentro del área de protección
