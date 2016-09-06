module.exports = {
  'env': {
    'browser': true,
    'node': true,
    'es6': true,
  },
  'extends': "airbnb-base",
  'rules': {
    'import/no-unresolved': 0,
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'keyword-spacing': ['error', {
      overrides: {
        if: { after: false },
        for: { after: false },
        while: { after: false },
        catch: { after: false },
      }
    }],
    'no-console': 'off',
    'no-alert': 'off',
    'no-else-return': 'off',
    'no-continue': 'off',
    'import/no-extraneous-dependencies': [
      "error", {
        'devDependencies': true,
      },
    ],
    'import/newline-after-import': 'off',
    'curly': ['error', 'multi'],
    'no-param-reassign': 'off',
    'no-underscore-dangle': 'off',
    'no-confusing-arrow': 'off',
    'no-mixed-operators': ['error', {
      'allowSamePrecedence': true,
    }],
    'no-empty': ['error', {
      'allowEmptyCatch': true,
    }],
    'no-shadow': ['error', {
      'allow': ['done', 'err', 'cb', 'reject', 'resolve'],
    }],
    'no-void': 'off',
    'consistent-return': ['error', {
      "treatUndefinedAsUnspecified": true,
    }],
    'max-len': ['error', {
      'code': 100,
      'ignorePattern': '\\(resolve, reject\\) =>',
    }],
    'new-cap': 'off',
  }
};
