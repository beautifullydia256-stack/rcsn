import { BookOpen } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const mockBooks = [
  { title: "Introduction to Mathematics", desc: "A comprehensive guide covering algebra, geometry, and calculus.", category: "Mathematics" },
  { title: "English Grammar Basics", desc: "Essential grammar rules and exercises for students.", category: "English" },
  { title: "Physics for Beginners", desc: "Fundamental physics concepts explained simply.", category: "Science" },
  { title: "History of East Africa", desc: "An exploration of the rich history of the East African region.", category: "History" },
];

const Library = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-bold mb-3">Educational Library</h1>
          <p className="text-muted-foreground">Free resources for students and teachers.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {mockBooks.map((b) => (
            <GlassCard key={b.title}>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{b.category}</span>
              <h3 className="font-display font-semibold mt-2 mb-1">{b.title}</h3>
              <p className="text-sm text-muted-foreground">{b.desc}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
    <Footer />
  </div>
);

export default Library;
