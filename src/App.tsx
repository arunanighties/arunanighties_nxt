import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/context/cart";
import { UserProvider } from "@/context/user";
import NotFound from "@/client-pages/not-found";
import Home from "@/client-pages/home";
import AdminLogin from "@/client-pages/admin-login";
import AdminDashboard from "@/client-pages/admin-dashboard";
import NewArrivals from "@/client-pages/new-arrivals";
import Collections from "@/client-pages/collections";
import SizeGuide from "@/client-pages/size-guide";
import ShippingReturns from "@/client-pages/shipping-returns";
import Contact from "@/client-pages/contact";
import CartPage from "@/client-pages/cart";
import CheckoutPage from "@/client-pages/checkout";
import MyOrdersPage from "@/client-pages/my-orders";
import SectionProducts from "@/client-pages/section-products";
import ProductDetail from "@/client-pages/product-detail";
import OurStory from "@/client-pages/our-story";

function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return null;
}


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/new-arrivals" component={NewArrivals} />
      <Route path="/collections" component={Collections} />
      <Route path="/collections/:id" component={SectionProducts} />
      <Route path="/product/:id" component={ProductDetail} />
      <Route path="/size-guide" component={SizeGuide} />
      <Route path="/shipping-returns" component={ShippingReturns} />
      <Route path="/contact" component={Contact} />
      <Route path="/our-story" component={OurStory} />

      <Route path="/cart" component={CartPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/my-orders" component={MyOrdersPage} />
      {/* Admin routes */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin-login">
        {() => <Redirect to="/admin/login" />}
      </Route>
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <WouterRouter base="">
            <UserProvider>
              <ScrollToTop />
              <Router />
            </UserProvider>
          </WouterRouter>
          <Toaster />
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
