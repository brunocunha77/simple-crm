import React from "react";
import { NavLink } from "react-router-dom";
import {
  Settings,
  Home,
  LogOut,
  Users,
  Zap,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";
import { LogoPersonalizada } from "@/components/LogoPersonalizada";

type NavItemProps = {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
  show?: boolean;
  disabled?: boolean;
  blocked?: boolean;
};

const NavItem = ({
  to,
  icon: Icon,
  label,
  end = false,
  show = true,
  disabled = false,
  blocked = false,
}: NavItemProps) => {
  if (!show) return null;

  if (disabled || blocked) {
    return (
      <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 cursor-not-allowed opacity-50">
        <Icon className="h-5 w-5" />
        <span>{label}</span>
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-primary-200 dark:hover:bg-primary-700/50",
          isActive
            ? "bg-primary-300 text-primary-800 dark:bg-primary-700 dark:text-primary-100"
            : "text-primary-600 dark:text-primary-200"
        )
      }
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </NavLink>
  );
};

export default function Sidebar() {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast.error("Erro ao fazer logout");
    }
  };

  return (
    <div id="app-sidebar" className="w-64 h-screen bg-white dark:bg-sidebar fixed left-0 top-0 flex flex-col border-r border-primary-200 dark:border-primary-800">
      <div className="flex-shrink-0 p-4 border-b border-primary-200 dark:border-primary-800 bg-gray-50 dark:bg-gray-800">
        <div className="w-full h-20 flex items-center justify-center">
          <LogoPersonalizada className="max-h-full max-w-full object-contain" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <nav className="space-y-1">
          <NavItem to="/dashboard" icon={Home} label="Dashboard" />
          <NavItem to="/crm" icon={Users} label="CRM" />
          <NavItem to="/relatorios-gerenciais" icon={TrendingUp} label="Relatórios Gerenciais" />
          <NavItem to="/conexoes" icon={Zap} label="Conectar Aplicativos" />
          <NavItem to="/settings" icon={Settings} label="Configurações" />
        </nav>
      </div>

      <div className="flex-shrink-0 p-4 border-t border-primary-200 dark:border-primary-800">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20"
        >
          <LogOut className="h-5 w-5" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}
