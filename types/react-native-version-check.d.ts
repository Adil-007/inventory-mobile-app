declare module 'react-native-version-check' {
  export function getCurrentVersion(): string;
  export function getLatestVersion(options?: {
    provider?: 'appStore' | 'playStore';
    country?: string;
    appID?: string;
    packageName?: string;
  }): Promise<string>;

  export function needUpdate(params: {
    currentVersion: string;
    latestVersion: string;
  }): { isNeeded: boolean };

  export function getAppStoreUrl(options?: { appID?: string }): Promise<string>;
  export function getPlayStoreUrl(options?: { packageName?: string }): Promise<string>;
}
