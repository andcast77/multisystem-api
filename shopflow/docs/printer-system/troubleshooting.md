# 🔧 Guía de Troubleshooting - Sistema de Impresoras

## 🚨 Problemas Comunes y Soluciones

### 1. "No se puede abrir la ventana de impresión"

#### Síntomas
- Al hacer clic en "Probar Impresión" no pasa nada
- Mensaje de error sobre popups bloqueados

#### Soluciones

**Para Chrome/Edge:**
1. Haz clic en el ícono de candado 🔒 en la barra de direcciones
2. Selecciona "Configuración del sitio"
3. Activa "Popups y redirecciones"
4. Recarga la página

**Para Firefox:**
1. Haz clic en el ícono de escudo 🛡️ en la barra de direcciones
2. Selecciona "Desactivar bloqueador de popups para este sitio"
3. Recarga la página

**Para Safari:**
1. Ve a Safari → Preferencias
2. Selecciona "Seguridad"
3. Desactiva "Bloquear popups"
4. Recarga la página

### 2. "El logo no se sube"

#### Síntomas
- Error al seleccionar archivo
- Mensaje "Archivo no válido"
- Logo no aparece en preview

#### Soluciones

**Problema de formato:**
- ✅ Formatos soportados: JPG, PNG, GIF
- ❌ No soportados: BMP, TIFF, SVG
- **Solución**: Convierte la imagen a JPG o PNG

**Problema de tamaño:**
- ❌ Archivo muy grande (> 5MB)
- **Solución**: Reduce el tamaño de la imagen
  - Usa herramientas online como TinyPNG
  - Reduce resolución a 300x300px máximo

**Problema de conectividad:**
- Error de red al subir
- **Solución**: Verifica conexión a internet

### 3. "La configuración no se guarda"

#### Síntomas
- Cambios desaparecen al recargar
- Botón "Guardar" no responde
- Mensajes de error de validación

#### Soluciones

**Errores de validación:**
- Campos obligatorios vacíos
- Texto demasiado largo
- **Solución**: Completa todos los campos marcados como requeridos

**Problemas de conectividad:**
- Mensaje "Error de red"
- **Solución**: Verifica conexión a internet y reintenta

**Problemas de sesión:**
- Sesión expirada
- **Solución**: Recarga la página y vuelve a iniciar sesión

### 4. "El preview no se actualiza"

#### Síntomas
- Cambios no se reflejan en tiempo real
- Preview se ve vacío
- Errores en consola del navegador

#### Soluciones

**Problema de caché:**
- Navegador guardando versión antigua
- **Solución**: Ctrl+F5 (forzar recarga) o Ctrl+Shift+R

**Problema de JavaScript:**
- JavaScript deshabilitado
- **Solución**: Activa JavaScript en configuración del navegador

**Problema de memoria:**
- Navegador con poca memoria
- **Solución**: Cierra otras pestañas y reintenta

### 5. "La impresión se ve mal"

#### Síntomas
- Texto cortado
- Imagen distorsionada
- Márgenes incorrectos
- Fuente demasiado pequeña/grande

#### Soluciones

**Configuración de página:**
1. En el diálogo de impresión, selecciona "Más configuraciones"
2. Ajusta márgenes a "Ninguno" o "Mínimo"
3. Selecciona tamaño de papel correcto
4. Activa "Gráficos de fondo" si es necesario

**Problemas de escala:**
- Contenido no cabe en página
- **Solución**: Reduce tamaño de fuente o simplifica contenido

**Problemas de fuente:**
- Fuente no soportada en impresora
- **Solución**: Usa fuentes web estándar (Arial, Times New Roman)

### 6. "Error al cargar configuración"

#### Síntomas
- Página de configuración no carga
- Campos aparecen vacíos
- Error 500 en red

#### Soluciones

**Problemas de base de datos:**
- Servidor de base de datos caído
- **Solución**: Contacta al administrador del sistema

**Problemas de permisos:**
- Usuario sin permisos suficientes
- **Solución**: Verifica con administrador

**Problemas de versión:**
- Versión desactualizada
- **Solución**: Recarga la página o limpia caché

## 🔍 Diagnóstico Avanzado

### Verificar Compatibilidad del Navegador

Abre la consola del navegador (F12) y ejecuta:

```javascript
// Verificar soporte de impresión
console.log('Print support:', !!window.print);

// Verificar soporte de archivos
console.log('File API support:', !!(window.File && window.FileReader));

// Verificar soporte de formularios
console.log('FormData support:', !!window.FormData);
```

### Logs de Depuración

Para activar logs detallados:

```javascript
// En consola del navegador
localStorage.setItem('debug', 'printer-system:*');
location.reload();
```

### Información del Sistema

Cuando reportes un problema, incluye:

```
Navegador: Chrome 120.0.6099.109
SO: Windows 11 Pro
URL: https://miempresa.com/admin/settings
Error: [descripción completa]
Pasos para reproducir:
1. Abrir configuración
2. Cambiar tipo a "Ticket"
3. Hacer clic en "Probar Impresión"
```

## 🚑 Soluciones de Emergencia

### Resetear Configuración

Si todo falla, puedes resetear manualmente:

```javascript
// En consola del navegador
localStorage.removeItem('printer-config');
sessionStorage.clear();
location.reload();
```

### Modo Seguro

Para acceso básico sin JavaScript avanzado:

1. Desactiva extensiones del navegador
2. Activa modo incógnito
3. Desactiva bloqueadores de anuncios
4. Verifica que JavaScript esté activado

## 📞 Escalada de Soporte

### Nivel 1: Usuario Final
- Verifica las soluciones de esta guía
- Reinicia navegador y computadora
- Prueba en modo incógnito

### Nivel 2: Administrador de TI
- Verifica configuración del servidor
- Revisa logs del sistema
- Verifica conectividad de red

### Nivel 3: Soporte Técnico
- Acceso remoto para diagnóstico
- Modificaciones de configuración
- Actualizaciones de software

## 📊 Métricas de Salud del Sistema

### Verificación Diaria

- [ ] Configuración carga en < 3 segundos
- [ ] Preview actualiza en < 1 segundo
- [ ] Impresión funciona correctamente
- [ ] Subida de logos funciona
- [ ] No hay errores en consola

### Alertas de Monitoreo

- ❌ Más de 5 errores por hora
- ❌ Tiempo de carga > 10 segundos
- ❌ Fallos de impresión > 10%
- ❌ Problemas de subida > 5%

## 🎯 Prevención de Problemas

### Mantenimiento Preventivo

**Semanal:**
- Limpiar caché del navegador
- Verificar espacio en disco
- Actualizar navegador

**Mensual:**
- Verificar compatibilidad de versiones
- Probar todas las funcionalidades
- Revisar configuración de impresoras

### Mejores Prácticas

1. **Siempre prueba antes de usar con clientes**
2. **Mantén backups de configuraciones importantes**
3. **Documenta cambios en configuración**
4. **Usa navegadores actualizados**
5. **Verifica conectividad antes de trabajar**

## 📋 Checklist de Verificación

### Antes de Usar el Sistema
- [ ] Navegador compatible y actualizado
- [ ] Conexión a internet estable
- [ ] Popups permitidos
- [ ] JavaScript activado
- [ ] Impresora conectada y con papel

### Después de Cambios
- [ ] Probar impresión funciona
- [ ] Preview se ve correcto
- [ ] Configuración se guardó
- [ ] No hay errores en consola
- [ ] Funciona en diferentes navegadores

---

**¿El problema persiste?** Contacta al soporte técnico con la información recopilada.