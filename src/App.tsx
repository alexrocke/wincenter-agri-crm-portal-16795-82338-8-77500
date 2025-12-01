import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
// removed TooltipProvider import
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { useSiteSettings } from "@/hooks/useSiteSettings";

import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/admin/Dashboard";
import Reports from "./pages/admin/Reports";
import Products from "./pages/admin/Products";
import Goals from "./pages/admin/Goals";
import CompanyCosts from "./pages/admin/CompanyCosts";
import CommissionRules from "./pages/admin/CommissionRules";
import AdminCommissions from "./pages/admin/Commissions";
import AdminSales from "./pages/admin/Sales";
import UsersInvites from "./pages/admin/UsersInvites";
import SiteSettings from "./pages/admin/SiteSettings";
import AdminNotifications from "./pages/admin/Notifications";
import InternalStock from "./pages/admin/InternalStock";
import ServiceCatalog from "./pages/admin/ServiceCatalog";
import Notifications from "./pages/Notifications";
import SellerDashboard from "./pages/seller/Dashboard";
import Clients from "./pages/seller/Clients";
import Opportunities from "./pages/seller/Opportunities";
import Sales from "./pages/seller/Sales";
import Commissions from "./pages/seller/Commissions";
import Visits from "./pages/seller/Visits";
import Services from "./pages/seller/Services";
import DemonstrationsNew from "./pages/seller/DemonstrationsNew";
import TechnicalSupport from "./pages/seller/TechnicalSupport";
import SellerProducts from "./pages/seller/Products";
import Tasks from "./pages/seller/Tasks";
import NotFound from "./pages/NotFound";

// Simplified mobile pages
import SimplifiedDashboard from "./pages/seller/simple/Dashboard";
import SimplifiedBudgets from "./pages/seller/simple/Budgets";
import SimplifiedSales from "./pages/seller/simple/Sales";
import SimplifiedClients from "./pages/seller/simple/Clients";
import SimplifiedProducts from "./pages/seller/simple/Products";
import SimplifiedVisits from "./pages/seller/simple/Visits";
import SimplifiedServices from "./pages/seller/simple/Services";
import SimplifiedDemonstrations from "./pages/seller/simple/Demonstrations";
import SimplifiedTechnicalSupport from "./pages/seller/simple/TechnicalSupport";
import SimplifiedTasks from "./pages/seller/simple/Tasks";
import SimplifiedNotifications from "./pages/seller/simple/Notifications";

const queryClient = new QueryClient();

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { loading } = useSiteSettings();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <Sonner />
    <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Navigate to="/seller/dashboard" replace />} />
            
            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <AdminRoute>
                  <Reports />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/products"
              element={
                <AdminRoute>
                  <Products />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/goals"
              element={
                <AdminRoute>
                  <Goals />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/company-costs"
              element={
                <AdminRoute>
                  <CompanyCosts />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/commission-rules"
              element={
                <AdminRoute>
                  <CommissionRules />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/commissions"
              element={
                <AdminRoute>
                  <AdminCommissions />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/sales"
              element={
                <AdminRoute>
                  <AdminSales />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users-invites"
              element={
                <AdminRoute>
                  <UsersInvites />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/site-settings"
              element={
                <AdminRoute>
                  <SiteSettings />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/notifications"
              element={
                <AdminRoute>
                  <AdminNotifications />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/internal-stock"
              element={
                <AdminRoute>
                  <InternalStock />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/service-catalog"
              element={
                <AdminRoute>
                  <ServiceCatalog />
                </AdminRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            
            {/* Seller Routes */}
            <Route
              path="/seller/dashboard"
              element={
                <ProtectedRoute>
                  <SellerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/clients"
              element={
                <ProtectedRoute>
                  <Clients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/opportunities"
              element={
                <ProtectedRoute>
                  <Opportunities />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/products"
              element={
                <ProtectedRoute>
                  <SellerProducts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/sales"
              element={
                <ProtectedRoute>
                  <Sales />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/commissions"
              element={
                <ProtectedRoute>
                  <Commissions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/visits"
              element={
                <ProtectedRoute>
                  <Visits />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/services"
              element={
                <ProtectedRoute>
                  <Services />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/demonstrations"
              element={
                <ProtectedRoute>
                  <DemonstrationsNew />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/technical-support"
              element={
                <ProtectedRoute>
                  <TechnicalSupport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/tasks"
              element={
                <ProtectedRoute>
                  <Tasks />
                </ProtectedRoute>
              }
            />
            
            {/* Simplified Mobile Routes */}
            <Route
              path="/seller/simple/dashboard"
              element={
                <ProtectedRoute>
                  <SimplifiedDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/simple/budgets"
              element={
                <ProtectedRoute>
                  <SimplifiedBudgets />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/simple/sales"
              element={
                <ProtectedRoute>
                  <SimplifiedSales />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/simple/clients"
              element={
                <ProtectedRoute>
                  <SimplifiedClients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/simple/products"
              element={
                <ProtectedRoute>
                  <SimplifiedProducts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/simple/visits"
              element={
                <ProtectedRoute>
                  <SimplifiedVisits />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/simple/services"
              element={
                <ProtectedRoute>
                  <SimplifiedServices />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/simple/demonstrations"
              element={
                <ProtectedRoute>
                  <SimplifiedDemonstrations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/simple/technical-support"
              element={
                <ProtectedRoute>
                  <SimplifiedTechnicalSupport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/simple/tasks"
              element={
                <ProtectedRoute>
                  <SimplifiedTasks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/simple/notifications"
              element={
                <ProtectedRoute>
                  <SimplifiedNotifications />
                </ProtectedRoute>
              }
            />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
  </QueryClientProvider>
);

export default App;
