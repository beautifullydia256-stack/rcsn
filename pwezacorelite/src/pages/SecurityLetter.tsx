import { Shield, Lock, Server, Eye } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const SecurityLetter = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="font-display text-4xl font-bold mb-3">Security at PwezaCore</h1>
          <p className="text-muted-foreground">Our commitment to protecting your school's data.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { icon: Lock, title: "Encryption", desc: "All data is encrypted using AES-256 at rest and TLS 1.3 in transit." },
            { icon: Server, title: "Infrastructure", desc: "Hosted on enterprise-grade cloud infrastructure with 99.9% uptime SLA." },
            { icon: Eye, title: "Access Control", desc: "Role-based access control with row-level security ensures data isolation." },
            { icon: Shield, title: "Compliance", desc: "We follow industry best practices for data protection and privacy." },
          ].map((s) => (
            <GlassCard key={s.title}>
              <s.icon className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-display font-semibold mb-1">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
    <Footer />
  </div>
);

export default SecurityLetter;
