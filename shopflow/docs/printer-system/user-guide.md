# 👤 Guía de Usuario - Configuración de Impresoras

## 🎯 ¿Qué es este sistema?

El sistema de configuración de impresoras te permite personalizar cómo se ven y se imprimen los comprobantes de venta en tu punto de venta. Puedes crear tickets térmicos para impresoras pequeñas o comprobantes en hojas estándar para impresoras regulares.

## 🚀 Inicio Rápido

### Paso 1: Acceder a la Configuración

1. Abre tu sistema POS
2. Ve al menú **Administración**
3. Selecciona **Configuración**
4. Haz clic en **Configuración de Impresoras**

### Paso 2: Elegir Tipo de Comprobante

**Opción A: Tickets Térmicos**
- Perfectos para impresoras pequeñas
- Ahorra papel
- Ideales para mostradores

**Opción B: Hojas Estándar**
- Para impresoras regulares
- Mejor para comprobantes detallados
- Compatible con cualquier impresora

### Paso 3: Personalizar tu Comprobante

#### Encabezado
- Nombre de tu negocio
- Dirección
- Información de contacto

#### Logo
- Sube tu logo (máximo 5MB)
- Formatos: JPG, PNG, GIF
- Se mostrará en la parte superior

#### Pie de Página
- Información legal
- Mensajes de agradecimiento
- Redes sociales

#### Apariencia
- **Tamaño de fuente**: Desde 8px hasta 24px
- **Ancho térmico**: Para tickets (solo si aplica)

## 📋 Configuración Detallada

### Campos Disponibles

| Campo | Descripción | Obligatorio | Longitud Máxima |
|-------|-------------|-------------|-----------------|
| Tipo de Comprobante | Ticket térmico o Hoja estándar | ✅ | - |
| Encabezado | Nombre y datos del negocio | ✅ | 500 caracteres |
| Descripción | Información adicional | ❌ | 1000 caracteres |
| Logo | Imagen del negocio | ❌ | 5MB |
| Pie de Página | Información final | ❌ | 500 caracteres |
| Tamaño de Fuente | Texto pequeño/grande | ❌ | 8-24px |
| Ancho Térmico | Para tickets | ❌ | 48-80mm |
| Copias | Cantidad por impresión | ❌ | 1-5 |
| Impresión Automática | Activar/desactivar | ❌ | Sí/No |

### Vista Previa

La **Vista Previa** te muestra exactamente cómo se verá tu comprobante impreso:

- 🔄 **Actualización automática**: Los cambios se ven al instante
- 📱 **Responsive**: Se adapta al tipo seleccionado
- 📊 **Datos reales**: Muestra información de ejemplo

## 🖨️ Cómo Imprimir y Probar

### Probar tu Configuración

1. Haz clic en **"Probar Impresión"**
2. Se abrirá una nueva ventana
3. Elige tu impresora
4. Haz clic en **"Imprimir"**

### Solución de Problemas de Impresión

#### La ventana no se abre
- **Posible causa**: Bloqueador de popups
- **Solución**: Permite popups para tu sitio web

#### El diseño se ve mal
- **Posible causa**: Configuración de página
- **Solución**: Asegúrate de imprimir en tamaño "A4" o "Carta"

#### El logo no aparece
- **Posible causa**: Problemas de carga
- **Solución**: Sube el logo nuevamente

## 💾 Guardar y Gestionar Configuraciones

### Guardar Cambios

- Los cambios se guardan automáticamente al hacer clic en **"Guardar Configuración"**
- Si hay cambios sin guardar, verás un indicador ⚠️
- El botón se vuelve verde cuando todo está guardado

### Restaurar Valores

- Si cometes un error, usa **"Restaurar Valores"**
- Esto vuelve a la configuración anterior
- Solo disponible cuando hay cambios sin guardar

## 📱 Navegadores Compatibles

El sistema funciona en todos los navegadores modernos:

- ✅ **Google Chrome** (recomendado)
- ✅ **Microsoft Edge**
- ✅ **Mozilla Firefox**
- ✅ **Safari**

**Nota**: Para mejores resultados, usa Chrome o Edge.

## 🎨 Personalización Avanzada

### Colores y Estilos

Actualmente, el sistema usa estilos predefinidos optimizados para impresión. En futuras versiones podrás personalizar:

- Colores de texto
- Fondos
- Bordes
- Espaciado

### Plantillas Predefinidas

Próximamente podrás elegir entre plantillas pre-hechas:

- 🍕 **Restaurante**
- 🛒 **Tienda minorista**
- ⚕️ **Farmacia**
- 🏪 **Supermercado**

## 📞 Soporte Técnico

### Contacto
- **Email**: soporte@tuempresa.com
- **Teléfono**: (123) 456-7890
- **Chat**: Disponible en el sistema

### Información Útil para Soporte

Cuando reportes un problema, incluye:

1. **Navegador y versión**
2. **Sistema operativo**
3. **Tipo de impresora**
4. **Captura de pantalla del error**
5. **Pasos para reproducir el problema**

## 🔄 Actualizaciones y Novedades

### Versión Actual: 1.0.0

**Características principales:**
- ✅ Configuración completa de comprobantes
- ✅ Vista previa en tiempo real
- ✅ Impresión web universal
- ✅ Gestión de logos
- ✅ Validaciones automáticas

### Próximas Funcionalidades

- 🔄 Conexión directa con impresoras USB
- 🔄 Códigos QR en comprobantes
- 🔄 Plantillas personalizables
- 🔄 Historial de impresiones

## 📋 Checklist de Verificación

Antes de usar en producción, verifica:

- [ ] Tipo de comprobante seleccionado
- [ ] Encabezado configurado
- [ ] Logo subido (opcional)
- [ ] Pie de página configurado
- [ ] Vista previa se ve correcta
- [ ] Prueba de impresión funciona
- [ ] Configuración guardada

## 🎯 Consejos y Mejores Prácticas

### Diseño
- Mantén el encabezado conciso
- Usa un logo de alta calidad pero pequeño
- El pie de página es ideal para información legal

### Impresión
- Prueba siempre antes de usar con clientes
- Verifica que la impresora tenga suficiente papel
- Limpia regularmente la impresora térmica

### Rendimiento
- Las imágenes grandes pueden ralentizar la carga
- Opta por logos optimizados (< 100KB)
- Cierra otras pestañas durante configuración

---

**¿Necesitas ayuda?** Consulta la [Guía de Troubleshooting](./troubleshooting.md) o contacta al soporte técnico.