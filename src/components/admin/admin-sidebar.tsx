import { 
  LayoutDashboard, BarChart3, Package, Tag, ShoppingCart, 
  Layers, Settings, LogOut 
} from "lucide-react";

export type Tab = "overview" | "reports" | "inventory" | "products" | "orders" | "collections" | "sections" | "settings" | "lowstock";

interface AdminSidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onLogout: () => void;
}

export default function AdminSidebar({ activeTab, setActiveTab, onLogout }: AdminSidebarProps) {
  const navItems: { id: Tab; label: string; icon: any }[] = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "products", label: "Products", icon: Tag },
    { id: "orders", label: "Orders", icon: ShoppingCart },
    { id: "collections", label: "Collections", icon: Tag },
    { id: "sections", label: "Sections", icon: Layers },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-pink-100 shadow-sm h-screen fixed left-0 top-0 z-20">
      <div className="p-6 border-b border-pink-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm overflow-hidden border border-pink-100">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain p-1" />
          </div>
          <div>
            <p className="font-serif font-bold text-rose-900 text-sm leading-tight">Admin Panel</p>
            <p className="text-xs text-rose-400">Aruna Nighties</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button 
            key={id} 
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === id 
                ? "bg-primary text-white shadow-sm shadow-rose-200" 
                : "text-rose-700 hover:bg-pink-50"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-pink-100">
        <button 
          onClick={onLogout} 
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-pink-50 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </aside>
  );
}
