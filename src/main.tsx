import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toaster } from "./molecules/Toast";
import "./index.css";
import "./i18n/index";  // initializes i18next (side-effect import)
import { useThemeStore } from "./stores/theme-store";

// Apply persisted theme immediately to prevent flash of wrong theme
const { theme, setTheme } = useThemeStore.getState();
setTheme(theme);

// Unregister service workers in development to bypass PWA caching issues
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    if (registrations.length > 0) {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log("[PWA] Service worker unregistered successfully in DEV mode");
          }
        });
      }
      // Force reload to bypass cache and load fresh from dev server
      window.location.reload();
    }
  });
}


// Suppress Google GSI double-initialization warning in React Strict Mode (Dev only)
if (import.meta.env.DEV) {
  let initialized = false;
  let googleVal: any = (window as any).google;

  const wrapInitialize = (googleObj: any) => {
    try {
      const init = googleObj?.accounts?.id?.initialize;
      if (typeof init === "function" && !init._patched) {
        const originalInitialize = init;
        googleObj.accounts.id.initialize = function (config: any) {
          if (initialized) return;
          initialized = true;
          return originalInitialize.call(this, config);
        };
        googleObj.accounts.id.initialize._patched = true;
      }
    } catch {
      // Google GSI script may not be fully ready yet — safe to ignore
    }
  };

  // If already loaded on start
  if (googleVal) {
    wrapInitialize(googleVal);
  }

  Object.defineProperty(window, "google", {
    configurable: true,
    enumerable: true,
    get() {
      if (googleVal) {
        wrapInitialize(googleVal);
      }
      return googleVal;
    },
    set(val) {
      googleVal = val;
      if (val) {
        wrapInitialize(val);
      }
    },
  });
}


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
      <Toaster />
    </ErrorBoundary>
  </React.StrictMode>,
);
