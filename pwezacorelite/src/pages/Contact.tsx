import { Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/GlassCard";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const Contact = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-bold mb-3">Contact Us</h1>
          <p className="text-muted-foreground">Have questions? We'd love to hear from you.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: Mail, label: "Email", value: "hello@pwezacore.com" },
            { icon: Phone, label: "Phone", value: "+256 700 000 000" },
            { icon: MapPin, label: "Location", value: "Kampala, Uganda" },
          ].map((c) => (
            <GlassCard key={c.label} className="text-center">
              <c.icon className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-sm mb-1">{c.label}</h3>
              <p className="text-sm text-muted-foreground">{c.value}</p>
            </GlassCard>
          ))}
        </div>
        <GlassCard className="p-8" hover={false}>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name</Label><Input placeholder="Your name" /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="you@email.com" /></div>
            </div>
            <div className="space-y-2"><Label>Subject</Label><Input placeholder="How can we help?" /></div>
            <div className="space-y-2"><Label>Message</Label><Textarea placeholder="Tell us more..." rows={5} /></div>
            <Button className="gradient-btn rounded-lg">Send Message</Button>
          </form>
        </GlassCard>
      </div>
    </div>
    <Footer />
  </div>
);

export default Contact;
