# RUTA CATRACHA — Guía de Empaquetado Nativo (.apk y .exe), Audio y Publicación
Creador: **Isaac Ramos**  
Cuenta configurada para pagos/tienda: `isaac2ramos15@gmail.com`

---

## 1. Instalación Directa Offline (Ya Lista Hoy)
La aplicación web ya compila un **Service Worker offline completo (`vite-plugin-pwa`)**:
1. Ejecuta `npm run build`.
2. Al abrir la app en **Android (Chrome)** o **Windows (Edge/Chrome)**, pulsa **"Instalar App Offline"** en el menú principal.
3. Funciona **sin navegador visible y sin internet**, guardando récords, monedas, personajes, escenarios y pistas autorizadas localmente.

---

## 2. Compilar APK / AAB Nativo para Android (Google Play Store)
En una PC con **Node.js 20+, Android Studio, JDK 17 y Android SDK** instalados:

```bash
npm install
npm install @capacitor/core @capacitor/cli @capacitor/android
npm run build
npx cap add android
npx cap sync android
```

Luego copia los dos puentes nativos preparados en este proyecto dentro del proyecto Android generado (`android/app/src/main/java/com/isaacramos/rutacatracha/`):
- `native/android-setup/PlayBillingPlugin.java`
- `native/android-setup/AdMobBridge.java`

### Dependencias Gradle (`android/app/build.gradle`)
Agrega en `dependencies`:
```gradle
implementation 'com.android.billingclient:billing:6.2.1'
implementation 'com.google.android.gms:play-services-ads:23.1.0'
```

### AndroidManifest.xml (AdMob)
Dentro de `<application>`:
```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-3940256099942544~3347511713"/>
```
*(Reemplaza ese ID de prueba con tu **App ID real de Google AdMob** asociado a `isaac2ramos15@gmail.com` antes de subir el `.aab` a Google Play Console.)*

### Productos dentro de Google Play Console (SKUs exactos)
Crea estos 3 productos en **Google Play Console -> Monetización -> Productos en la app**:
1. `rc_coins_pack_500` — Paquete 500 Monedas 5¢ (Consumible)
2. `rc_coins_pack_2000` — Paquete 2,000 Monedas 5¢ (Consumible)
3. `rc_remove_ads` — Eliminar Anuncios (Compra única no consumible)

Finalmente, abre `npx cap open android`, firma el **Android App Bundle (.aab)** o **APK** con tu keystore y compila.

---

## 3. Compilar Instalador Nativo Windows (.exe)
En una PC con **Windows 10/11** y **Node.js 20+**:

```bash
npm install
npm install -D electron electron-builder
npm run build
npx electron-builder --win --x64
```
El instalador **`Ruta Catracha Setup.exe`** se generará en la carpeta `release/` usando `electron/main.cjs`, `electron/preload.cjs` y `electron-builder.yml`. Funciona 100% sin conexión a internet y sin barra de navegador.

---

## 4. Música Autorizada Offline (ej. "Todas las noches estuvo" de KVP)
Este proyecto **no incluye** archivos `.mp3` protegidos por derechos de autor dentro del repositorio. Tienes dos formas limpias de usar tu pista con licencia:
1. **Desde el juego (sin compilar de nuevo):** ve a **Configuración -> Pista Autorizada Offline** y carga tu archivo `.mp3 / .wav / .ogg`. Se guarda en IndexedDB dentro del dispositivo y suena sin internet.
2. **Antes de compilar APK o EXE:** puedes copiar el archivo autorizado y verificarlo en el dispositivo, mientras las 5 bandas sonoras integradas (Punta, Rap, Tropical, Urbana, Cinemática) siempre funcionan offline sin archivos externos.
