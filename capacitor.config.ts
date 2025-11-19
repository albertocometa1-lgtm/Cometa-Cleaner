import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sappylo.cometa',
  appName: 'Cometa Cleaner',
  webDir: 'dist',
  bundledWebRuntime: false,
  ios: {
    contentInset: 'always',
    scheme: 'cometa-cleaner',
    limitsNavigationsToAppBoundDomains: true
  },
  server: {
    androidScheme: 'https'
  }
};

export default config;
