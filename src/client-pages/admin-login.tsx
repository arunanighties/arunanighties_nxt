import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Phone, ShieldCheck, ArrowLeft } from "lucide-react";
import { apiBase } from "@/lib/api-config";
import { auth } from "@/config/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";

type Step = "phone" | "otp";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
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

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container-admin", {
        size: "invisible"
      });
    }
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    try {
      const fullPhone = `+91${digits}`;
      const result = await signInWithPhoneNumber(auth, fullPhone, window.recaptchaVerifier);
      setConfirmationResult(result);
      setStep("otp");
      setResendTimer(30); // Start cooldown timer
      toast({ title: "OTP Sent!", description: `Verification code sent to ${fullPhone}.` });
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      console.error("Firebase Error:", err);
      setError("Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    setError("");
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (next.every((d) => d !== "")) verifyOtp(next.join(""));
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) { setOtp(pasted.split("")); setError(""); verifyOtp(pasted); }
  };

  const verifyOtp = async (otpValue: string) => {
    if (!confirmationResult || loading) return;
    setLoading(true);
    setError("");
    try {
      const result = await confirmationResult.confirm(otpValue);
      const idToken = await result.user.getIdToken();
      
      const res = await fetch(`${apiBase()}/api/auth/verify-firebase-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firebaseIdToken: idToken }),
      });
      
      const data = await res.json();
      if (!res.ok || !data.isAdmin) {
        setError(data.error || "Unauthorized Access: Admin only.");
        setOtp(["", "", "", "", "", ""]);
        setTimeout(() => otpRefs.current[0]?.focus(), 50);
        return;
      }
      
      localStorage.setItem("adminToken", data.token as string);
      queryClient.clear();
      toast({ title: "Welcome back, Admin!", description: "Access granted." });
      setLocation("/admin");
    } catch (err: any) {
      console.error("Verification Error:", err);
      setError("Invalid OTP. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join("");
    if (otpValue.length < 6) { setError("Please enter the complete 6-digit OTP."); return; }
    verifyOtp(otpValue);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl shadow-rose-100 border border-pink-100 overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-rose-400 px-8 py-8 text-white text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl mb-4 border border-white/30 overflow-hidden p-2">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-wide">Aruna Admin</h1>
            <p className="text-white/80 text-sm mt-1">
              {step === "phone" ? "Management Dashboard Access" : "Enter your security OTP"}
            </p>
          </div>

          <div className="px-8 py-8">
            {/* ── Step 1: Phone ───────────────────── */}
            {step === "phone" && (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-rose-600 uppercase tracking-wider mb-2">
                    Admin Mobile Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <Phone className="w-4 h-4 text-rose-400" />
                      <span className="ml-2 text-sm font-medium text-rose-600 border-r border-pink-200 pr-2">+91</span>
                    </div>
                    <input
                      type="tel"
                      required
                      autoFocus
                      maxLength={10}
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }}
                      placeholder="Enter mobile number"
                      className="w-full border border-pink-200 rounded-xl pl-20 pr-4 py-3.5 text-sm bg-pink-50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-rose-900 placeholder:text-rose-300 font-medium tracking-widest"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm font-medium">
                    <span className="text-base">⚠️</span> {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || phone.length < 10}
                  className="w-full bg-primary hover:bg-primary/90 disabled:bg-pink-200 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3.5 text-sm flex items-center justify-center gap-2 shadow-md shadow-rose-200 transition-all"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Checking...</> : "Send OTP →"}
                </button>
              </form>
            )}

            {/* ── Step 2: OTP ─────────────────────── */}
            {step === "otp" && (
              <form onSubmit={handleVerifySubmit} className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-rose-700 font-medium">OTP sent to</p>
                  <p className="text-rose-900 font-bold mt-0.5">+91 {phone}</p>
                </div>

                {/* 6-box OTP input */}
                <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      style={{ height: "52px" }}
                      className={`w-11 text-center text-xl font-bold border-2 rounded-xl bg-pink-50 focus:outline-none transition-all
                        ${digit ? "border-primary text-primary" : "border-pink-200 text-rose-900"}
                        focus:border-primary focus:ring-2 focus:ring-primary/20`}
                    />
                  ))}
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm font-medium">
                    <span className="text-base">⚠️</span> {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.join("").length < 6}
                  className="w-full bg-primary hover:bg-primary/90 disabled:bg-pink-200 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3.5 text-sm flex items-center justify-center gap-2 shadow-md shadow-rose-200 transition-all"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying...</>
                    : <><ShieldCheck className="w-4 h-4" /> Verify &amp; Enter Dashboard</>
                  }
                </button>

                <div className="flex flex-col gap-3">
                  {resendTimer > 0 ? (
                    <p className="text-center text-xs text-rose-300/60 font-medium">
                      Resend OTP in {resendTimer}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOtp(new Event('submit') as any)}
                      disabled={loading}
                      className="text-center text-xs text-rose-400 hover:text-primary hover:underline transition-colors disabled:opacity-50 font-medium"
                    >
                      Didn't receive code? Resend OTP
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => { setStep("phone"); setOtp(["", "", "", "", "", ""]); setError(""); }}
                    className="w-full flex items-center justify-center gap-1.5 text-rose-400 hover:text-rose-600 text-sm transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Change mobile number
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-rose-400 mt-6">
          © {new Date().getFullYear()} Aruna Nighties. All rights reserved.
        </p>
      </div>
      <div id="recaptcha-container-admin"></div>
    </div>
  );
}
