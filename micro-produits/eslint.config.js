// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

/** Préfixe des sélecteurs : `mp` dans les bibliothèques partagées, `app` dans un produit. */
const selecteurs = (prefix) => ({
  '@angular-eslint/directive-selector': [
    'error',
    { type: 'attribute', prefix, style: 'camelCase' },
  ],
  '@angular-eslint/component-selector': ['error', { type: 'element', prefix, style: 'kebab-case' }],
});

const ts = {
  extends: [
    eslint.configs.recommended,
    tseslint.configs.recommended,
    tseslint.configs.stylistic,
    angular.configs.tsRecommended,
  ],
  processor: angular.processInlineTemplates,
};

module.exports = defineConfig([
  { files: ['libs/**/*.ts'], ...ts, rules: selecteurs('mp') },
  {
    files: ['projects/**/*.ts'],
    ...ts,
    rules: {
      ...selecteurs('app'),
      // Un produit passe par les points d'entrée publics des bibliothèques.
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['**/libs/**'], message: 'Importer @mp/core ou @mp/ui.' }] },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
  },
]);
