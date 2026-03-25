export default ({ config }) => ({
  ...config,
  name: process.env.APP_VARIANT === 'dev' ? 'ProstoPresto Dev' : 'ProstoPresto',
  slug: 'BleApp51',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
  },
  android: {
    package: process.env.APP_VARIANT === 'dev' ? 'com.bleapp51.dev' : 'com.bleapp51',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    permissions: [
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_ADMIN',
      'android.permission.BLUETOOTH_SCAN',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.ACCESS_FINE_LOCATION',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    [
      'react-native-ble-plx',
      {
        isBackgroundEnabled: false,
        modes: [],
        bluetoothAlwaysPermission: 'Allow ProstoPresto to use Bluetooth',
      },
    ],
  ],
  extra: {
    eas: {
      projectId: 'b5835f8a-4022-4593-bf49-472d30197d5b',
    },
  },
});