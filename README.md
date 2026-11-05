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
```

Después de cambiar plugins o la configuración nativa: `npm run build` y luego
`npx cap sync android`.

### Configuración

- `src/environments/environment.development.ts`: `apiUrl` de desarrollo
  (`http://localhost:3000/api/v1`). En el emulador de Android usa `10.0.2.2` en lugar de
  `localhost`.
- `src/environments/environment.ts`: `apiUrl` de producción (HTTPS, RNF-01).
- Aquí solo va la URL base de la API. **Nunca** credenciales: las de PayPhone viven en el
  backend (RN-16).

### SQLite en el navegador

En `npm start` la base se guarda en IndexedDB mediante `jeep-sqlite`. El build copia
`node_modules/sql.js/dist/sql-wasm.wasm` a `assets/`. La verificación definitiva del modo
sin conexión se hace en Android.

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
  inicio/                                  Pantalla de bienvenida (verificación de F0)
    aplicacion/casos-uso/
    presentacion/bienvenida.page.*
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
