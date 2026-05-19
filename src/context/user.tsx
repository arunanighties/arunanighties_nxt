import { createContext, useContext, useState, ReactNode } from "react";
import { LoginModal, LoginSuccessToast } from "@/components/login-modal";
import { useToast } from "@/hooks/use-toast";

export interface UserType { id: number; phone: string; name?: string | null }

interface UserContextType {
  user: UserType | null;
  openLogin: () => void;
  handleLogout: () => void;
  handleLogin: (u: UserType, isNew: boolean) => void;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUserState] = useState<UserType | null>(() => {
    try {
      const stored = localStorage.getItem("aruna_user");
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [loginOpen, setLoginOpen] = useState(false);

  const persistUser = (u: UserType | null) => {
    setUserState(u);
    if (u) localStorage.setItem("aruna_user", JSON.stringify(u));
    else localStorage.removeItem("aruna_user");
  };

  const openLogin = () => setLoginOpen(true);

  const handleLogout = () => {
    persistUser(null);
    toast({ title: "Signed out successfully." });
  };

  const handleLogin = (u: UserType, isNew: boolean) => {
    persistUser(u);
    setLoginOpen(false);
    toast({
      description: <LoginSuccessToast user={u} isNew={isNew} />,
      duration: 3500,
    });
  };

  return (
    <UserContext.Provider value={{ user, openLogin, handleLogout, handleLogin }}>
      {children}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onLogin={handleLogin} />
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}
