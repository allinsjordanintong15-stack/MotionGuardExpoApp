import "firebase/auth";

declare module "firebase/auth" {
  /** RN-only helper; provided at runtime when Metro resolves `@firebase/auth` RN bundle. */
  export function getReactNativePersistence(
    storage: import("@react-native-async-storage/async-storage").default,
  ): import("firebase/auth").Persistence;
}
