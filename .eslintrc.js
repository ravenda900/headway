module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: [
      '@typescript-eslint',
    ],
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
    ],
    overrides: [
        {
          files: ['*.ts'],
          rules: {
            '@typescript-eslint/no-var-requires': 'off',
            '@typescript-eslint/ban-types': 'off',
            '@typescript-eslint/no-debugger': 'off',
            '@typescript-eslint/no-empty-function': 'off'
          }
        }
    ]
  };