import React from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  ShieldCheck,
  Award,
  BookOpen,
  ArrowRight,
  ExternalLink,
  HeartPulse,
  MessageCircle
} from 'lucide-react';
import FloatingWhatsApp from './FloatingWhatsApp';

export default function RcsnFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 text-slate-300 pt-16 pb-8 border-t border-emerald-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          {/* Column 1: School Identity & Brand */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                <img
                  src="/images/rcsn/logo.png"
                  alt="Rakai Community School of Nursing Crest"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight">
                  RAKAI COMMUNITY
                </h3>
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  School of Nursing
                </p>
                <p className="text-[11px] text-slate-400">
                  Established in 2003
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Uganda&apos;s premier destination for professional nursing and midwifery education. Dedicated to clinical competence and compassionate patient care.
            </p>

            {/* Accreditation Badges */}
            <div className="pt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-medium text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>MoES Registered</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-medium text-emerald-400">
                <Award className="w-3.5 h-3.5" />
                <span>BTVET: ME\VOC\071</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-medium text-amber-400">
                <Award className="w-3.5 h-3.5" />
                <span>UNMEB Center: U028</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-medium text-blue-400">
                <HeartPulse className="w-3.5 h-3.5" />
                <span>UNMC Accredited</span>
              </span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Navigation
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Home</span>
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                  <span>About RCSN</span>
                </Link>
              </li>
              <li>
                <Link to="/courses" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Academic Courses</span>
                </Link>
              </li>
              <li>
                <Link to="/admissions" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Admissions & Fees</span>
                </Link>
              </li>
              <li>
                <Link to="/admissions/track" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Track Application</span>
                </Link>
              </li>
              <li>
                <Link to="/clinical-training" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Clinical Rotations</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Academic Programs */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Programs of Study
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="pb-1 border-b border-slate-900">
                <span className="font-semibold text-slate-200 block">Certificate in Nursing</span>
                <span>2.5 Years (UCE Entry)</span>
              </li>
              <li className="pb-1 border-b border-slate-900">
                <span className="font-semibold text-slate-200 block">Certificate in Midwifery</span>
                <span>2.5 Years (UCE Entry)</span>
              </li>
              <li className="pb-1 border-b border-slate-900">
                <span className="font-semibold text-slate-200 block">Diploma in Nursing (Direct Entry)</span>
                <span>3.0 Years (UACE Entry)</span>
              </li>
              <li className="pb-1 border-b border-slate-900">
                <span className="font-semibold text-slate-200 block">Diploma in Midwifery (Direct Entry)</span>
                <span>3.0 Years (UACE Entry)</span>
              </li>
              <li>
                <span className="font-semibold text-slate-200 block">Diploma in Nursing / Midwifery (Extension)</span>
                <span>1.5 Years (UNMC Registered)</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Location */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Campus & Inquiries
            </h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Off Rakai – Byakabanda Rd, Rakai Town Council, Rakai District, Uganda
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>P.O. Box 321, Kyotera</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <a
                  href="tel:+256392878552"
                  className="text-slate-200 font-semibold hover:text-emerald-300 transition-colors"
                >
                  0392 878 552
                </a>
              </li>
              <li className="flex items-center gap-2.5 pt-1">
                <a
                  href="https://wa.me/256783399322?text=Hello%20Rakai%20Community%20School%20of%20Nursing,%20I%20would%20like%20to%20inquire%20about%20admissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] text-xs font-bold transition-all border border-[#25D366]/30"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Chat on WhatsApp: +256 783 399 322</span>
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>info@rcsn.ac.ug / admissions@rcsn.ac.ug</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Mon – Fri: 08:00 – 17:00</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>
            © {currentYear} Rakai Community School of Nursing. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link to="/login" className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
              Login
            </Link>
            <Link to="/contact" className="hover:text-slate-300 transition-colors">
              Admissions Desk
            </Link>
            <Link to="/about" className="hover:text-slate-300 transition-colors">
              Institutional Heritage
            </Link>
          </div>
        </div>
      </div>

      {/* Floating WhatsApp Action Button */}
      <FloatingWhatsApp />
    </footer>
  );
}
