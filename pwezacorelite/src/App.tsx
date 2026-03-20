import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Contact = lazy(() => import("./pages/Contact"));
const Library = lazy(() => import("./pages/Library"));
const Jobs = lazy(() => import("./pages/Jobs"));
const Affiliate = lazy(() => import("./pages/Affiliate"));
const AffiliateTerms = lazy(() => import("./pages/AffiliateTerms"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const SecurityLetter = lazy(() => import("./pages/SecurityLetter"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 text-primary animate-spin" />
  </div>
);

const App = () => (
  <ThemeProvider defaultTheme="light">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/library" element={<Library />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/affiliate" element={<Affiliate />} />
              <Route path="/affiliate-terms" element={<AffiliateTerms />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/security-letter" element={<SecurityLetter />} />
              <Route path="/auth/forgot" element={<ForgotPassword />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
