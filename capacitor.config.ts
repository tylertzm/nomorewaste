import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.nomorewaste.app',
    appName: 'NoMoreWaste',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    },
    plugins: {
        Camera: {
            permissions: {
                camera: 'required',
                photos: 'required'
            }
        }
    }
};

export default config;
