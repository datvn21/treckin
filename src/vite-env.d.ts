/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_SOCKET_URL: string;
  readonly VITE_GEOFENCE_RADIUS_METERS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
