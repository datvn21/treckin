import { type ReactNode } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";

interface GoogleAuthProviderWrapperProps {
  children: ReactNode;
}

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

/**
 * Application-level Google OAuth wrapper.
 * Reads `VITE_GOOGLE_CLIENT_ID` from the Vite env and provides the
 * Google OAuth context to the entire component tree.
 */
export function GoogleAuthProvider({ children }: GoogleAuthProviderWrapperProps) {
  if (!clientId) {
    console.warn(
      "[GoogleAuthProvider] VITE_GOOGLE_CLIENT_ID is not set. Google SSO will not work.",
    );
  }

  return <GoogleOAuthProvider clientId={clientId ?? ""}>{children}</GoogleOAuthProvider>;
}
