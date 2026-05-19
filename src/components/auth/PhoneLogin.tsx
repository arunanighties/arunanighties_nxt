import { useState, useEffect } from "react";
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  type ConfirmationResult 
} from "firebase/auth";
import { auth } from "@/config/firebase";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiBase } from "@/lib/api-config";
import { Loader2, Phone, KeyRound, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PhoneLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError] = useState("");

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
    // Initialize reCAPTCHA verifier
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {
          console.log("reCAPTCHA solved");
        },
        "expired-callback": () => {
          toast({ variant: "destructive", title: "reCAPTCHA expired. Please try again." });
        }
      });
    }
    
    return () => {
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
    };
  }, [toast]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    
    const fullPhone = `+91${cleaned}`;
    setLoading(true);
    setError("");
    
    try {
      const verifier = (window as any).recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, fullPhone, verifier);
      setConfirmationResult(result);
      setStep("otp");
      setResendTimer(30); // Reset cooldown timer
      toast({ 
        title: "OTP Sent!", 
        description: `Verification code sent to ${fullPhone}. Please check your messages.` 
      });
    } catch (err: any) {
      console.error("Firebase Auth Error:", err);
      setError(err.message || "Failed to send OTP. Please try again.");
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "Failed to send OTP. Check if your phone number is correct." 
      });
      // Reset reCAPTCHA on error
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.render().then((widgetId: any) => {
          (window as any).grecaptcha.reset(widgetId);
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || otp.length < 6) return;
    
    setLoading(true);
    setError("");
    
    try {
      const result = await confirmationResult.confirm(otp);
      const idToken = await result.user.getIdToken();
      
      const response = await fetch(`${apiBase()}/api/auth/verify-firebase-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firebaseIdToken: idToken }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Backend verification failed");
      }

      // Save session token based on role
      if (data.isAdmin) {
        localStorage.setItem("adminToken", data.token);
      } else {
        localStorage.setItem("userToken", data.token);
        localStorage.setItem("aruna_user", JSON.stringify(data.user));
      }

      toast({ 
        title: "Login Successful", 
        description: data.isAdmin ? "Welcome to Admin Dashboard" : "Welcome back to Aruna Nighties!" 
      });
      
      // Redirect to home as requested
      setLocation("/");
      
    } catch (err: any) {
      console.error("Verification Error:", err);
      setError(err.message || "Invalid OTP. Please try again.");
      toast({ 
        variant: "destructive", 
        title: "Verification Failed", 
        description: "The OTP you entered is incorrect or has expired." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full max-w-md mx-auto p-4">
      <div className="w-full bg-white rounded-[2rem] shadow-2xl shadow-rose-100/50 border border-pink-50 overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-primary to-rose-400 p-8 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30 backdrop-blur-sm">
            {step === "phone" ? <Phone className="w-8 h-8" /> : <KeyRound className="w-8 h-8" />}
          </div>
          <h2 className="font-serif text-2xl font-bold tracking-tight">
            {step === "phone" ? "Welcome Back" : "Verify OTP"}
          </h2>
          <p className="text-white/80 text-sm mt-2 font-medium">
            {step === "phone" 
              ? "Enter your mobile number to sign in" 
              : `Enter the code sent to +91 ${phone}`}
          </p>
        </div>

        <div className="p-8">
          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-rose-600 uppercase tracking-[0.2em] mb-2 ml-1">
                  Mobile Number
                </label>
                <div className="flex items-center border-2 border-pink-50 rounded-2xl overflow-hidden focus-within:border-primary/30 focus-within:ring-4 focus-within:ring-primary/5 transition-all bg-pink-50/30">
                  <span className="px-4 text-rose-400 font-bold text-sm border-r border-pink-100 py-4 bg-pink-50/50">
                    +91
                  </span>
                  <input
                    type="tel"
                    placeholder="99999 99999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="flex-1 px-4 py-4 text-sm bg-transparent outline-none text-rose-900 font-medium placeholder:text-rose-200"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-500 text-xs py-3 px-4 rounded-xl font-medium animate-in fade-in slide-in-from-top-1">
                  ⚠️ {error}
                </div>
              )}

              <Button 
                type="submit" 
                disabled={loading || phone.length < 10} 
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-rose-200 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  "Get Verification Code →"
                )}
              </Button>
              
              <p className="text-center text-[10px] text-rose-300 font-medium px-4">
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <button 
                type="button" 
                onClick={() => { setStep("phone"); setError(""); }} 
                className="flex items-center gap-2 text-xs font-bold text-rose-400 hover:text-primary transition-colors mb-2"
              >
                <ArrowLeft className="w-4 h-4" /> Change Mobile Number
              </button>

              <div>
                <label className="block text-[10px] font-bold text-rose-600 uppercase tracking-[0.2em] mb-2 ml-1">
                  6-Digit OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full border-2 border-pink-50 rounded-2xl px-4 py-5 text-center text-3xl font-black tracking-[0.4em] bg-pink-50/30 focus:border-primary/30 focus:ring-4 focus:ring-primary/5 outline-none text-rose-900 placeholder:text-rose-100 transition-all"
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-500 text-xs py-3 px-4 rounded-xl font-medium animate-in fade-in slide-in-from-top-1">
                  ⚠️ {error}
                </div>
              )}

              <Button 
                type="submit" 
                disabled={loading || otp.length < 6} 
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-lg shadow-rose-200 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Verify & Sign In →"
                )}
              </Button>

              {resendTimer > 0 ? (
                <p className="w-full text-center text-xs font-bold text-rose-300/60">
                  Resend OTP in {resendTimer}s
                </p>
              ) : (
                <button 
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={loading}
                  className="w-full text-center text-xs font-bold text-rose-400 hover:text-primary hover:underline transition-colors disabled:opacity-50"
                >
                  Didn't receive code? Resend OTP
                </button>
              )}
            </form>
          )}
        </div>
      </div>
      
      {/* Invisible reCAPTCHA Container */}
      <div id="recaptcha-container" className="hidden"></div>
    </div>
  );
}
