import { Link, NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { Camera, Home, LayoutDashboard, Leaf, LogOut, Menu, User, X, BookOpen, History as HistoryIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type NavItem = { to: string; label: string; icon: typeof Home; show: "always" | "auth" | "admin" };

const allNavItems: NavItem[] = [
  { to: "/", label: "Beranda", icon: Home, show: "always" },
  { to: "/scan", label: "Klasifikasi", icon: Camera, show: "always" },
  { to: "/history", label: "Riwayat", icon: HistoryIcon, show: "auth" },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: "admin" },
  { to: "/profile", label: "Profil", icon: User, show: "auth" },
  { to: "/ensiklopedia", label: "Ensiklopedia", icon: BookOpen, show: "always" },
];

export const Header = () => {
  const [open, setOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();


  
  useEffect(() => {
    const checkRole = async (userId: string | undefined) => {
      if (!userId) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id",userId)
        .maybeSingle();
      const userData = data as { role?: string } | null;
      setIsAdmin(userData?.role === "admin");
    };

    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      setIsAuthenticated(Boolean(user));
      checkRole(user?.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
      checkRole(session?.user?.id);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(error.message);
    else toast.success("Berhasil logout.");
  };

  const visibleItems = allNavItems.filter((item) => {
    if (item.show === "always") return true;
    if (item.show === "auth") return isAuthenticated;
    if (item.show === "admin") return isAdmin;
    return false;
  });

  // Bottom nav (mobile): pick up to 5 most relevant
  const bottomNav: NavItem[] = [
    allNavItems[0], // Beranda
    allNavItems[1], // Scan
    ...(isAuthenticated ? [allNavItems[2]] : []), // Riwayat
    ...(isAdmin ? [allNavItems[3]] : []), // Dashboard
    isAuthenticated ? allNavItems[4] : allNavItems[5], // Profil atau Ensiklopedia
  ].slice(0, 5);

  const bottomNavCols =
    bottomNav.length === 5
      ? "grid-cols-5"
      : bottomNav.length === 4
      ? "grid-cols-4"
      : "grid-cols-3";

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-leaf shadow-soft transition-transform group-hover:rotate-12">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">
              Nyakwit
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {visibleItems.map((item) => (
              <RouterNavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
                  )
                }
              >
                {item.label}
              </RouterNavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link to="/auth"><User className="h-4 w-4" /> Login</Link>
              </Button>
            )}
            <Button asChild variant="hero" size="sm">
              <Link to="/scan">Mulai Analisa</Link>
            </Button>
          </div>

          {/* Mobile login/logout shortcut + menu */}
          <div className="flex md:hidden items-center gap-1">
            {isAuthenticated ? (
              <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            ) : (
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth" aria-label="Login"><User className="h-4 w-4" /></Link>
              </Button>
            )}
            <button
              className="p-2 rounded-full hover:bg-accent"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-border/40 bg-background animate-fade-up">
            <nav className="container flex flex-col gap-1 py-3">
              {visibleItems.map((item) => (
                <RouterNavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent/60",
                    )
                  }
                >
                  {item.label}
                </RouterNavLink>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Bottom nav for mobile */}
      <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-border/40 bg-background/95 backdrop-blur-lg">
        <ul className={`grid ${bottomNavCols}`}>
          {bottomNav.map((item) => {
            const Icon = item.icon;
            const isActive = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                    isActive ? "text-primary-deep" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive && "scale-110")} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
};
