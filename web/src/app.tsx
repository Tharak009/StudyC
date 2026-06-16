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
import { ProtectedRoute } from "./routes/protected-route";
import { PublicRoute } from "./routes/public-route";

export function App() {
  return (
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
          <Route path="/direct-messages/:conversationId" element={<ConversationPage />} />
          <Route path="/communities/:id/resources" element={<CommunityResourcesPage />} />
          <Route path="/communities/:id/resources/upload" element={<UploadResourcePage />} />
          <Route path="/communities/:id/resources/:resourceId" element={<ResourceDetailsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UsersManagementPage />} />
            <Route path="communities" element={<CommunitiesManagementPage />} />
            <Route path="resources" element={<ResourcesManagementPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
