import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import BotListPage from "./pages/BotListPage";
import BotEditPage from "./pages/BotEditPage";
import BotMessagesPage from "./pages/BotMessagesPage";
import WorkspaceListPage from "./pages/WorkspaceListPage";
import WorkspacePage from "./pages/WorkspacePage";
import NotFound from "./pages/NotFound";
import CertificationsPage from "./pages/CertificationsPage";
import CertificateTemplatePage from "./pages/CertificateTemplatePage";
import CertificateIssuePage from "./pages/CertificateIssuePage";
import VerifyPage from "./pages/VerifyPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/admin/workspaces" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/admin/workspaces"
              element={
                <ProtectedRoute>
                  <WorkspaceListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/workspaces/:id"
              element={
                <ProtectedRoute>
                  <WorkspacePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/bots"
              element={
                <ProtectedRoute>
                  <BotListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/bots/:id/edit"
              element={
                <ProtectedRoute>
                  <BotEditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/bots/:id/messages"
              element={
                <ProtectedRoute>
                  <BotMessagesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/certificaciones"
              element={
                <ProtectedRoute>
                  <CertificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/certificaciones/plantilla/:id"
              element={
                <ProtectedRoute>
                  <CertificateTemplatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/certificaciones/emitir/:templateId"
              element={
                <ProtectedRoute>
                  <CertificateIssuePage />
                </ProtectedRoute>
              }
            />
            <Route path="/verify/:id" element={<VerifyPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
