import { Briefcase, MapPin, Clock } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const mockJobs = [
  { title: "Mathematics Teacher", location: "Kampala", type: "Full-time", desc: "Experienced mathematics teacher for O-Level and A-Level classes." },
  { title: "School Administrator", location: "Entebbe", type: "Full-time", desc: "Organize and manage daily school operations." },
  { title: "IT Support Specialist", location: "Remote", type: "Contract", desc: "Provide technical support for school systems." },
];

const Jobs = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-bold mb-3">Career Opportunities</h1>
          <p className="text-muted-foreground">Join schools using PwezaCore.</p>
        </div>
        <div className="space-y-4">
          {mockJobs.map((j) => (
            <GlassCard key={j.title} className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-semibold">{j.title}</h3>
                <p className="text-sm text-muted-foreground mb-1">{j.desc}</p>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {j.location}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {j.type}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 rounded-lg">Apply</Button>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
    <Footer />
  </div>
);

export default Jobs;
