import { useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { MapPin, CreditCard, CheckCircle2, Loader2, ShoppingBag, Package, ArrowLeft, ShieldCheck, Trash2 } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { useCart } from "@/context/cart";
import { useToast } from "@/hooks/use-toast";

type Step = "address" | "payment" | "success";

function formatINR(n: number) { return `₹${n.toLocaleString("en-IN")}`; }
import { getApiBase } from "@/lib/api-config";

const apiBase = getApiBase;

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI / Google Pay / PhonePe", icon: "📱" },
  { id: "card", label: "Credit / Debit Card", icon: "💳" },
];

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { items, totalPrice, clearCart, removeItem } = useCart();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("address");
  const [checkoutStep, setCheckoutStep] = useState<'address' | 'payment'>('address');
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("upi");

  const [address, setAddress] = useState({
    label: "Home", fullName: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "",
  });


  const getUserFromStorage = () => {
    try { return JSON.parse(localStorage.getItem("aruna_user") ?? "null"); } catch { return null; }
  };

  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddrIdx, setSelectedAddrIdx] = useState<number | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(true);
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(true);


  useState(() => {
    const u = getUserFromStorage();
    if (u?.id) {
      fetch(`${apiBase()}/api/users/${u.id}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.addresses) {
            const parsed = JSON.parse(data.addresses);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSavedAddresses(parsed);
              setIsAddingNew(false);
              setSelectedAddrIdx(0);
              // Pre-fill first address
              setAddress(parsed[0]);
            }
          }
        });
    }
  });


  if (items.length === 0 && step !== "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50/40 to-rose-50/30">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center max-w-sm">
          <Package className="w-16 h-16 mx-auto text-rose-100 mb-4" />
          <h2 className="font-serif text-2xl font-bold text-rose-900 mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground text-sm mb-6">Add some beautiful nighties first.</p>
          <button onClick={() => setLocation("/")} className="bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-3 rounded-xl text-sm transition-colors">
            Shop Now
          </button>
        </div>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    setIsInitializingPayment(true);
    setLoading(true);
    try {
      const user = getUserFromStorage();
      const fullAddress = [address.line1, address.line2, address.city, address.state, address.pincode].filter(Boolean).join(", ");

      const orderItems = items.map((i) => ({
        id: i.id,
        name: i.name,
        size: i.size,
        color: i.color,
        colorHex: i.colorHex,
        qty: i.quantity,
        price: i.price,
        imageUrl: i.imageUrl
      }));

      const total = (totalPrice + (items.reduce((acc, i) => acc + (i.quantity * 30), 0)));


      // Step 0: Check stock availability
      const stockCheckRes = await fetch(`${apiBase()}/api/products/check-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: orderItems }),
      });

      if (!stockCheckRes.ok) {
        const checkError = await stockCheckRes.json();
        setIsInitializingPayment(false);
        setLoading(false);
        toast({
          variant: "destructive",
          title: "Out of Stock",
          description: checkError.error || "Some items in your cart are no longer available. Please check quantities."
        });
        return;
      }

      // Step 1: Create Razorpay Order
      const rzpOrderRes = await fetch(`${apiBase()}/api/payments/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      });

      if (!rzpOrderRes.ok) {
        setIsInitializingPayment(false);
        setLoading(false);
        toast({ variant: "destructive", title: "Payment initialization failed", description: "Could not create Razorpay order." });
        return;
      }

      const { id: rzpOrderId } = await rzpOrderRes.json();

      // Step 2: Razorpay Options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
        amount: Math.round(total * 100),
        currency: "INR",
        name: "Aruna Nighties",
        description: "Payment for Order",
        order_id: rzpOrderId,
        theme: { color: "#db2777" },
        handler: async function (response: any) {
          // Step 3: Verify Payment and Create Order
          try {
            setLoading(true);
            setIsInitializingPayment(false);

            // Compile full order payload inside handler
            const user = getUserFromStorage();
            const fullAddress = [address.line1, address.line2, address.city, address.state, address.pincode].filter(Boolean).join(", ");
            const orderItems = items.map((i) => ({
              id: i.id,
              name: i.name,
              size: i.size,
              color: i.color,
              colorHex: i.colorHex,
              qty: i.quantity,
              price: i.price,
              imageUrl: i.imageUrl
            }));
            const finalTotal = (totalPrice + (items.reduce((acc, i) => acc + (i.quantity * 30), 0))).toFixed(2);

            const orderData = {
              userId: user?.id ?? null,
              customerName: address.fullName || user?.name || "Guest",
              phone: address.phone || user?.phone || null,
              items: orderItems,
              address: fullAddress,
              total: finalTotal,
            };

            const verifyRes = await fetch(`${apiBase()}/api/payments/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderData, // Send the compiled payload
              }),
            });

            if (verifyRes.ok) {
              const { orderId: newOrderId } = await verifyRes.json();
              setOrderId(newOrderId);
              clearCart(); // Success cleanup: clear cart
              setStep("success"); // Success cleanup: show success view
              toast({ title: "Payment Successful", description: "Your order has been placed successfully." });
            } else {
              toast({ variant: "destructive", title: "Payment Verification Failed", description: "Please contact support if amount was deducted." });
            }
          } catch (err) {
            console.error("Verification error:", err);
            toast({ variant: "destructive", title: "Verification Error", description: "Something went wrong during payment verification." });
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: address.fullName || user?.name || "",
          contact: address.phone || user?.phone || "",
        },
      };

      // Step 4: Open Modal
      const rzp = new (window as any).Razorpay(options);

      rzp.on('payment.failed', function (response: any) {
        setIsInitializingPayment(false);
        toast({
          variant: "destructive",
          title: "Payment Failed",
          description: response.error?.description || "Razorpay payment failed."
        });
      });

      setIsInitializingPayment(false);
      rzp.open();

      // Auto-save address if checkbox is checked
      if (user?.id && isAddingNew && saveAddressToProfile && savedAddresses.length < 3) {
        const next = [...savedAddresses, { ...address, label: "Home" }];
        fetch(`${apiBase()}/api/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ addresses: JSON.stringify(next) }),
        });
      }

    } catch (error) {
      console.error("Checkout error:", error);
      setIsInitializingPayment(false);
      toast({ variant: "destructive", title: "Checkout error", description: "Please check your connection and try again." });
    } finally {
      setLoading(false);
    }
  };

  const addrValid = address.fullName && address.phone && address.line1 && address.city && address.state && address.pincode;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/40 to-rose-50/30">
      <Navbar />
      <div className="container mx-auto px-4 md:px-6 py-10 max-w-5xl">

        {/* Success screen */}
        {step === "success" && (
          <div className="text-center py-16 max-w-md mx-auto animate-in fade-in duration-500">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="font-serif text-3xl font-bold text-rose-900 mb-2">Order Placed! 🎉</h1>
            <p className="text-muted-foreground text-sm mb-1">Thank you for shopping with Aruna Nighties.</p>
            {orderId && (
              <p className="text-xs text-rose-400 mb-6">Order ID: <span className="font-bold text-rose-600">#{String(orderId).padStart(4, "0")}</span></p>
            )}
            <div className="bg-white border border-pink-100 rounded-2xl p-5 text-left mb-6 shadow-sm space-y-2">
              <p className="text-sm font-semibold text-rose-900">Delivery in 3–5 business days</p>
              <p className="text-xs text-muted-foreground">You'll receive a WhatsApp confirmation on your registered number.</p>
              <div className="flex items-center gap-2 text-xs text-rose-600 font-medium pt-1">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> Shipping fee included
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setLocation("/my-orders")}
                className="flex items-center justify-center gap-2 border border-pink-200 text-rose-700 font-semibold px-6 py-3 rounded-xl text-sm hover:bg-pink-50 transition-colors"
              >
                <ShoppingBag className="w-4 h-4" /> View My Orders
              </button>
              <button
                onClick={() => setLocation("/")}
                className="bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
              >
                Shop More
              </button>
            </div>
          </div>
        )}

        {step !== "success" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: steps */}
            <div className={`${checkoutStep === 'payment' ? 'lg:col-span-3 max-w-3xl mx-auto w-full' : 'lg:col-span-2'} space-y-5`}>
              {/* Step indicator */}
              <div className="flex items-center gap-3">
                {[
                  { id: "address", label: "Address", icon: MapPin },
                  { id: "payment", label: "Payment", icon: CreditCard },
                ].map(({ id, label, icon: Icon }, idx) => (
                  <div key={id} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${checkoutStep === id ? "bg-primary text-white" : checkoutStep === "payment" && id === "address" ? "bg-green-100 text-green-600" : "bg-pink-100 text-rose-400"}`}>
                      {checkoutStep === "payment" && id === "address" ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span className={`text-sm font-medium ${checkoutStep === id ? "text-rose-900" : "text-muted-foreground"}`}>{label}</span>
                    {idx === 0 && <div className="w-8 h-px bg-pink-200 mx-1" />}
                  </div>
                ))}
              </div>

              {/* Back button */}
              {checkoutStep === "address" && (
                <button
                  onClick={() => setLocation("/cart")}
                  className="flex items-center gap-1.5 text-rose-500 hover:text-primary text-sm font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Go Back
                </button>
              )}

              {/* ADDRESS STEP */}
              {checkoutStep === "address" && (
                <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <h2 className="font-semibold text-rose-900">Delivery Address</h2>
                    </div>
                    {savedAddresses.length > 0 && (
                      <button
                        onClick={() => {
                          setIsAddingNew(!isAddingNew);
                          if (!isAddingNew) {
                            setSelectedAddrIdx(null);
                            setAddress({ label: "Home", fullName: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" });
                          } else {
                            setSelectedAddrIdx(0);
                            setAddress(savedAddresses[0]);
                          }
                        }}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        {isAddingNew ? "Select Saved Address" : "+ Add New Address"}
                      </button>
                    )}
                  </div>

                  {!isAddingNew && savedAddresses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {savedAddresses.map((addr, idx) => (
                        <button
                          key={idx}
                          onClick={() => { setSelectedAddrIdx(idx); setAddress(addr); }}
                          className={`text-left p-4 rounded-xl border transition-all ${selectedAddrIdx === idx ? "border-primary bg-pink-50 ring-2 ring-primary/10" : "border-pink-100 hover:bg-pink-50/50"}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white border border-pink-100 text-primary">{addr.label}</span>
                            {selectedAddrIdx === idx && <CheckCircle2 className="w-4 h-4 text-primary" />}
                          </div>
                          <p className="text-sm font-bold text-rose-900 truncate">{addr.fullName}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed break-all">
                            {[addr.line1, addr.line2, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")}
                          </p>
                          {addr.phone && (
                            <p className="text-[10px] font-semibold text-rose-500 mt-1">📞 {addr.phone}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-rose-500 uppercase mb-1.5 ml-1">Label</label>
                          <select
                            value={address.label}
                            onChange={(e) => setAddress(a => ({ ...a, label: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl border border-pink-200 text-sm bg-pink-50/30 focus:outline-none focus:ring-2 focus:ring-primary/20 text-rose-900"
                          >
                            <option>Home</option>
                            <option>Work</option>
                            <option>Other</option>
                          </select>
                        </div>
                        <Field
                          label="Full Name *"
                          value={address.fullName}
                          onChange={(v) => setAddress(a => ({ ...a, fullName: v.slice(0, 30) }))}
                          placeholder="Recipient Name"
                          maxLength={30}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Field 
                          label="Mobile Number *" 
                          value={address.phone} 
                          onChange={(v) => setAddress(a => ({ ...a, phone: v.replace(/\D/g, "").slice(0, 10) }))} 
                          placeholder="10-digit mobile" 
                          type="tel" 
                          maxLength={10}
                          helperText={<p className="text-xs text-gray-500 mt-1">Enter a 10-digit mobile number without +91</p>}
                        />
                        <Field label="PIN Code *" value={address.pincode} onChange={(v) => setAddress(a => ({ ...a, pincode: v.replace(/\D/g, "") }))} placeholder="6 digits" maxLength={6} />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-rose-500 uppercase mb-1.5 ml-1">Address Line 1 *</label>
                        <input
                          type="text"
                          maxLength={150}
                          value={address.line1}
                          onChange={(e) => setAddress(a => ({ ...a, line1: e.target.value.slice(0, 150) }))}
                          placeholder="Flat, House no, Building"
                          className="w-full px-4 py-2.5 rounded-xl border border-pink-200 text-sm bg-pink-50/30 focus:outline-none focus:ring-2 focus:ring-primary/20 text-rose-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-rose-500 uppercase mb-1.5 ml-1">Line 2 / Landmark</label>
                        <input
                          type="text"
                          maxLength={150}
                          value={address.line2}
                          onChange={(e) => setAddress(a => ({ ...a, line2: e.target.value.slice(0, 150) }))}
                          placeholder="Street, Area (optional)"
                          className="w-full px-4 py-2.5 rounded-xl border border-pink-200 text-sm bg-pink-50/30 focus:outline-none focus:ring-2 focus:ring-primary/20 text-rose-900"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Field label="City *" value={address.city} onChange={(v) => setAddress(a => ({ ...a, city: v }))} placeholder="City" />
                        <Field label="State *" value={address.state} onChange={(v) => setAddress(a => ({ ...a, state: v }))} placeholder="State" />
                      </div>

                      {getUserFromStorage()?.id && savedAddresses.length < 3 && (
                        <label className="flex items-center gap-2 px-1 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={saveAddressToProfile}
                            onChange={(e) => setSaveAddressToProfile(e.target.checked)}
                            className="accent-primary w-4 h-4"
                          />
                          <span className="text-xs text-rose-600 font-medium group-hover:text-primary transition-colors">Save this address to my profile for future use</span>
                        </label>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (address.phone.length !== 10) {
                        toast({ variant: "destructive", title: "Validation Error", description: "Phone number must be exactly 10 digits." });
                        return;
                      }
                      if (addrValid) {
                        setCheckoutStep("payment");
                      }
                    }}
                    disabled={!addrValid}
                    className="w-full mt-2 bg-primary hover:bg-primary/90 disabled:bg-pink-200 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3.5 text-sm transition-colors shadow-sm shadow-rose-200"
                  >
                    Continue →
                  </button>
                </div>
              )}

              {/* PAYMENT STEP */}
              {checkoutStep === "payment" && (
                <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-6 space-y-4">
                  <button
                    onClick={() => setCheckoutStep("address")}
                    className="flex items-center gap-1.5 text-rose-500 hover:text-primary text-sm font-medium transition-colors mb-2 self-start"
                  >
                    <ArrowLeft className="w-4 h-4" /> Go Back
                  </button>

                  <h3 className="text-lg font-bold text-pink-900 mb-4">Review Your Order</h3>

                  {/* Cart Items Details List */}
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1 mb-4">
                    {items.map((item) => (
                      <div key={item.cartItemId} className="flex items-center gap-3 bg-pink-50/20 p-3 rounded-xl border border-pink-50">
                        <div className="w-16 h-16 rounded-lg bg-pink-50 border border-pink-100 overflow-hidden flex-shrink-0">
                          {item.imageUrl ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" /> : <Package className="w-6 h-6 m-auto mt-5 text-rose-200" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-rose-900 truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">×{item.quantity}</span>
                            {item.size && <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">Size: {item.size}</span>}
                            {item.color && (
                              <div className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 rounded-full border border-pink-100" style={{ backgroundColor: item.colorHex || '#ccc' }} />
                                <span className="text-[10px] font-bold text-rose-500">{item.color}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <p className="text-sm font-bold text-rose-700">{formatINR(item.price * item.quantity)}</p>
                          <button onClick={() => removeItem(item.cartItemId)} className="text-rose-400 hover:text-red-500 transition-colors p-1" title="Remove item">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Price breakdown inside the payment review card */}
                  <div className="border-t border-pink-100 pt-3 space-y-1.5 text-sm mb-4">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span><span>{formatINR(totalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Shipping (₹30/item)</span><span>{formatINR(items.reduce((acc, i) => acc + (i.quantity * 30), 0))}</span>
                    </div>
                    <div className="flex justify-between font-bold text-rose-900 text-base pt-1 border-t border-pink-100">
                      <span>Total</span>
                      <span className="text-primary">{formatINR(totalPrice + items.reduce((acc, i) => acc + (i.quantity * 30), 0))}</span>
                    </div>
                  </div>

                  {/* Delivery address summary */}
                  <div className="bg-pink-50 border border-pink-100 rounded-xl p-4 text-sm">
                    <p className="font-semibold text-rose-700 mb-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Delivering to</p>
                    <p className="text-rose-900">{address.fullName}</p>
                    <p className="text-muted-foreground text-xs mt-0.5 break-all">
                      {[address.line1, address.line2, address.city, address.state, address.pincode].filter(Boolean).join(", ")}
                    </p>
                    <button onClick={() => setCheckoutStep("address")} className="text-xs text-primary hover:underline mt-1">Change address</button>
                  </div>

                  {/* Trust Badge */}
                  <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-600 bg-green-50 rounded-lg mb-4 border border-green-100">
                    <ShieldCheck className="w-5 h-5 text-green-600" />
                    <span><strong>100% Safe & Secure.</strong> Payments are encrypted and securely processed by Razorpay.</span>
                  </div>

                  <button
                    onClick={handlePlaceOrder}
                    disabled={loading}
                    className="w-full mt-2 bg-primary hover:bg-primary/90 disabled:bg-pink-200 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3.5 text-sm flex items-center justify-center gap-2 transition-colors shadow-sm shadow-rose-200"
                  >
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Paying...</> : "Pay Now"}
                  </button>
                  <p className="text-xs text-center text-muted-foreground">🔒 Secure simulated checkout — no real payment taken</p>
                </div>
              )}
            </div>

            {/* Right: order summary */}
            {checkoutStep !== 'payment' && (
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-5 sticky top-24">
                  <h2 className="font-semibold text-rose-900 text-sm mb-4">Order Summary ({items.length} {items.length === 1 ? "item" : "items"})</h2>
                  <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                    {items.map((item) => (
                      <div key={item.cartItemId} className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-pink-50 border border-pink-100 overflow-hidden flex-shrink-0">
                          {item.imageUrl ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" /> : <Package className="w-4 h-4 m-auto mt-3 text-rose-200" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-rose-900 truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">×{item.quantity}</span>
                            {item.size && <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1 rounded border border-rose-100">S:{item.size}</span>}
                            {item.color && (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full border border-pink-100" style={{ backgroundColor: item.colorHex || '#ccc' }} />
                                <span className="text-[10px] font-bold text-rose-500">{item.color}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <p className="text-xs font-bold text-rose-700">{formatINR(item.price * item.quantity)}</p>
                          <button onClick={() => removeItem(item.cartItemId)} className="text-rose-300 hover:text-red-500 transition-colors p-1" title="Remove item">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-pink-100 mt-4 pt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span><span>{formatINR(totalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Shipping (₹30/item)</span><span>{formatINR(items.reduce((acc, i) => acc + (i.quantity * 30), 0))}</span>
                    </div>
                    <div className="flex justify-between font-bold text-rose-900 text-base pt-1 border-t border-pink-100">
                      <span>Total</span>
                      <span className="text-primary">{formatINR(totalPrice + items.reduce((acc, i) => acc + (i.quantity * 30), 0))}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {isInitializingPayment && typeof document !== 'undefined' && createPortal(
        <LoadingModal />,
        document.body
      )}
    </div>
  );
}

function LoadingModal() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-pink-600 animate-spin" />
        <p className="text-gray-800 font-semibold text-lg">Initiating payment with Razorpay...</p>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text", maxLength, helperText,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; maxLength?: number; helperText?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-rose-500 uppercase mb-1.5 ml-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full border border-pink-200 rounded-xl px-4 py-2.5 text-sm bg-pink-50/30 focus:outline-none focus:ring-2 focus:ring-primary/20 text-rose-900 placeholder:text-rose-200"
      />
      {helperText}
    </div>
  );
}

