import { Link } from "react-router-dom";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-gray-900 text-gray-300 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
          {/* Privacy & Security */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Privacy & Security</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/privacy-policy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/cookie-policy" className="hover:text-white transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link to="/security-letter" className="hover:text-white transition-colors">
                  Security Letter
                </Link>
              </li>
              <li>
                <Link to="/recruitment-privacy-notice" className="hover:text-white transition-colors">
                  Privacy Notice for Recruitment
                </Link>
              </li>
              <li>
                {/* Removed PAIA Manual link per request */}
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="grid grid-cols-2 gap-3 sm:gap-2">
              <li>
                <Link to="/" className="hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-white transition-colors">Features</Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
              </li>
              <li>
                <Link to="/support" className="hover:text-white transition-colors">Support</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">Login</Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-white transition-colors">Sign Up</Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-400">
          © {year} PwezaCore. All rights reserved. · Contact: <a href="tel:+256778976805" className="hover:text-white">+256778976805</a>
        </div>
      </div>
    </footer>
  );
}


