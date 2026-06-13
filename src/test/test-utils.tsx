import React, { type ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

const MOCK_GOOGLE_CLIENT_ID = "test-google-client-id.apps.googleusercontent.com";

/**
 * All-in-one test wrapper providing the same providers as the real app.
 */
function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={MOCK_GOOGLE_CLIENT_ID}>
      <BrowserRouter>{children}</BrowserRouter>
    </GoogleOAuthProvider>
  );
}

/**
 * Custom render that wraps the component in all application providers.
 * Use this instead of @testing-library/react's render.
 */
function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { screen } from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";

// Re-export renderHook for custom hooks testing
export { renderHook, act } from "@testing-library/react";

// Override render with the custom one
export { customRender as render };
