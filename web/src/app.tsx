import { Navigate, Route, Routes } from "react-router";
import { AdminLayout } from "./layouts/admin-layout";
import { AppLayout } from "./layouts/app-layout";
import { AuthLayout } from "./layouts/auth-layout";
import { AdminDashboard } from "./pages/admin-dashboard.page";
import { CommunitiesListPage } from "./pages/communities-list.page";
import { CommunitiesManagementPage } from "./pages/communities-management.page";
import { CommunityChatPage } from "./pages/community-chat.page";
import { CommunityDetailsPage } from "./pages/community-details.page";
import { CommunityFormPage } from "./pages/community-form.page";
import { CommunityMembersPage } from "./pages/community-members.page";
import { CommunityResourcesPage } from "./pages/community-resources.page";
import { ConversationPage } from "./pages/conversation.page";
import { DashboardPage } from "./pages/dashboard.page";
import { DirectMessagesPage } from "./pages/direct-messages.page";
import { LoginPage } from "./pages/login.page";
import { NotFoundPage } from "./pages/not-found.page";
import { NotificationsPage } from "./pages/notifications.page";
import { ProfilePage } from "./pages/profile.page";
import { RegisterPage } from "./pages/register.page";
import { ReportsPage } from "./pages/reports.page";
import { ResourceDetailsPage } from "./pages/resource-details.page";
import { ResourcesManagementPage } from "./pages/resources-management.page";
import { UploadResourcePage } from "./pages/upload-resource.page";
import { UsersManagementPage } from "./pages/users-management.page";
import { EventsManagementPage } from "./pages/events-management.page";
import { StudentEventsPage } from "./pages/student-events.page";
import { ModerationManagementPage } from "./pages/moderation-management.page";
import { AnnouncementsManagementPage } from "./pages/announcements-management.page";
import { AnalyticsDashboardPage } from "./pages/analytics-dashboard.page";
import { SystemSettingsPage } from "./pages/settings.page";
import { AdminProfilePage } from "./pages/admin-profile.page";
import { ConnectionsResourcesPage } from "./pages/connections-resources.page";
import { StudentSettingsPage } from "./pages/student-settings.page";
import { ProtectedRoute } from "./routes/protected-route";
import { PublicRoute } from "./routes/public-route";
import { ErrorBoundary } from "./components/error-boundary";
import { useAuthStore } from "./store/auth.store";

import { ToastContainer } from "./components/toast-container";

function RootRedirect() {
  const user = useAuthStore((state) => state.user);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={user.role === "ADMIN" ? "/admin" : "/dashboard"} replace />;
}

export function App() {
  return (
    <ErrorBoundary>
    <Routes>
      <Route element={<PublicRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/communities" element={<CommunitiesListPage />} />
          <Route path="/communities/new" element={<CommunityFormPage mode="create" />} />
          <Route path="/communities/:id" element={<CommunityDetailsPage />} />
          <Route path="/communities/:id/chat" element={<CommunityChatPage />} />
          <Route path="/communities/:id/edit" element={<CommunityFormPage mode="edit" />} />
          <Route path="/communities/:id/members" element={<CommunityMembersPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/direct-messages" element={<DirectMessagesPage />} />
          <Route path="/direct-messages/:conversationId" element={<DirectMessagesPage />} />
          <Route path="/communities/:id/resources" element={<CommunityResourcesPage />} />
          <Route path="/communities/:id/resources/upload" element={<UploadResourcePage />} />
          <Route path="/communities/:id/resources/:resourceId" element={<ResourceDetailsPage />} />
          <Route path="/events" element={<StudentEventsPage />} />
          <Route path="/connections-resources" element={<ConnectionsResourcesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<StudentSettingsPage />} />
        </Route>

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UsersManagementPage />} />
          <Route path="communities" element={<CommunitiesManagementPage />} />
          <Route path="resources" element={<ResourcesManagementPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="events" element={<EventsManagementPage />} />
          <Route path="moderation" element={<ModerationManagementPage />} />
          <Route path="announcements" element={<AnnouncementsManagementPage />} />
          <Route path="analytics" element={<AnalyticsDashboardPage />} />
          <Route path="settings" element={<SystemSettingsPage />} />
          <Route path="profile" element={<AdminProfilePage />} />
        </Route>
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    <ToastContainer />
    </ErrorBoundary>
  );
}
