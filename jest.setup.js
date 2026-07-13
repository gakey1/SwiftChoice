// Global Jest setup.
//
// Mock AsyncStorage for every test. Its native module is null under Jest, so
// importing it throws. Several modules pull it in (Firebase auth persistence and
// the theme storage, which is now reached transitively through the themed shared
// components like Card and Button), so mocking it once here keeps every suite
// loadable. Individual tests can still override this with their own jest.mock.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
