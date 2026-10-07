const globals = require("globals");
const reactPlugin = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");

// Globals attached to window (or declared top-level) by the script tags in index.html
const appGlobals = {
  API_BASE_URL: "readonly",
  AiSteps: "readonly",
  Ambient: "readonly",
  AmbientBackground: "readonly",
  AnimatePresence: "readonly",
  Api: "readonly",
  AppShell: "readonly",
  Appearance: "readonly",
  Avatar: "readonly",
  BlurText: "readonly",
  CTA: "readonly",
  Capabilities: "readonly",
  Community: "readonly",
  Connect: "readonly",
  CountdownRing: "readonly",
  Dashboard: "readonly",
  Demo: "readonly",
  ExplainPanel: "readonly",
  FAQ: "readonly",
  FadingVideo: "readonly",
  Footer: "readonly",
  Fuse: "readonly",
  Fusion: "readonly",
  FusionGauge: "readonly",
  FusionSidebar: "readonly",
  GrowthLog: "readonly",
  Hero: "readonly",
  HowItWorks: "readonly",
  Icons: "readonly",
  Modal: "readonly",
  Motion: "readonly",
  MotionConfig: "readonly",
  MotionKit: "readonly",
  Navbar: "readonly",
  Onboarding: "readonly",
  Posts: "readonly",
  Pricing: "readonly",
  Project: "readonly",
  React: "readonly",
  ReactDOM: "readonly",
  ResetPassword: "readonly",
  Resume: "readonly",
  Reveal: "readonly",
  RoadmapDetail: "readonly",
  Roadmaps: "readonly",
  Router: "readonly",
  Score: "readonly",
  ScoreScreen: "readonly",
  ScreenPlaceholder: "readonly",
  SectionHeading: "readonly",
  SkillPicker: "readonly",
  SkillTag: "readonly",
  Store: "readonly",
  Toast: "readonly",
  VIDEOS: "readonly",
  VerifiedBadge: "readonly",
  VerifyEmail: "readonly",
  motion: "readonly",
  useReducedMotion: "readonly",
  useRoute: "readonly",
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
      "react/no-unescaped-entities": "off",
      "react/jsx-no-comment-textnodes": "off", // "// kicker" labels are intentional text
      "no-undef": "error",
      "no-unused-vars": "warn",
    },
    settings: { react: { version: "18.3" } },
  },
  {
    // These files define hooks as window.X.use* properties, which the hooks rule can't resolve
    files: ["src/app/ambient.js", "src/app/AppShell.js"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
];
