// @ts-check
const eslint = require("@eslint/js");
const { defineConfig } = require("eslint/config");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = defineConfig([
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case",
        },
      ],
    },
  },
  {
    // Regla de dependencias: el dominio es TypeScript puro (RNF-14).
    files: ["src/app/**/dominio/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@angular/*",
                "@ionic/*",
                "@capacitor/*",
                "@capacitor-community/*",
                "jeep-sqlite",
                "jeep-sqlite/*",
                "primeng",
                "primeng/*",
                "rxjs",
                "rxjs/*",
                "**/aplicacion/**",
                "**/infraestructura/**",
                "**/presentacion/**",
              ],
              message: "El dominio no depende de frameworks ni de otras capas.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
    rules: {},
  }
]);
