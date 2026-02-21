import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile.tsx";
import { useTheme } from "@/contexts/ThemeContext";
import { usePermissions } from "@/hooks/usePermissions";
import {
  BarChart3, Calendar, Car, LogOut, Menu, Moon, Sun, Upload, Users, X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const menuItems = [
  { icon: BarChart3, label: "Dashboard",   path: "/",              adminOnly: false },
  { icon: Car,       label: "Estoque",      path: "/estoque",       adminOnly: false },
  { icon: Calendar, label: "Programação",  path: "/programacao",   adminOnly: false },
  { icon: Upload,   label: "Importação",   path: "/importacao",    adminOnly: true },
  { icon: Users,    label: "Colaboradores", path: "/colaboradores", adminOnly: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-sm w-full">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center mb-2">
              <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663029800535/kQdbGGvzssQCloXE.png" alt="Covezi Iveco" className="h-14 w-auto object-contain" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-center text-foreground">
              Gestão de Estoque
            </h1>
            <p className="text-sm text-muted-foreground text-center">
              Faça login para acessar o sistema de gestão de veículos.
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full"
          >
            Entrar no Sistema
          </Button>
        </div>
      </div>
    );
  }

  return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { canEdit } = usePermissions();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close sidebar on navigation
  const navigate = (path: string) => {
    setLocation(path);
    setSidebarOpen(false);
  };

  // Close sidebar on outside click
  useEffect(() => {
    if (!sidebarOpen) return;
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sidebarOpen]);

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, sidebarOpen]);

  const visibleMenuItems = menuItems.filter(item => !item.adminOnly || canEdit);
  const activeItem = visibleMenuItems.find(
    item => item.path === location || (item.path !== "/" && location.startsWith(item.path))
  );

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  /* ── MOBILE LAYOUT ─────────────────────────────────────────────────────── */
  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        {/* Mobile Top Header */}
        <header className="sticky top-0 z-40 h-14 flex items-center justify-between px-4 bg-background border-b-2 border-border shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="h-9 w-9 flex items-center justify-center rounded-lg border-2 border-border hover:bg-accent transition-colors"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663029800535/kQdbGGvzssQCloXE.png" alt="Covezi Iveco" className="h-7 w-auto object-contain" />
              <span className="font-semibold text-sm text-foreground">
                {activeItem?.label ?? "Covezi Iveco"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="h-9 w-9 flex items-center justify-center rounded-lg border-2 border-border hover:bg-accent transition-colors"
              aria-label="Alternar tema"
            >
              {theme === "dark"
                ? <Sun className="w-4 h-4 text-amber-400" />
                : <Moon className="w-4 h-4 text-primary" />
              }
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-9 w-9 flex items-center justify-center rounded-lg border-2 border-border hover:bg-accent transition-colors">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs font-bold bg-primary/15 text-primary border border-primary/30">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-3 py-2">
                  <p className="text-xs font-semibold text-foreground truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive gap-2">
                  <LogOut className="h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Overlay */}
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Slide-in Sidebar */}
        <div
          ref={sidebarRef}
          className={`fixed top-0 left-0 h-full w-72 z-50 bg-sidebar border-r-2 border-sidebar-border flex flex-col transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          {/* Sidebar Header */}
          <div className="h-14 flex items-center justify-between px-4 border-b-2 border-sidebar-border">
            <div className="flex items-center gap-2">
              <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663029800535/kQdbGGvzssQCloXE.png" alt="Covezi Iveco" className="h-8 w-auto object-contain" />
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors border border-sidebar-border"
            >
              <X className="w-4 h-4 text-sidebar-foreground" />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {visibleMenuItems.map(item => {
              const isActive = item.path === location || (item.path !== "/" && location.startsWith(item.path));
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all text-left border ${
                    isActive
                      ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent border-transparent hover:border-sidebar-border"
                  }`}
                >
                  <item.icon className={`w-5 h-5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User Footer */}
          <div className="p-3 border-t-2 border-sidebar-border">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent border border-sidebar-border">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs font-bold bg-primary/15 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-sidebar-foreground truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-2 w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors border border-transparent hover:border-destructive/20"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>

        {/* Main Content — padded bottom for bottom nav */}
        <main className="flex-1 p-4 mb-safe overflow-x-hidden">
          {children}
        </main>

        {/* Bottom Navigation */}
        <nav className="mobile-bottom-nav">
          {visibleMenuItems.map(item => {
            const isActive = item.path === location || (item.path !== "/" && location.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`mobile-bottom-nav-item ${isActive ? "active" : ""}`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  /* ── DESKTOP LAYOUT ────────────────────────────────────────────────────── */
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col bg-sidebar border-r-2 border-sidebar-border sticky top-0 h-screen overflow-y-auto">
        {/* Logo */}
        <div className="h-16 flex items-center justify-center px-4 border-b-2 border-sidebar-border">
          <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663029800535/kQdbGGvzssQCloXE.png" alt="Covezi Iveco" className="h-10 w-auto object-contain" />
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {visibleMenuItems.map(item => {
            const isActive = item.path === location || (item.path !== "/" && location.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left border ${
                  isActive
                    ? "bg-primary/10 text-primary border-primary/25"
                    : "text-sidebar-foreground hover:bg-sidebar-accent border-transparent hover:border-sidebar-border/50"
                }`}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t-2 border-sidebar-border space-y-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent border border-transparent hover:border-sidebar-border/50 transition-all"
          >
            {theme === "dark"
              ? <><Sun className="w-4 h-4 text-amber-400" /><span>Modo Claro</span></>
              : <><Moon className="w-4 h-4 text-primary" /><span>Modo Escuro</span></>
            }
          </button>

          {/* User */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent border border-transparent hover:border-sidebar-border/50 transition-all text-left">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-xs font-bold bg-primary/15 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-sidebar-foreground truncate leading-none">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48">
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive gap-2">
                <LogOut className="h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 p-6 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
