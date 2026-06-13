import { Navigate } from "react-router-dom";
import { getFlowPreference, flowPath } from "@/lib/flow-preference";
import { FlowGatewayPage } from "./FlowGatewayPage";
import { WelcomeShell } from "@/templates/WelcomeShell";

export function AppHomePage() {
  const flow = getFlowPreference();
  if (flow) return <Navigate to={flowPath(flow)} replace />;
  return (
    <WelcomeShell>
      <FlowGatewayPage />
    </WelcomeShell>
  );
}
