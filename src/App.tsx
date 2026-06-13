import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GoogleAuthProvider } from "@/components/auth/GoogleAuthProvider";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { LoginPage } from "@/pages/LoginPage";
import { AppHomePage } from "@/pages/AppHomePage";
import { FlowGatewayPage } from "@/pages/FlowGatewayPage";
import { JoinEventPage } from "@/pages/JoinEventPage";
import { MyEventsPage } from "@/pages/MyEventsPage";
import { EventDetailPage } from "@/pages/EventDetailPage";
import { WorkspacesPage } from "@/pages/WorkspacesPage";
import { WorkspaceDetailPage } from "@/pages/WorkspaceDetailPage";
import { CreateEventPage } from "@/pages/CreateEventPage";
import { EventManagePage } from "@/pages/EventManagePage";
import { ScannerBoard } from "@/pages/ScannerBoard";
import { ProfilePage } from "@/pages/ProfilePage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { AppShell } from "@/templates/AppShell";

export function App() {
  return (
    <GoogleAuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/home" element={<Navigate to="/app" replace />} />

          {/* Authenticated Application Shell */}
          <Route
            path="/app"
            element={
              <AuthGuard>
                <AppShell />
              </AuthGuard>
            }
          >
            {/* Flow gateway / resolver */}
            <Route index element={<AppHomePage />} />
            <Route path="home" element={<FlowGatewayPage />} />
            <Route path="join" element={<JoinEventPage />} />

            {/* Attendee Perspective */}
            <Route path="events" element={<MyEventsPage />} />
            <Route path="events/:id" element={<EventDetailPage />} />

            {/* Organizer Perspective */}
            <Route path="workspaces" element={<WorkspacesPage />} />
            <Route path="workspaces/:id" element={<WorkspaceDetailPage />} />
            <Route path="workspaces/:id/events/create" element={<CreateEventPage />} />
            <Route path="events/:id/manage" element={<EventManagePage />} />

            {/* User Profile & Preferences */}
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          <Route
            path="/join/:code"
            element={
              <AuthGuard>
                <AppShell />
              </AuthGuard>
            }
          >
            <Route index element={<JoinEventPage />} />
          </Route>

          {/* Full Screen Scanner Mode (No Shell) */}
          <Route
            path="/staff/scanner/:eventId/:boardId"
            element={
              <AuthGuard>
                <ScannerBoard />
              </AuthGuard>
            }
          />

          {/* 404 Page (Must be last) */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </GoogleAuthProvider>
  );
}
