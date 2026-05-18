import * as React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/dashboard/Dashboard";
import Settings from "./pages/settings/Settings";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/auth/ForgotPassword";
import UpdatePassword from "./pages/auth/UpdatePassword";
import ManagementReports from "./pages/reports/ManagementReports";
import SalesReport from "./pages/reports/SalesReport";
import VendorsReport from "./pages/reports/VendorsReport";
import { AuthProvider } from "./contexts/auth";
import { RealtimeProvider } from "./contexts/realtimeContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import CRM from "./pages/crm/CRM";
import Conexoes from "./pages/channels/Conexoes";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <Routes>
              {/* Rotas públicas */}
              <Route path="login" element={<Login />} />
              <Route path="signup" element={<Signup />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="update-password" element={<UpdatePassword />} />

              <Route path="*" element={<NotFound />} />

              {/* Rotas protegidas */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <RealtimeProvider>
                      <AppLayout />
                    </RealtimeProvider>
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />

                <Route path="dashboard" element={<Dashboard />} />

                <Route path="crm" element={<CRM />} />
                <Route path="contatos" element={<Navigate to="/crm" replace />} />

                <Route path="relatorios-gerenciais" element={<ManagementReports />} />
                <Route path="relatorios-gerenciais/vendas" element={<SalesReport />} />
                <Route path="relatorios-gerenciais/vendedores" element={<VendorsReport />} />

                <Route path="settings" element={<Settings />} />

                <Route path="conexoes" element={<Conexoes />} />
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
