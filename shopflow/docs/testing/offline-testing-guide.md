# Guía de Testing para Funcionalidad Offline

Esta guía explica cómo probar correctamente la funcionalidad offline de ShopFlow POS.

## Importante: Modo Desarrollo vs Producción

**Next.js en modo desarrollo (`pnpm dev`) siempre requiere el servidor corriendo.** Para probar la funcionalidad offline completa, debes usar un build de producción.

## Pasos para Probar Funcionalidad Offline

### 1. Build de Producción

```bash
# Crear build de producción
pnpm build

# Iniciar servidor de producción
pnpm start
```

### 2. Cachear Páginas y Datos

1. Abre el navegador y ve a `http://localhost:3000`
2. Inicia sesión con tus credenciales
3. Navega por las siguientes páginas para que el service worker las cachee:
   - `/dashboard`
   - `/products`
   - `/sales`
   - `/customers`
   - `/categories`
   - `/suppliers`
   - `/settings`
4. Realiza algunas acciones que generen datos:
   - Ver productos (se cachean automáticamente)
   - Ver categorías
   - Ver clientes
   - Ver proveedores

### 3. Verificar que el Service Worker está Activo

1. Abre las DevTools (F12)
2. Ve a la pestaña "Application" (Chrome) o "Storage" (Firefox)
3. En "Service Workers", verifica que el service worker esté registrado y activo
4. En "Cache Storage", verifica que existan los caches:
   - `shopflow-pos-v2` (assets estáticos)
   - `shopflow-data-v2` (datos de API)

### 4. Probar Funcionalidad Offline

1. **Cerrar el servidor:**
   ```bash
   # Presiona Ctrl+C en la terminal donde está corriendo `pnpm start`
   ```

2. **Desconectar internet (opcional pero recomendado):**
   - En Chrome DevTools: Network tab → Throttling → Offline
   - O desconecta físicamente tu conexión

3. **Probar navegación:**
   - Recarga la página (`F5` o `Ctrl+R`)
   - Navega entre diferentes rutas usando el menú
   - Verifica que las páginas se carguen desde cache

4. **Probar datos offline:**
   - Ve a `/products` - deberías ver productos cacheados
   - Ve a `/customers` - deberías ver clientes cacheados
   - Ve a `/categories` - deberías ver categorías cacheadas
   - Ve a `/suppliers` - deberías ver proveedores cacheados

5. **Probar autenticación offline:**
   - Cierra sesión
   - Intenta iniciar sesión (debería funcionar con token offline si ya estabas autenticado antes)
   - O recarga la página de login cuando ya estás autenticado

6. **Probar creación offline (cola de sincronización):**
   - Intenta crear un producto nuevo
   - Intenta crear una venta
   - Verifica que se muestre un mensaje de "en cola para sincronización"
   - Los datos se sincronizarán automáticamente cuando vuelvas a estar online

### 5. Probar Sincronización

1. **Volver a conectar:**
   - Inicia el servidor nuevamente: `pnpm start`
   - Conecta internet si la desconectaste

2. **Verificar sincronización automática:**
   - El service worker debería detectar que estás online
   - Los datos en cola deberían sincronizarse automáticamente
   - Revisa la consola para ver mensajes de sincronización

3. **Sincronización manual:**
   - Ve a `/offline` o usa el componente `SyncStatus` en el dashboard
   - Haz clic en "Sincronizar Ahora"
   - Verifica que los datos se sincronizan correctamente

## Verificación de Funcionalidades

### ✅ Checklist de Funcionalidades Offline

- [ ] Service Worker registrado y activo
- [ ] Páginas HTML se cargan desde cache cuando offline
- [ ] Assets estáticos (JS, CSS, imágenes) se cargan desde cache
- [ ] Datos de productos se muestran desde IndexedDB cuando offline
- [ ] Datos de categorías se muestran desde IndexedDB cuando offline
- [ ] Datos de clientes se muestran desde IndexedDB cuando offline
- [ ] Datos de proveedores se muestran desde IndexedDB cuando offline
- [ ] Autenticación funciona offline (con token válido)
- [ ] Creación de datos se encola cuando offline
- [ ] Sincronización automática cuando vuelve la conexión
- [ ] Sincronización manual funciona correctamente
- [ ] Indicador de estado offline se muestra correctamente
- [ ] Página `/offline` muestra información útil

## Troubleshooting

### El service worker no se registra

- Verifica que estés usando HTTPS o localhost
- Revisa la consola del navegador para errores
- Verifica que `/sw.js` sea accesible (debería retornar código JavaScript)

### Las páginas no se cargan offline

- Asegúrate de haber visitado las páginas al menos una vez cuando estabas online
- Verifica en DevTools → Application → Cache Storage que existan entradas
- Intenta limpiar el cache y volver a cachear

### Los datos no se muestran offline

- Verifica en DevTools → Application → IndexedDB que existan datos
- Asegúrate de haber navegado por las páginas que cargan datos cuando estabas online
- Revisa la consola para errores de IndexedDB

### La sincronización no funciona

- Verifica que el servidor esté corriendo cuando intentas sincronizar
- Revisa la consola para errores de red
- Verifica que los datos en cola existan en IndexedDB → `offline-queue` → `requests`

## Notas Importantes

1. **Modo Desarrollo:** `pnpm dev` siempre requiere el servidor. Usa `pnpm build` + `pnpm start` para testing offline.

2. **Cache del Navegador:** Si haces cambios en el código, necesitarás:
   - Hacer un nuevo build
   - Limpiar el cache del navegador (o usar modo incógnito)
   - Actualizar el service worker (versión en `sw.js`)

3. **Service Worker Updates:** El service worker se actualiza automáticamente cuando cambia su versión (`CACHE_VERSION` en `sw.js`). Los cambios pueden tardar hasta 24 horas en aplicarse automáticamente, o puedes forzar la actualización limpiando el cache.

4. **IndexedDB:** Los datos en IndexedDB persisten incluso después de cerrar el navegador. Para limpiarlos, usa DevTools → Application → IndexedDB → Delete database.

## Comandos Útiles

```bash
# Build de producción
pnpm build

# Iniciar servidor de producción
pnpm start

# Limpiar build anterior (opcional)
rm -rf .next

# Verificar que el build se creó correctamente
ls -la .next/standalone
```
