import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  CheckCircle2,
  Building2,
  BookOpen,
  Navigation,
  MessageSquare,
  Layers,
  Compass
} from 'lucide-react';
import RcsnNavbar from '@/components/website/RcsnNavbar';
import RcsnFooter from '@/components/website/RcsnFooter';
import AdmissionsModal from '@/components/website/AdmissionsModal';
import SeoHead from '@/components/website/SeoHead';
import { submitContactInquiry } from '@/services/schoolPublicService';

export default function ContactPage() {
  const location = useLocation();
  const [admissionsOpen, setAdmissionsOpen] = useState(false);
  const [mapType, setMapType] = useState<'osm' | 'satellite' | 'hybrid'>('osm');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (location.hash) {
      const rawId = location.hash.replace('#', '');
      setTimeout(() => {
        const el = document.getElementById(rawId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }
  }, [location.hash]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setIsSubmitting(true);
    try {
      await submitContactInquiry({
        fullName: name,
        email,
        phone: phone || undefined,
        subject: subject || 'General Inquiry',
        message,
      });
      setSubmitted(true);
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      <SeoHead
        title="Contact Admissions & Administration | Rakai Town Campus — RCSN"
        description="Contact Rakai Community School of Nursing admissions desk. Call +256 772 846 174 or email admissions@rcsn.ac.ug. Located on Rakai–Byakabanda Road in Rakai, Uganda."
        canonicalPath="/contact"
        image="https://www.rcsn.ac.ug/images/rcsn/compound.webp"
        imageAlt="RCSN School Compound & Paved Walkways"
      />
      <RcsnNavbar onOpenAdmissions={() => setAdmissionsOpen(true)} />

      <main className="flex-1">
        {/* Header */}
        <section className="bg-slate-950 text-white py-16 lg:py-20 relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="/images/rcsn/compound.webp"
              alt="RCSN School Compound & Paved Walkways"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/65 to-slate-950/45" />
          </div>

          <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="max-w-4xl space-y-4">
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                Contact & Location Desk
              </h1>
              <p className="text-lg sm:text-xl text-slate-200 leading-relaxed font-normal drop-shadow">
                Connect with our admissions officers, academic registrar, and clinical preceptors. We are located in
                Rakai Town Council, adjacent to Rakai General Hospital.
              </p>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-20 lg:py-24 bg-white dark:bg-slate-900">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
              {/* Left Column: Contact Cards */}
              <div id="contact-info" className="scroll-mt-28 lg:col-span-5 space-y-6">
                <div>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest block mb-1">
                    Direct Inquiries
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                    Campus Contact Details
                  </h2>
                  <p className="text-base text-slate-600 dark:text-slate-400 mt-2">
                    Reach out through any of our official channels or visit us during official working hours.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-4">
                    <MapPin className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Physical Campus Location
                      </h4>
                      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        Off Rakai – Byakabanda Rd, Rakai Town Council, Rakai District Headquarters, Southwestern Uganda.
                        (Near Rakai General Hospital).
                      </p>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-4">
                    <BookOpen className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Postal Address
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        P.O. Box 321, Kyotera, Uganda
                      </p>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-4">
                    <Phone className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Telephone & WhatsApp Hotlines
                      </h4>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-semibold">
                        +256 (0) 772 000 000 / +256 (0) 700 000 000
                      </p>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-4">
                    <Mail className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Electronic Mail
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        info@rcsn.ac.ug • admissions@rcsn.ac.ug
                      </p>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-4">
                    <Clock className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Office Working Hours
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        Monday – Friday: 08:00 – 17:00 EAT (Closed on Weekends & Public Holidays)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Form */}
              <div className="lg:col-span-7">
                <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 shadow-xl">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
                    Send a Message to Admissions
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                    Our admissions coordinators will respond within 24 hours.
                  </p>

                  {submitted ? (
                    <div className="p-8 text-center space-y-4 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl border border-emerald-200 dark:border-emerald-800/50">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 mx-auto flex items-center justify-center">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                        Message Sent Successfully!
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                        Thank you for contacting Rakai Community School of Nursing. Our administrative team will reach out
                        via phone or email.
                      </p>
                      <button
                        type="button"
                        onClick={() => setSubmitted(false)}
                        className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold"
                      >
                        Send Another Message
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Florence Nabukenya"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. florence@gmail.com"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                            Telephone / WhatsApp
                          </label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="e.g. +256 772 000000"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                            Subject
                          </label>
                          <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="e.g. Course Requirements or Hostel Fees"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                          Your Inquiry / Message *
                        </label>
                        <textarea
                          rows={4}
                          required
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="How can we assist you with admissions or campus enrollment?..."
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#00873E] hover:bg-[#007033] disabled:opacity-50 text-white font-bold text-sm shadow-md transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isSubmitting ? 'Sending...' : 'Send Inquiry to Admissions'}</span>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* INTERACTIVE CAMPUS MAP (Official School Grounds, Aerial Satellite & Buildings View) */}
        {/* ========================================================================= */}
        <section id="map" className="scroll-mt-28 py-20 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <span className="text-sm font-bold text-[#00873E] uppercase tracking-widest block mb-1.5">
                  Official School Grounds & Buildings Map
                </span>
                <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  Campus Location & Physical Buildings Map
                </h3>
                <p className="text-base text-slate-600 dark:text-slate-400 mt-2 max-w-3xl leading-relaxed">
                  Interactive school map showing the official campus layout, surrounding Rakai Town Council roads, physical buildings, hostels, and proximity to Rakai General Hospital.
                </p>
              </div>

              {/* View Switcher Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setMapType('osm')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      mapType === 'osm'
                        ? 'bg-[#00873E] text-white shadow'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Official School Map (OSM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapType('satellite')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      mapType === 'satellite'
                        ? 'bg-[#00873E] text-white shadow'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Aerial Satellite (Rooftops)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapType('hybrid')}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      mapType === 'hybrid'
                        ? 'bg-[#00873E] text-white shadow'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Hybrid + Roads
                  </button>
                </div>

                <a
                  href="https://www.openstreetmap.org/?mlat=-0.7199966&mlon=31.4061384#map=16/-0.7199966/31.4061384"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow transition-colors shrink-0"
                >
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Open Fullscreen</span>
                </a>
              </div>
            </div>

            {/* Embedded Interactive Map & Buildings Directory Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Map Iframe */}
              <div className="lg:col-span-8 rounded-3xl overflow-hidden border-2 border-slate-200 dark:border-slate-800 shadow-xl bg-slate-950 relative">
                {mapType === 'osm' ? (
                  <iframe
                    title="Rakai Community School of Nursing Campus & Building Map (Official OpenStreetMap Engine)"
                    src="https://www.openstreetmap.org/export/embed.html?bbox=31.3961384%2C-0.7299966%2C31.4161384%2C-0.7099966&layer=mapnik&marker=-0.7199966%2C31.4061384"
                    className="w-full h-[460px] border-0"
                    loading="lazy"
                  />
                ) : mapType === 'satellite' ? (
                  <iframe
                    title="Rakai Community School of Nursing Aerial Satellite Buildings Map"
                    src="https://maps.google.com/maps?q=-0.7199966,31.4061384&t=k&z=18&output=embed"
                    className="w-full h-[460px] border-0"
                    loading="lazy"
                  />
                ) : (
                  <iframe
                    title="Rakai Community School of Nursing Hybrid Satellite & Road Map"
                    src="https://maps.google.com/maps?q=Rakai+Community+School+of+Nursing,+Rakai,+Uganda&t=h&z=17&output=embed"
                    className="w-full h-[460px] border-0"
                    loading="lazy"
                  />
                )}

                <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00873E] animate-pulse" />
                    <span className="font-semibold text-slate-200">
                      RCSN Campus: -0.7199966, 31.4061384 (Rakai-Byakabanda Rd, Rakai Town Council)
                    </span>
                  </div>
                  <a
                    href="https://www.google.com/maps/dir/?api=1&destination=-0.7199966,31.4061384"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 underline"
                  >
                    <span>Get Driving Directions</span>
                  </a>
                </div>
              </div>

              {/* Campus Buildings Guide Card */}
              <div className="lg:col-span-4 p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-md space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <Building2 className="w-5 h-5 text-[#00873E]" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Campus Buildings Directory
                  </h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Key physical structures and student training areas visible on the campus layout:
                </p>

                <div className="space-y-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white block">1. Main Administration Block</span>
                    <span className="text-slate-500 dark:text-slate-400">Principal's office, Academic Registrar, and UNMEB Exam Registry.</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white block">2. Skills Demonstration Laboratory</span>
                    <span className="text-slate-500 dark:text-slate-400">Anatomical mannequins, obstetric models, and nursing stations.</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white block">3. Lecture Halls & Assembly Complex</span>
                    <span className="text-slate-500 dark:text-slate-400">Multimedia classrooms, tutorial rooms, and seminar hall.</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white block">4. Student Residential Hostels</span>
                    <span className="text-slate-500 dark:text-slate-400">Dedicated female and male residential quarters with 24/7 security.</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white block">5. Rakai General Hospital (300m)</span>
                    <span className="text-slate-500 dark:text-slate-400">Close neighbor providing daily bedside clinical rotations.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Campus Physical Buildings Photo Gallery Showcase */}
            <div className="mt-12 pt-10 border-t border-slate-200 dark:border-slate-800">
              <div className="mb-6">
                <span className="text-xs font-bold text-[#00873E] uppercase tracking-wider block">
                  Campus Architecture & Facilities
                </span>
                <h4 className="text-xl font-black text-slate-900 dark:text-white">
                  Physical Buildings of Rakai Community School of Nursing
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Photographs of the physical campus blocks, compound, and training facilities shown on the map above.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Building 1: Main Admin Block */}
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shadow-sm hover:shadow-md transition-shadow flex flex-col group">
                  <div className="h-48 overflow-hidden relative">
                    <img
                      src="/images/rcsn/rcsn-principal-office.webp"
                      alt="The Principal in the Office of the Principal"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded bg-slate-900/80 text-emerald-400 text-xs font-bold">
                      Principal's Office
                    </span>
                  </div>
                  <div className="p-4 space-y-1">
                    <h5 className="text-sm font-bold text-slate-900 dark:text-white">Office of the Principal</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      The Principal's office where students, parents, and visitors are welcomed and receive institutional guidance.
                    </p>
                  </div>
                </div>

                {/* Building 2: Compound & Paved Walkways */}
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shadow-sm hover:shadow-md transition-shadow flex flex-col group">
                  <div className="h-48 overflow-hidden relative">
                    <img
                      src="/images/rcsn/compound.webp"
                      alt="School Compound & Paved Walkways"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded bg-slate-900/80 text-emerald-400 text-xs font-bold">
                      School Compound
                    </span>
                  </div>
                  <div className="p-4 space-y-1">
                    <h5 className="text-sm font-bold text-slate-900 dark:text-white">Compound & Paved Walkways</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      A clean, serene green compound with shade trees and paved stone pathways connecting all campus facilities.
                    </p>
                  </div>
                </div>

                {/* Building 3: Skills Demo Lab */}
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shadow-sm hover:shadow-md transition-shadow flex flex-col group">
                  <div className="h-48 overflow-hidden relative">
                    <img
                      src="/images/rcsn/lab.webp"
                      alt="Clinical Skills Demonstration Laboratory"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded bg-slate-900/80 text-emerald-400 text-xs font-bold">
                      Skills Simulation Lab
                    </span>
                  </div>
                  <div className="p-4 space-y-1">
                    <h5 className="text-sm font-bold text-slate-900 dark:text-white">Demonstration Laboratory</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Hospital patient beds, maternal delivery simulators, diagnostic sets, and procedural mannequins.
                    </p>
                  </div>
                </div>

                {/* Building 4: Hostels & Accommodation */}
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shadow-sm hover:shadow-md transition-shadow flex flex-col group">
                  <div className="h-48 overflow-hidden relative">
                    <img
                      src="/images/rcsn/hostels.webp"
                      alt="Student Boarding Hostels with Paved Pathways"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded bg-slate-900/80 text-emerald-400 text-xs font-bold">
                      Student Hostels
                    </span>
                  </div>
                  <div className="p-4 space-y-1">
                    <h5 className="text-sm font-bold text-slate-900 dark:text-white">Student Hostels & Accommodation</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Safe, comfortable on-campus hostels with paved stone pathways connecting student quarters to lecture halls.
                    </p>
                  </div>
                </div>

                {/* Building 5: Campus Environment */}
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shadow-sm hover:shadow-md transition-shadow flex flex-col group">
                  <div className="h-48 overflow-hidden relative">
                    <img
                      src="/images/rcsn/rcsn-campus-architecture.webp"
                      alt="Quiet Campus Grounds and Buildings"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded bg-slate-900/80 text-emerald-400 text-xs font-bold">
                      Campus Environment
                    </span>
                  </div>
                  <div className="p-4 space-y-1">
                    <h5 className="text-sm font-bold text-slate-900 dark:text-white">Quiet Campus Environment</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      A peaceful and calm environment surrounded by greenery, creating a great atmosphere for learning and student life.
                    </p>
                  </div>
                </div>

                {/* Building 6: Panoramic Overlook */}
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shadow-sm hover:shadow-md transition-shadow flex flex-col group">
                  <div className="h-48 overflow-hidden relative">
                    <img
                      src="/images/rcsn/rcsn-campus-panoramic.webp"
                      alt="View of Campus Grounds and Surrounding Hills"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded bg-slate-900/80 text-emerald-400 text-xs font-bold">
                      Campus Overlook
                    </span>
                  </div>
                  <div className="p-4 space-y-1">
                    <h5 className="text-sm font-bold text-slate-900 dark:text-white">Scenic Campus View</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      A beautiful view of our campus grounds and the surrounding green hills of Rakai.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <RcsnFooter />
      <AdmissionsModal isOpen={admissionsOpen} onClose={() => setAdmissionsOpen(false)} />
    </div>
  );
}
