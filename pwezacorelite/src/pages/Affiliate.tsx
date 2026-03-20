import { Link } from "react-router-dom";
import { Users, DollarSign, BarChart3, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const benefits = [
  { icon: DollarSign, title: "Earn Commission", desc: "Get 20% recurring commission for every school you refer." },
  { icon: BarChart3, title: "Track Earnings", desc: "Real-time dashboard to monitor your referrals and payouts." },
  { icon: Gift, title: "Exclusive Perks", desc: "Early access to features and promotional materials." },
];

const Affiliate = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-sm font-medium text-primary mb-4">
            <Users className="h-4 w-4" /> Affiliate Program
          </div>
          <h1 className="font-display text-4xl font-bold mb-3">Earn With PwezaCore</h1>
          <p className="text-muted-foreground max-w-md mx-auto">Refer schools and earn recurring commissions. It's simple, transparent, and rewarding.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {benefits.map((b) => (
            <GlassCard key={b.title}>
              <b.icon className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-display font-semibold mb-1">{b.title}</h3>
              <p className="text-sm text-muted-foreground">{b.desc}</p>
            </GlassCard>
          ))}
        </div>
        <div className="text-center space-y-3">
          <Button size="lg" className="gradient-btn rounded-xl px-8">Join the Program</Button>
          <p className="text-sm text-muted-foreground">
            By joining, you agree to our{" "}
            <Link to="/affiliate-terms" className="text-primary hover:underline">Affiliate Terms</Link>.
          </p>
        </div>
      </div>
    </div>
    <Footer />
  </div>
);

export default Affiliate;
