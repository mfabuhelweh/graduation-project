import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mohammed.electionapp',
  appName: 'Election App',
  webDir: 'dist',
  android: {
    // Allow HTTP API (e.g. http://192.168.x.x:3215/api) from the https WebView origin.
    allowMixedContent: true,
  },
};

export default config;
