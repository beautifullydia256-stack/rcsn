import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  GraduationCap, Shield, Zap, BarChart3, Smartphone, Users, Lock,
  Check, Star, ChevronRight, Mail, ArrowRight, Building2, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/GlassCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const features = [
  { icon: Building2, title: "Multi-Tenant", desc: "Each school gets its own secure, isolated data environment." },
  { icon: Zap, title: "Automated", desc: "Promotions, reports, and notifications run on autopilot." },
  { icon: Smartphone, title: "Mobile-Responsive", desc: "Access everything from any device, anywhere." },
  { icon: BarChart3, title: "Analytics & Reports", desc: "Rich insights with customizable report templates." },
  { icon: Shield, title: "Secure", desc: "RLS, encrypted data, role-based access control." },
  { icon: Globe, title: "Fast & Reliable", desc: "Built on modern cloud infrastructure for speed." },
];

const testimonials = [
  { name: "Sarah M.", role: "School Administrator", quote: "PwezaCore transformed how we manage our school. Everything is in one place.", avatar: "S" },
  { name: "James K.", role: "Head Teacher", quote: "The report generation is incredible. What took days now takes minutes.", avatar: "J" },
  { name: "Grace N.", role: "Parent", quote: "I can track my children's progress and fees from my phone. Amazing!", avatar: "G" },
];

const pricing = [
  { name: "Free", price: "0", period: "/mo", desc: "Perfect for trying out", features: ["Up to 50 students", "Basic reports", "1 admin user", "Email support"], cta: "Start Free", popular: false },
  { name: "Pro", price: "49", period: "/mo", desc: "For growing schools", features: ["Unlimited students", "Advanced reports", "5 staff accounts", "Priority support", "Custom branding", "Analytics dashboard"], cta: "Get Pro", popular: true },
  { name: "Enterprise", price: "Custom", period: "", desc: "For school networks", features: ["Multi-school management", "Unlimited everything", "API access", "Dedicated support", "Custom integrations", "SLA guarantee"], cta: "Contact Sales", popular: false },
];

const faqs = [
  { q: "What is PwezaCore?", a: "PwezaCore is a multi-tenant school management SaaS platform designed for schools of all sizes. It handles student management, exam results, report cards, finances, and more." },
  { q: "Is my school's data secure?", a: "Absolutely. We use row-level security, encrypted connections, and role-based access to ensure each school's data is completely isolated and protected." },
  { q: "Can I try it for free?", a: "Yes! Our Free plan supports up to 50 students with basic features. No credit card required." },
  { q: "How does multi-tenant work?", a: "Each school gets its own isolated environment. Data never mixes between schools, and each school can customize their settings independently." },
  { q: "Do you support mobile devices?", a: "Yes, PwezaCore is fully responsive and works on smartphones, tablets, and desktops." },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-24 pb-16 overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl animate-glow" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/10 blur-3xl animate-glow" style={{ animationDelay: "1.5s" }} />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div className="max-w-3xl mx-auto text-center pt-12" {...fadeUp}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-sm font-medium text-primary mb-6">
              <GraduationCap className="h-4 w-4" /> Modern School Management
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Manage Your School
              <span className="gradient-text block">Effortlessly</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              A powerful multi-tenant platform for administrators, teachers, parents, and students. Automate reports, track finances, and boost performance.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register">
                <Button size="lg" className="gradient-btn rounded-xl text-base px-8">
                  Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button size="lg" variant="outline" className="rounded-xl text-base px-8 glass-card">
                  Book a Demo
                </Button>
              </Link>
            </div>
            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Check className="h-4 w-4 text-ac-emerald" /> Free plan</span>
              <span className="flex items-center gap-1"><Check className="h-4 w-4 text-ac-emerald" /> No credit card</span>
              <span className="flex items-center gap-1"><Check className="h-4 w-4 text-ac-emerald" /> Setup in minutes</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-12" {...fadeUp}>
            <h2 className="font-display text-3xl font-bold mb-3">Everything You Need</h2>
            <p className="text-muted-foreground max-w-md mx-auto">Built for modern schools that demand efficiency, security, and insights.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <GlassCard
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-12" {...fadeUp}>
            <h2 className="font-display text-3xl font-bold mb-3">Trusted by Schools</h2>
            <p className="text-muted-foreground">See what educators are saying about PwezaCore.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <GlassCard key={t.name} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}>
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, j) => <Star key={j} className="h-4 w-4 fill-ac-amber text-ac-amber" />)}
                </div>
                <p className="text-sm text-muted-foreground mb-4 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center font-display font-bold text-primary text-sm">{t.avatar}</div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-12" {...fadeUp}>
            <h2 className="font-display text-3xl font-bold mb-3">Simple Pricing</h2>
            <p className="text-muted-foreground">Start free, upgrade when you're ready.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {pricing.map((p, i) => (
              <GlassCard
                key={p.name}
                className={p.popular ? "ring-2 ring-primary relative" : ""}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-semibold rounded-full gradient-btn">
                    Most Popular
                  </span>
                )}
                <h3 className="font-display font-bold text-lg mb-1">{p.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{p.desc}</p>
                <div className="mb-4">
                  <span className="font-display text-4xl font-bold">{p.price === "Custom" ? "" : "$"}{p.price}</span>
                  <span className="text-muted-foreground text-sm">{p.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-ac-emerald flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to={p.name === "Enterprise" ? "/contact" : "/register"}>
                  <Button className={p.popular ? "w-full gradient-btn rounded-lg" : "w-full rounded-lg"} variant={p.popular ? "default" : "outline"}>
                    {p.cta} <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div className="text-center mb-12" {...fadeUp}>
            <h2 className="font-display text-3xl font-bold mb-3">Frequently Asked Questions</h2>
          </motion.div>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="glass-card rounded-xl px-4 border-none">
                <AccordionTrigger className="text-sm font-medium hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <GlassCard className="max-w-xl mx-auto text-center p-8" hover={false}>
            <Mail className="h-10 w-10 text-primary mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold mb-2">Stay Updated</h2>
            <p className="text-sm text-muted-foreground mb-6">Get the latest updates on features and improvements.</p>
            <div className="flex gap-2">
              <Input placeholder="Enter your email" className="flex-1" />
              <Button className="gradient-btn rounded-lg">Subscribe</Button>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Floating Affiliate CTA */}
      <Link
        to="/affiliate"
        className="fixed bottom-6 right-6 z-40 gradient-btn px-4 py-2.5 rounded-full text-sm font-medium shadow-lg flex items-center gap-2 hover:scale-105 transition-transform"
      >
        <Users className="h-4 w-4" /> Become an Affiliate
      </Link>

      <Footer />
    </div>
  );
};

export default Index;
