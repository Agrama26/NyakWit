import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import Index from "@/pages/Index";
import Scan from "@/pages/Scan";
import Ensiklopedia from "@/pages/Ensiklopedia";
import Dashboard from "@/pages/Dashboard";
import History from "@/pages/History";
import Profile from "@/pages/Profile";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";

// ─── State autentikasi ────────────────────────────────────────────────────────
type AuthState = "loading" | "unauthenticated" | "user" | "admin";

function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>("loading");

  useEffect(() => {
    let mounted = true;

    const resolve = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (!mounted) return;

        if (!user) {
          setState("unauthenticated");
          return;
        }

        // Query tabel users untuk cek role
        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          // Jika query gagal (misal RLS belum fix), tetap set sebagai "user"
          // agar tidak stuck di loading
          console.error("Error fetching role:", error.message);
          setState("user");
          return;
        }

        const userData = data as { role?: string } | null;
        const isAdmin = userData?.role === "admin";
        setState(isAdmin ? "admin" : "user");
      } catch (err) {
        console.error("Auth resolve error:", err);
        if (mounted) setState("user");
      }
    };

    resolve();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        if (!session) {
          setState("unauthenticated");
          return;
        }
        // Reset ke loading sementara ambil role baru
        setState("loading");
        resolve();
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return state;
}

// ─── Loading fullscreen ───────────────────────────────────────────────────────
function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Memeriksa sesi...</p>
      </div>
    </div>
  );
}

// ─── Guard components ─────────────────────────────────────────────────────────
interface GuardProps {
  authState: AuthState;
  children: React.ReactNode;
}

/** Wajib login. Belum login → /auth */
function ProtectedRoute({ authState, children }: GuardProps) {
  const location = useLocation();
  if (authState === "loading") return <AuthLoading />;
  if (authState === "unauthenticated")
    return <Navigate to="/auth" state={{ from: location }} replace />;
  return <>{children}</>;
}

/** Wajib admin. User biasa → /history. Belum login → /auth */
function AdminRoute({ authState, children }: GuardProps) {
  const location = useLocation();
  if (authState === "loading") return <AuthLoading />;
  if (authState === "unauthenticated")
    return <Navigate to="/auth" state={{ from: location }} replace />;
  if (authState === "user")
    return <Navigate to="/history" replace />;
  return <>{children}</>;
}

/** Halaman auth — kalau sudah login redirect ke tujuan yang tepat */
function GuestRoute({ authState, children }: GuardProps) {
  if (authState === "loading") return <AuthLoading />;
  if (authState === "admin") return <Navigate to="/dashboard" replace />;
  if (authState === "user") return <Navigate to="/history" replace />;
  return <>{children}</>;
}

// ─── Routes ───────────────────────────────────────────────────────────────────
function AppRoutes() {
  const authState = useAuthState();

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Index />} />
      <Route path="/scan" element={<Scan />} />
      <Route path="/ensiklopedia" element={<Ensiklopedia />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Guest only (tidak boleh diakses kalau sudah login) */}
      <Route
        path="/auth"
        element={
          <GuestRoute authState={authState}>
            <Auth />
          </GuestRoute>
        }
      />

      {/* Protected — harus login */}
      <Route
        path="/history"
        element={
          <ProtectedRoute authState={authState}>
            <History />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute authState={authState}>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* Admin only */}
      <Route
        path="/dashboard"
        element={
          <AdminRoute authState={authState}>
            <Dashboard />
          </AdminRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 * 5 } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;