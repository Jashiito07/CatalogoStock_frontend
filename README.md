# CatálogoStock: app móvil del Cliente

App móvil de CatálogoStock para el rol **Cliente** (D-01): catálogo, carrito, pedidos,
pagos, WhatsApp y chatbot, con funcionamiento sin conexión (RNF-06). Las funciones del
Vendedor viven en el panel web (`CatalogoStock_admin`).

La app lee y escribe primero en **SQLite** y sincroniza después con la API
(`CatalogoStock-backend`). El servidor decide siempre estados, totales oficiales y stock.

## Stack

| Pieza | Versión |
|---|---|
| Angular (standalone, TypeScript estricto) + Angular CDK | 22.2 |
| TypeScript | 6.0 |
| Ionic Angular (solo estructura y navegación) | 9.0 |
| Capacitor (core, cli, android, network) | 8 |
| Almacenamiento seguro: `@aparajita/capacitor-secure-storage` (D-16) | 8.0 |
| SQLite: `@capacitor-community/sqlite` + `jeep-sqlite` (web) | 8.1 / 2.8 |
| PrimeNG + `@primeuix/themes` + PrimeIcons | 22.1 / 3.1 / 8.0 |
| Pruebas: Vitest (runner por defecto de Angular) | 4 |
| Lint: angular-eslint | 22.6 |

## Requisitos

- Node.js **24.15 o superior** (Angular 22 exige `^22.22.3 || ^24.15.0 || >=26.0.0`;
  probado con 26.13) y npm 11.
- Para compilar y ejecutar en Android:
  - **JDK 21** (`JAVA_HOME` apuntando a él). Capacitor 8 no compila con Java 8 ni 17.
  - **Android SDK** (Android Studio) con la plataforma 36 y `ANDROID_HOME` configurado.
- Opcional: `@ionic/cli` global para usar `ionic serve` (equivale a `npm start`).

## Comandos

```bash
npm install                 # instala dependencias
npm start                   # servidor de desarrollo en http://localhost:4200 (= ionic serve)
npm run lint                # ESLint (angular-eslint)
npm test -- --watch=false   # pruebas unitarias (Vitest)
npm run build               # build de producción en dist/catalogostock-frontend/browser
npx cap sync android        # copia el build y los plugins al proyecto Android
npx cap open android        # abre el proyecto en Android Studio (requiere el SDK)

# Solo desarrollo en la red local (ver «Probar en el celular»)
npm run start:red-local     # ng serve --host 0.0.0.0 (navegador del celular)
npm run build:red-local     # build con src/environments/environment.red-local.ts
npm run android:red-local   # build:red-local + cap run android con HTTP permitido
npm run cap:red-local -- sync android   # cualquier comando de cap con la config de red local
```

Después de cambiar plugins o la configuración nativa: `npm run build` y luego
`npx cap sync android`.

### Configuración

- `src/environments/environment.development.ts`: `apiUrl` de desarrollo
  (`http://localhost:3000/api/v1`) con `apiEnMismoHost: true`: si abres la app desde otro
  equipo (por ejemplo `http://192.168.1.20:4200` en el celular), la API se busca en ese
  mismo host (`http://192.168.1.20:3000/api/v1`). En el emulador de Android usa
  `10.0.2.2` en lugar de `localhost`.
- `src/environments/environment.ts`: `apiUrl` de producción. Debe ser HTTPS (RNF-01): si
  no lo es, la app no arranca.
- `src/environments/environment.red-local.ts`: **no se versiona** (está en `.gitignore`).
  Se crea a partir de `environment.red-local.example.ts` con la IP de tu PC, solo para el
  APK de desarrollo.
- Aquí solo va la URL base de la API. **Nunca** credenciales: las de PayPhone viven en el
  backend (RN-16).

## Probar en el celular (red local, solo desarrollo)

Requisitos comunes:

1. La PC y el celular están en **la misma red Wi-Fi**.
2. Averigua la IP de la PC: en PowerShell, `ipconfig` → «Dirección IPv4» del adaptador
   Wi-Fi (por ejemplo `192.168.100.113`).
3. El backend corre en la PC (`npm run start:dev` en `CatalogoStock-backend`) y su
   `CORS_ORIGENES` (archivo `.env` del backend) incluye el origen que usarás:
   - navegador del celular: `http://<IP>:4200`;
   - APK de desarrollo: `http://localhost`.
4. El Firewall de Windows permite conexiones entrantes a Node.js en los puertos 3000 y
   4200 en redes **privadas** (Windows lo pregunta la primera vez; si no, agrega la regla
   en «Firewall de Windows Defender → Configuración avanzada → Reglas de entrada»).
5. Comprueba desde el navegador del celular que `http://<IP>:3000/api/v1/privacidad/aviso`
   responde con el aviso. Si no responde, revisa la red o el firewall antes de seguir.

### Opción A: en el navegador del celular

1. En la PC: `npm run start:red-local` (equivale a `ng serve --host 0.0.0.0`).
2. En el celular abre `http://<IP>:4200` (por ejemplo `http://192.168.100.113:4200`).
3. La app detecta que no se abrió desde `localhost` y usa `http://<IP>:3000/api/v1`. No
   hay que escribir la IP en ningún archivo.

Notas: en el navegador la sesión se guarda en `sessionStorage` (se pierde al cerrar la
pestaña) porque el almacenamiento seguro (D-16) solo existe en Android. La base local
usa IndexedDB. La prueba definitiva del modo sin conexión se hace con el APK.

### Opción B: APK de desarrollo instalado por USB

El WebView de Capacitor sirve la app desde `https://localhost`; Android bloquearía una
API `http://<IP>:3000` (contenido mixto y tráfico sin cifrar). La configuración
`red-local` lo resuelve **solo en desarrollo**:

- `environment.red-local.ts` fija la URL de la API con la IP de la PC (archivo local, no
  versionado).
- La variable `CS_RED_LOCAL=1`, que ponen los scripts `android:red-local` y
  `cap:red-local`, hace que `capacitor.config.ts` use `server.androidScheme: 'http'`
  (la app se sirve desde `http://localhost`) y `server.cleartext: true` (Android permite
  HTTP sin cifrar).
- Sin esa variable la configuración es la segura de siempre, y `android/app/build.gradle`
  hace fallar cualquier compilación **release** que tenga HTTP sin cifrar (RNF-01).

Pasos:

1. **Activa el modo desarrollador** en el celular: Ajustes → Acerca del teléfono → toca
   7 veces «Número de compilación» (en algunos equipos está en «Información de software»).
2. **Activa la depuración USB**: Ajustes → Sistema → Opciones de desarrollador →
   «Depuración USB».
3. Conecta el celular por USB y, en el aviso del celular, acepta «Permitir depuración USB»
   para esta PC.
4. Comprueba que la PC lo ve (el SDK trae `adb` en `%ANDROID_HOME%\platform-tools`):

   ```powershell
   adb devices
   # List of devices attached
   # R58N12345AB    device      ← debe decir «device», no «unauthorized»
   ```

5. Crea la configuración local con la IP de tu PC (una sola vez):

   ```powershell
   Copy-Item src/environments/environment.red-local.example.ts src/environments/environment.red-local.ts
   # Edita environment.red-local.ts y cambia 192.168.X.X por la IP de tu PC
   ```

6. Compila, sincroniza e instala en el celular:

   ```powershell
   npm run build:red-local                 # build de Angular con la IP de la PC
   npm run cap:red-local -- sync android   # copia el build con HTTP permitido
   npm run cap:red-local -- run android    # compila el APK de debug, lo instala y lo abre
   ```

   `npm run android:red-local` hace los pasos de build y `run` seguidos. Si hay varios
   dispositivos, `cap run` pregunta cuál usar (o usa `-- run android --target <id>`).

7. Alternativa sin `cap run`: compila el APK de debug y lo instalas con `adb`:

   ```powershell
   cd android
   .\gradlew.bat assembleDebug
   adb install -r app\build\outputs\apk\debug\app-debug.apk
   ```

8. **Al terminar**, deja el proyecto Android con la configuración segura antes de
   compilar otra cosa:

   ```powershell
   npm run build
   npx cap sync android
   ```

Los archivos que cambia la configuración de red local
(`android/app/src/main/assets/capacitor.config.json` y el manifiesto de
`capacitor-cordova-android-plugins`) son generados y están en `.gitignore`.

## Sesión del Cliente (F1)

- Registro (`/registro`), ingreso (`/ingreso`, solo `POST /autenticacion/ingreso/cliente`,
  D-19) e inicio del Cliente (`/inicio`). Sin sesión solo se ven bienvenida, registro e
  ingreso (PA-12).
- La sesión (tokens y usuario) se guarda con `@aparajita/capacitor-secure-storage`
  (Keystore de Android, D-16). Nunca en `localStorage`, Preferences ni SQLite.
- Sin conexión y con sesión guardada, la app abre con los datos locales aunque el token
  de acceso haya vencido (D-10). Al recuperar la conexión consulta `GET /usuarios/yo`, y
  el interceptor renueva la sesión con rotación ante `401 TOKEN_VENCIDO` (una sola
  renovación aunque fallen varias solicitudes a la vez). Si la renovación es rechazada,
  borra la sesión (no los datos locales) y pide ingresar.
- La última versión leída del aviso de privacidad se guarda en la tabla local
  `metadatos` para mostrarla sin conexión.

### SQLite en el navegador

En `npm start` la base se guarda en IndexedDB mediante `jeep-sqlite`. El build copia
`node_modules/sql.js/dist/sql-wasm.wasm` a `assets/`. La verificación definitiva del modo
sin conexión se hace en Android.

**`sql.js` está fijada en 1.12.0** (`"overrides"` en `package.json`). `jeep-sqlite` 2.8.0
trae incrustado el código JavaScript de `sql.js` 1.12.0 o anterior, pero el archivo
`sql-wasm.wasm` se copia desde `node_modules/sql.js`. Si npm instala una versión más nueva
(1.13 o superior, que también cumple el rango `^1.11.0` de `jeep-sqlite`), el JavaScript y
el WebAssembly no coinciden. Entonces el navegador muestra
`LinkError: WebAssembly.instantiate(): Import #34 "a" "I": function import requires a callable`
y SQLite web no arranca. **No subas `sql.js` sin actualizar también `jeep-sqlite` a una
versión que use la misma `sql.js`.** Comprueba la versión con `npm ls sql.js`.

Si SQLite no arranca, `BaseDatosSqlite.iniciar()` se rechaza tras 10 s
(`TIEMPO_LIMITE_INICIO_MS`) en vez de quedar esperando, y se puede reintentar.

## Estructura

```text
src/app/
  app.ts / app.config.ts / app.routes.ts   Estructura Ionic, PrimeNG y rutas diferidas
  compartido/
    dominio/dinero.ts                      Dinero exacto en centavos (sin frameworks)
    aplicacion/puertos/                    Puertos (BaseDatosLocal, …)
    infraestructura/base-datos.ts          Servicio único de SQLite + migraciones locales
    infraestructura/migraciones/           001-inicial, 002-…
    presentacion/tema/                     Tema corporativo (preset PrimeNG y colores.css)
    compartido.providers.ts                Asocia los puertos con sus adaptadores
  inicio/                                  Bienvenida e inicio del Cliente
    aplicacion/casos-uso/
    presentacion/bienvenida.page.*, inicio-cliente.page.*
  usuarios/                                Registro, ingreso y sesión (F1)
    dominio/                               Validaciones, sesión, mensajes de error
    aplicacion/                            Casos de uso, GestorSesion y puertos
    infraestructura/                       API HTTP, almacén seguro, interceptor
    presentacion/                          Páginas de registro e ingreso, guards
  <modulo>/{dominio,aplicacion,infraestructura,presentacion}/
```

Cada módulo (`usuarios`, `catalogo`, `carrito`, `pedidos`, `pagos`, `whatsapp`,
`chatbot`, `asistente`, `sincronizacion`) sigue las mismas cuatro capas.

### Regla de dependencias

```text
presentacion ─┐
              ├─► aplicacion ─► dominio
infraestructura┘
```

- `dominio`: entidades y reglas en TypeScript puro. No importa `@angular/*`, `@ionic/*`,
  `@capacitor/*` ni SQLite.
- `aplicacion`: casos de uso y puertos (interfaces).
- `infraestructura`: SQLite, HTTP y plugins de Capacitor; implementa los puertos.
- `presentacion`: páginas y componentes. No llama a HTTP ni a SQLite: usa casos de uso.
- Los adaptadores se asocian a los puertos con `InjectionToken` en `<modulo>.providers.ts`.

## Interfaz y diseño (D-06)

- Todos los controles visibles son de **PrimeNG**. Los botones usan la directiva
  `<button pButton>` (el componente `p-button` está obsoleto desde PrimeNG 22). Ionic solo aporta `ion-app`,
  `ion-router-outlet`, `ion-content` (desplazamiento y área segura) y la navegación.
- Colores corporativos definidos una sola vez en `compartido/presentacion/tema/`
  (`--cs-primario`, `--cs-secundario`, `--cs-acento`, `--cs-fondo`, `--cs-texto`).
  No se escriben colores hexadecimales en los componentes.
- Sobre el Acento el texto va en el color Texto, nunca en blanco (RNF-11).
- Controles táctiles de al menos 48 px (RNF-10).

## Git

Ramas `main` y `develop`. Se trabaja en `feature/<modulo>-<descripcion>` creada desde
`develop`, con Conventional Commits, y se entrega por Pull Request hacia `develop`.
