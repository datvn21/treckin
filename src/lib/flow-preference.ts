export type AppFlow = "attendee" | "organizer";

export const FLOW_STORAGE_KEY = "treckin-flow";

export function getFlowPreference(): AppFlow | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(FLOW_STORAGE_KEY);
  return value === "attendee" || value === "organizer" ? value : null;
}

export function setFlowPreference(flow: AppFlow) {
  window.localStorage.setItem(FLOW_STORAGE_KEY, flow);
}

export function clearFlowPreference() {
  window.localStorage.removeItem(FLOW_STORAGE_KEY);
}

export function flowPath(flow: AppFlow) {
  return flow === "attendee" ? "/app/join" : "/app/workspaces";
}
