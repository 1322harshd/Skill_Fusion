const globals = require("globals");
const reactPlugin = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");

// Globals attached to window by the script tags in index.html
const appGlobals = {
  React: "readonly",
  ReactDOM: "readonly",
  Motion: "readonly",
  MotionKit: "readonly",
  Store: "readonly",
  Api: "readonly",
  Router: "readonly",
  Toast: "readonly",
  Fusion: "readonly",
  Icons: "readonly",
  Modal: "readonly",
  Avatar: "readonly",
  AmbientBackground: "readonly",
  VIDEOS: "readonly",
  API_BASE_URL: "readonly",
  // Add any other window.X names your components use
};

module.exports = [
  {
    ignores: ["node_modules/**", "wireframes/**", "videos/**"],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script", // files are loaded as classic <script> tags
      globals: { ...globals.browser, ...appGlobals },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // React is a global, not imported
      "react/prop-types": "off",
      "no-undef": "error",
      "no-unused-vars": "warn",
    },
    settings: { react: { version: "18.3" } },
  },
];
