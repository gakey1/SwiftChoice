module.exports = {
  preset: "jest-expo",
  // Runs before each test file. Mocks AsyncStorage (null native module under Jest).
  setupFiles: ["<rootDir>/jest.setup.js"],
  // The Cloudflare Worker under workers/ is a separate package with its own
  // vitest setup, and its tests import "cloudflare:test", a module that only
  // exists inside the Workers runtime. Jest sweeps them up otherwise and fails
  // to load the suite, which reads as the app being broken when it is not.
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/workers/"],
  moduleNameMapper: {
    // Mirror the tsconfig "@/*" path alias. Metro resolves this natively,
    // but Jest needs it spelled out.
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // jest-expo's default ignore list, extended with the packages this app
  // pulls in that ship untranspiled ES modules.
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|@react-navigation/.*|react-native-.*|firebase|@firebase/.*|otpauth|@noble/hashes))",
  ],
};
