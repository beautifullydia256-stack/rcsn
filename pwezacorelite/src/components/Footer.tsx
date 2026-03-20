import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
              <GraduationCap className="h-6 w-6 text-primary" />
              <span className="gradient-text">PwezaCore</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Modern multi-tenant school management platform for administrators, teachers, parents, and students.
            </p>
          </div>
          <div>
            <h4 className="font-display font-semibold mb-3 text-sm">Product</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <Link to="/" className="block hover:text-foreground">Features</Link>
              <Link to="/" className="block hover:text-foreground">Pricing</Link>
              <Link to="/library" className="block hover:text-foreground">Library</Link>
            </div>
          </div>
          <div>
            <h4 className="font-display font-semibold mb-3 text-sm">Company</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <Link to="/contact" className="block hover:text-foreground">Contact</Link>
              <Link to="/jobs" className="block hover:text-foreground">Careers</Link>
              <Link to="/affiliate" className="block hover:text-foreground">Affiliate</Link>
            </div>
          </div>
          <div>
            <h4 className="font-display font-semibold mb-3 text-sm">Legal</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <Link to="/privacy-policy" className="block hover:text-foreground">Privacy Policy</Link>
              <Link to="/security-letter" className="block hover:text-foreground">Security</Link>
              <Link to="/affiliate-terms" className="block hover:text-foreground">Affiliate Terms</Link>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border/50 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} PwezaCore. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
