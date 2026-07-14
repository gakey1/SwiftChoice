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

// Mock expo-blur's BlurView. Its native module is not available under Jest, and
// it is a purely visual wrapper, so a plain host-component stub lets any screen
// that uses the glass surfaces render in tests.
jest.mock("expo-blur", () => ({ BlurView: "BlurView" }));

// Mock the icon sets. The real @expo/vector-icons pulls in expo-font / expo-asset
// (not resolvable under Jest). Stub the two sets the app uses with plain host
// components so any file that imports an icon - directly or transitively, like a
// screen importing the HUD layout constant - loads in tests. Individual tests can
// still override this.
jest.mock("@expo/vector-icons", () => ({
  Feather: "Feather",
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));
