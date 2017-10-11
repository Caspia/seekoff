module.exports = {
    "extends": "standard",
    "parserOptions": {
      "ecmaVersion": 2017
    },
    "env": {
      "node": true,
      "browser": true,
    },
    "rules": {
      "semi": ["error", "always"],
      "space-before-function-paren": ["error", {
        "anonymous": "always",
        "named": "never",
        "asyncArrow": "always"
      }],
      "eqeqeq": "off",
      "comma-dangle": ["error", {
        "arrays": "always-multiline",
        "objects": "always-multiline",
        "imports": "always-multiline",
        "exports": "always-multiline",
        "functions": "ignore",
      }]
    },
    root: true,
};