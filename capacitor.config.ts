import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.routiq.truck',
  appName: 'Routiq',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      backgroundColor: '#0F172A',
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#0F172A',
      style: 'DARK',
    },
  },
};

export default config;
