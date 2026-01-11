# Especificaciones de Diseño - Sidebar ShopFlow POS

**Fecha**: 2025-01-04  
**Versión**: 1.0  
**Estado**: En Diseño

---

## Paleta de Colores

### Colores Base (Tailwind CSS Variables)

Basado en la configuración actual del proyecto (`tailwind.config.ts` y `globals.css`):

#### Light Mode (Actual)
- **Fondo del Sidebar**: `bg-white` (HSL: 0 0% 100%)
- **Borde**: `border-gray-200` (HSL: 214.3 31.8% 91.4%)
- **Texto Principal**: `text-gray-900` (HSL: 222.2 84% 4.9%)
- **Texto Secundario**: `text-gray-600` (HSL: ~215 20% 50%)
- **Hover**: `bg-gray-100` (HSL: 210 40% 96.1%)
- **Activo**: `bg-gray-100` con `text-gray-900`
- **Iconos**: `text-gray-500` (inactivo), `text-gray-900` (activo)

#### Dark Mode (Futuro)
- **Fondo del Sidebar**: `bg-gray-900` (HSL: 222.2 84% 4.9%)
- **Borde**: `border-gray-800` (HSL: 217.2 32.6% 17.5%)
- **Texto Principal**: `text-gray-100` (HSL: 210 40% 98%)
- **Texto Secundario**: `text-gray-400` (HSL: 215 20.2% 65.1%)
- **Hover**: `bg-gray-800` (HSL: 217.2 32.6% 17.5%)
- **Activo**: `bg-gray-800` con `text-gray-100`

---

## Tipografía

### Jerarquía de Texto

- **Logo/Título**: `text-xl font-bold` (20px, weight 700)
- **Títulos de Grupos**: `text-xs font-semibold uppercase tracking-wider` (12px, weight 600)
- **Items de Navegación**: `text-sm font-medium` (14px, weight 500)
- **Información del Usuario**: `text-sm font-medium` (14px, weight 500)
- **Rol del Usuario**: `text-xs font-medium` (12px, weight 500)

### Fuentes

- Usar la fuente del sistema (Geist Sans) definida en el proyecto
- Mantener consistencia con el resto de la aplicación

---

## Espaciado

### Estructura General

- **Ancho del Sidebar**: `w-64` (256px) - Desktop expandido
- **Ancho Colapsado**: `w-16` (64px) - Solo iconos
- **Padding General**: `p-4` (16px)
- **Padding Header**: `px-6 py-4` (24px horizontal, 16px vertical)
- **Padding Footer**: `p-4` (16px)

### Espaciado entre Elementos

- **Items de Navegación**: `space-y-1` (4px entre items)
- **Grupos de Navegación**: `space-y-4` (16px entre grupos)
- **Separadores**: `my-4` (16px arriba y abajo)
- **Gap en Items**: `gap-3` (12px entre icono y texto)

---

## Estructura Visual

### Header (Altura: 64px)

```
┌─────────────────────────────┐
│  [Icono] ShopFlow POS      │  ← Logo + Título
│  Usuario: Juan Pérez       │  ← Nombre del usuario
│  Rol: Admin                │  ← Badge de rol
└─────────────────────────────┘
```

**Especificaciones**:
- Altura fija: `h-16` (64px)
- Borde inferior: `border-b border-gray-200`
- Padding: `px-6 py-4`
- Logo/Icono: 32x32px
- Información del usuario: Opcional en header o footer

### Navegación (Scrollable)

```
┌─────────────────────────────┐
│                             │
│  PRINCIPAL                  │  ← Título de grupo
│  📊 Dashboard              │
│  🛒 Punto de Venta         │
│                             │
│  ────────────────────────  │  ← Separador
│                             │
│  GESTIÓN                    │  ← Título de grupo
│  📦 Productos              │
│  👥 Clientes               │
│  📊 Reportes               │
│                             │
│  ────────────────────────  │  ← Separador
│                             │
│  ADMINISTRACIÓN             │  ← Título de grupo
│  🎁 Lealtad                │
│  ⚙️ Configuración         │
│                             │
└─────────────────────────────┘
```

**Especificaciones**:
- ScrollArea con `flex-1` para ocupar espacio disponible
- Padding: `p-4`
- Espaciado entre grupos: `space-y-4`
- Separadores: `border-t border-gray-200` con `my-4`

### Footer (Altura Variable)

```
┌─────────────────────────────┐
│  ────────────────────────  │  ← Separador
│                             │
│  [Avatar] Juan Pérez       │  ← Avatar + Nombre
│  Admin                     │  ← Badge de rol
│                             │
│  🚪 Cerrar Sesión         │  ← Botón de logout
└─────────────────────────────┘
```

**Especificaciones**:
- Borde superior: `border-t border-gray-200`
- Padding: `p-4`
- Avatar: 40x40px circular
- Información del usuario centrada o alineada a la izquierda

---

## Estados de Items de Navegación

### Estado Normal (Inactivo)

```css
- Fondo: transparente
- Texto: text-gray-600
- Icono: text-gray-500
- Hover: bg-gray-100
```

### Estado Activo

```css
- Fondo: bg-gray-100
- Texto: text-gray-900 font-semibold
- Icono: text-gray-900
- Borde izquierdo: border-l-2 border-primary (opcional)
```

### Estado Hover

```css
- Fondo: bg-gray-100
- Texto: text-gray-900
- Icono: text-gray-700
- Transición: transition-colors duration-200
```

### Estado Disabled

```css
- Fondo: transparente
- Texto: text-gray-400
- Icono: text-gray-400
- Cursor: cursor-not-allowed
- Opacidad: opacity-50
```

---

## Versión Móvil

### Comportamiento

- **Ancho**: `w-64` (256px) - Mismo que desktop
- **Posición**: Fixed, fuera de la pantalla por defecto
- **Overlay**: `bg-black/50` con `backdrop-blur-sm`
- **Animación**: `transition-transform duration-300`
- **Z-index**: `z-40` (sidebar), `z-50` (botón hamburger)

### Botón Hamburger

- **Posición**: Fixed `top-4 left-4`
- **Tamaño**: `w-10 h-10` (40x40px)
- **Estilo**: `variant="outline"`
- **Z-index**: `z-50`

### Animaciones

- **Abrir**: `translate-x-0` (desde `-translate-x-full`)
- **Cerrar**: `-translate-x-full` (hacia la izquierda)
- **Duración**: `duration-300` (300ms)
- **Easing**: `ease-in-out`

---

## Modo Colapsado (Desktop - Futuro)

### Características

- **Ancho**: `w-16` (64px)
- **Solo Iconos**: Texto oculto
- **Tooltips**: Aparecen al hover sobre iconos
- **Persistencia**: Guardar preferencia en localStorage

### Transición

- **Duración**: `duration-300`
- **Easing**: `ease-in-out`
- **Botón Toggle**: En la parte superior del sidebar

---

## Componentes Específicos

### Avatar del Usuario

- **Tamaño**: `w-10 h-10` (40x40px)
- **Forma**: Circular (`rounded-full`)
- **Fondo**: `bg-primary` o `bg-gray-200`
- **Texto**: Iniciales del nombre en `text-primary-foreground` o `text-gray-700`
- **Borde**: `border-2 border-white` (opcional)

### Badge de Rol

- **Estilo**: `badge` o `chip` pequeño
- **Colores**:
  - Admin: `bg-blue-100 text-blue-800`
  - Supervisor: `bg-green-100 text-green-800`
  - Cashier: `bg-gray-100 text-gray-800`
- **Tamaño**: `text-xs px-2 py-1`

### Separadores

- **Estilo**: `border-t border-gray-200`
- **Margen**: `my-4`
- **Altura**: `h-px` (1px)

### Títulos de Grupos

- **Estilo**: `text-xs font-semibold uppercase tracking-wider text-gray-500`
- **Padding**: `px-3 py-2`
- **Espaciado**: `mb-2` antes del grupo

---

## Accesibilidad

### ARIA Labels

- **Sidebar**: `aria-label="Navegación principal"`
- **Nav Items**: `aria-current={isActive ? 'page' : undefined}`
- **Botón Hamburger**: `aria-label="Abrir menú"` / `aria-label="Cerrar menú"`
- **Botón Logout**: `aria-label="Cerrar sesión"`

### Navegación con Teclado

- **Tab**: Navegar entre items
- **Enter/Space**: Activar item seleccionado
- **Esc**: Cerrar sidebar móvil
- **Focus Visible**: `focus:outline-none focus:ring-2 focus:ring-primary`

### Contraste

- **Texto sobre fondo claro**: Ratio mínimo 4.5:1
- **Texto sobre fondo gris**: Ratio mínimo 4.5:1
- **Iconos**: Mismo contraste que texto

---

## Animaciones y Transiciones

### Transiciones de Estado

- **Hover**: `transition-colors duration-200`
- **Active**: `transition-all duration-200`
- **Sidebar Mobile**: `transition-transform duration-300 ease-in-out`
- **Modo Colapsado**: `transition-all duration-300 ease-in-out`

### Efectos Opcionales

- **Ripple effect**: Al hacer click (opcional)
- **Slide in**: Items al aparecer (opcional)
- **Fade in**: Overlay móvil (opcional)

---

## Responsive Breakpoints

### Mobile (< 1024px)

- Sidebar oculto por defecto
- Botón hamburger visible
- Overlay al abrir
- Ancho completo al abrir

### Desktop (≥ 1024px)

- Sidebar siempre visible
- Botón hamburger oculto
- Sin overlay
- Modo colapsado disponible (futuro)

---

## Notas de Implementación

1. **Usar variables CSS de Tailwind**: Aprovechar `--background`, `--foreground`, etc.
2. **Componentes shadcn/ui**: Usar `Button`, `ScrollArea`, `Badge` existentes
3. **Iconos lucide-react**: Mantener consistencia con iconos actuales
4. **TypeScript**: Tipar todos los componentes y props
5. **Responsive**: Mobile-first approach
6. **Performance**: Lazy loading de componentes pesados si es necesario

---

## Referencias

- **Tailwind Config**: `tailwind.config.ts`
- **Global Styles**: `src/app/globals.css`
- **Componente Actual**: `src/components/layout/Sidebar.tsx`
- **shadcn/ui**: https://ui.shadcn.com
- **Lucide Icons**: https://lucide.dev

---

**Última Actualización**: 2025-01-04
