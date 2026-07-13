module.exports = {
  preset: "jest-expo",
  // Runs before each test file. Mocks AsyncStorage (null native module under Jest).
  setupFiles: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    // Mirror the tsconfig "@/*" path alias. Metro resolves this natively,
    // but Jest needs it spelled out.
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // jest-expo's default ignore list, extended with the packages this app
  // pulls in that ship untranspiled ES modules.
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|@react-navigation/.*|react-native-.*|firebase|@firebase/.*))",
  ],
};
