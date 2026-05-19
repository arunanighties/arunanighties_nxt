import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { X, Phone, CheckCircle2, Loader2, User, KeyRound, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/config/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { getApiBase } from "@/lib/api-config";

type Step = "phone" | "otp" | "register" | "done";

interface UserType { id: number; phone: string; name?: string | null }

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: (user: UserType, isNew: boolean) => void;
}

const apiBase = getApiBase;

export function LoginModal({ open, onClose, onLogin }: LoginModalProps) {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [pendingUser, setPendingUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    if (open && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container-modal", {
        size: "invisible"
      });
    }
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, [open]);

  if (!open) return null;

  const reset = () => {
    setStep("phone");
    setPhone(""); setOtp(""); setName("");
    setError(""); setPendingUser(null);
    setConfirmationResult(null);
  };

  const handleClose = () => { reset(); onClose(); };

  // ── Step 1: Send OTP (Firebase) ───────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) { setError("Please enter a valid 10-digit mobile number."); return; }
    
    setLoading(true); setError("");
    try {
      const fullPhone = `+91${cleaned}`;
      const result = await signInWithPhoneNumber(auth, fullPhone, window.recaptchaVerifier);
      setConfirmationResult(result);
      setStep("otp");
      setResendTimer(30); // Start cooldown timer
    } catch (err: any) {
      console.error("Firebase Error:", err);
      setError("Failed to send OTP. Please try again.");
    } finally { setLoading(false); }
  };

  // ── Step 2: Verify OTP (Firebase -> Backend) ──────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || otp.length < 6) { setError("Please enter the complete 6-digit OTP."); return; }
    
    setLoading(true); setError("");
    try {
      const result = await confirmationResult.confirm(otp);
      const idToken = await result.user.getIdToken();
      
      const res = await fetch(`${apiBase()}/api/auth/verify-firebase-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firebaseIdToken: idToken }),
      });
      
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? "OTP verification failed."); return; }

      const { user, isNew, token, isAdmin } = body;
      
      // Save session token
      if (isAdmin) {
        localStorage.setItem("adminToken", token);
        reset();
        onClose();
        setLocation("/admin");
        return;
      }

      localStorage.setItem("userToken", token);

      if (isNew) {
        setPendingUser(user);
        setStep("register");
      } else {
        localStorage.setItem("aruna_user", JSON.stringify(user));
        onLogin(user, false);
        reset();
        onClose();
        setLocation("/");
      }
    } catch (err: any) {
      console.error("Verification Error:", err);
      setError("Incorrect OTP. Please try again.");
    } finally { setLoading(false); }
  };

  // ── Step 3: Save name (new users only) ───────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Please enter your name to complete registration."); return; }
    if (!pendingUser) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`${apiBase()}/api/users/${pendingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? "Failed to save your name."); return; }
      const updatedUser: UserType = body;
      localStorage.setItem("aruna_user", JSON.stringify(updatedUser));
      onLogin(updatedUser, true);
      reset();
      onClose();
      setLocation("/");
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  // ── Header metadata per step ──────────────────────────────────────
  const headerMeta: Record<Step, { icon: React.ReactNode; title: string; subtitle: string }> = {
    phone: {
      icon: <Phone className="w-5 h-5 text-white" />,
      title: "Login / Sign Up",
      subtitle: "Enter your mobile number to continue",
    },
    otp: {
      icon: <KeyRound className="w-5 h-5 text-white" />,
      title: "Verify OTP",
      subtitle: `OTP sent to +91 ${phone.replace(/\D/g, "")}`,
    },
    register: {
      icon: <Sparkles className="w-5 h-5 text-white" />,
      title: "Welcome!",
      subtitle: "Just one more step — tell us your name",
    },
    done: {
      icon: <CheckCircle2 className="w-5 h-5 text-white" />,
      title: "Done",
      subtitle: "",
    },
  };

  const { icon, title, subtitle } = headerMeta[step];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Pink header */}
        <div className="bg-gradient-to-r from-primary to-rose-400 px-6 py-6 text-white text-center relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-white/30">
            {icon}
          </div>
          <h2 className="font-serif text-xl font-bold">{title}</h2>
          <p className="text-white/75 text-xs mt-0.5">{subtitle}</p>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {(["phone", "otp", "register"] as Step[]).map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === s
                    ? "w-5 bg-white"
                    : i < ["phone", "otp", "register"].indexOf(step)
                    ? "w-1.5 bg-white/60"
                    : "w-1.5 bg-white/25"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-6 py-6">

          {/* ── Step 1: Phone ── */}
          {step === "phone" && (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1.5">
                  Mobile Number
                </label>
                <div className="flex items-center border border-pink-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 bg-pink-50">
                  <span className="px-3 text-rose-400 font-semibold text-sm border-r border-pink-200 py-3.5 flex-shrink-0 bg-pink-100/60">
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="Enter 10-digit mobile number"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setError(""); }}
                    className="flex-1 px-3 py-3.5 text-sm bg-transparent outline-none text-rose-900 placeholder:text-rose-300"
                    maxLength={10}
                    autoFocus
                    required
                  />
                </div>
              </div>

              {error && <ErrorBox msg={error} />}

              <Button
                type="submit"
                disabled={loading || phone.replace(/\D/g, "").length < 10}
                className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12 font-semibold text-sm"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending OTP…</>
                  : "Send OTP →"}
              </Button>
            </form>
          )}

          {/* ── Step 2: OTP ── */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => { setStep("phone"); setError(""); setOtp(""); }}
                className="flex items-center gap-1 text-xs text-rose-400 hover:text-primary transition-colors w-fit"
              >
                <ArrowLeft className="w-3 h-3" /> Change number
              </button>

              <div>
                <label className="block text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1.5">
                  Enter 6-digit OTP
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
                  maxLength={6}
                  autoFocus
                  className="w-full border border-pink-200 rounded-xl px-4 py-3.5 text-center text-2xl font-bold tracking-[0.5em] bg-pink-50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-rose-800 placeholder:text-rose-200 placeholder:tracking-normal"
                  required
                />
              </div>

              {error && <ErrorBox msg={error} />}

              <Button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12 font-semibold text-sm"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Verifying…</>
                  : "Verify & Continue →"}
              </Button>

              {resendTimer > 0 ? (
                <p className="text-xs text-center text-rose-300/60 font-medium">
                  Resend OTP in {resendTimer}s
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendOtp(new Event('submit') as any)}
                  disabled={loading}
                  className="text-xs text-center text-rose-400 hover:text-primary hover:underline transition-colors disabled:opacity-50 font-medium"
                >
                  Didn't receive OTP? Resend
                </button>
              )}
            </form>
          )}

          {/* ── Step 3: Name (new users only) ── */}
          {step === "register" && (
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-none" />
                <p className="text-xs font-semibold text-green-700">Phone verified! Now let's set up your account.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1.5">
                  Your Name
                </label>
                <div className="flex items-center border border-pink-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 bg-pink-50">
                  <User className="ml-3 w-4 h-4 text-rose-300 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(""); }}
                    className="flex-1 px-3 py-3.5 text-sm bg-transparent outline-none text-rose-900 placeholder:text-rose-300"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {error && <ErrorBox msg={error} />}

              <Button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12 font-semibold text-sm"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating account…</>
                  : "Complete Registration →"}
              </Button>
            </form>
          )}

          <p className="text-xs text-center text-muted-foreground mt-4">
            By continuing, you agree to our{" "}
            <span className="text-primary underline cursor-pointer">Terms</span> and{" "}
            <span className="text-primary underline cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </div>
      <div id="recaptcha-container-modal"></div>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <p className="text-xs text-destructive bg-red-50 border border-red-200 rounded-lg px-3 py-2">
      {msg}
    </p>
  );
}

interface LoginSuccessToastProps {
  user: UserType;
  isNew: boolean;
}

export function LoginSuccessToast({ user, isNew }: LoginSuccessToastProps) {
  return (
    <div className="flex items-center gap-3">
      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
      <div>
        <p className="font-semibold text-sm">
          {isNew ? `Welcome, ${user.name || "there"}! 🎉` : `Welcome back, ${user.name || user.phone}!`}
        </p>
        <p className="text-xs text-muted-foreground">+91 {user.phone}</p>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}
