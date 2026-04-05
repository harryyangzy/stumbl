import Constants, { ExecutionEnvironment } from 'expo-constants';

/** True when running inside the Expo Go client (no custom native code). */
export function isExpoGo(): boolean {
  return (
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    Constants.appOwnership === 'expo'
  );
}
