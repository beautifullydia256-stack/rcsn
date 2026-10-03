import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Stethoscope,
  Building2,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import RcsnNavbar from '@/components/website/RcsnNavbar';
import RcsnFooter from '@/components/website/RcsnFooter';
import AdmissionsModal from '@/components/website/AdmissionsModal';

export default function ClinicalTrainingPage() {
  const location = useLocation();
  const [admissionsOpen, setAdmissionsOpen] = useState(false);

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

  // Strictly the 7 official partner hospitals from the school catalog with genuine facility photos
  const hospitals = [
    {
      name: 'Masaka Regional Referral Hospital',
      location: 'Masaka City',
      role: 'Regional Referral & Clinical Teaching Partner',
      image: '/images/hospitals/masaka.jpg',
    },
    {
      name: 'Rakai General Hospital',
      location: 'Rakai Town (Near Campus)',
      role: 'Primary District Clinical Teaching Partner',
      image: '/images/hospitals/rakai.jpg',
    },
    {
      name: 'Kalisizo General Hospital',
      location: 'Kalisizo Town Council',
      role: 'General Clinical Practicum Partner',
      image: '/images/hospitals/kalisizo.jpg',
    },
    {
      name: 'Lyantonde General Hospital',
      location: 'Lyantonde District',
      role: 'General Hospital Clinical Partner',
      image: '/images/hospitals/lyantonde.jpg',
    },
    {
      name: 'Mubende Regional Referral Hospital',
      location: 'Mubende District',
      role: 'Regional Referral Clinical Partner',
      image: '/images/hospitals/mubende.jpg',
    },
    {
      name: 'Kitovu Hospital (St. Joseph’s)',
      location: 'Kitovu, Masaka',
      role: 'Maternal & Surgical Teaching Partner',
      image: '/images/hospitals/kitovu.jpg',
    },
    {
      name: 'Kakuto Health Centre IV',
      location: 'Kakuto, Rakai',
      role: 'Primary Health Care & Community Health Partner',
      image: '/images/hospitals/kakuuto.jpg',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-[#00873E] selection:text-white">
      <RcsnNavbar onOpenAdmissions={() => setAdmissionsOpen(true)} />

      <main className="flex-1">
        {/* Header - Solid Dark Slate */}
        <section className="bg-slate-950 text-white py-16 lg:py-24 relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="/images/rcsn/lab.jpg"
              alt="Clinical Lab"
              className="w-full h-full object-cover brightness-50"
            />
            <div className="absolute inset-0 bg-slate-950/85" />
          </div>

          <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="max-w-4xl space-y-4">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800 text-emerald-400 text-sm font-bold uppercase tracking-wider">
                <Stethoscope className="w-4 h-4" />
                <span>Hands-on Clinical Training</span>
              </span>
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
                Clinical Training & Partner Hospitals
              </h1>
              <p className="text-lg sm:text-xl text-slate-300 leading-relaxed font-normal">
                RCSN collaborates with 7 major health facilities and regional referral hospitals in Uganda, ensuring
                our students receive authentic, supervised ward rotations.
              </p>
            </div>
          </div>
        </section>

        {/* Skills Lab Showcase */}
        <section id="skills-lab" className="scroll-mt-28 py-20 lg:py-24 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              <div className="lg:col-span-6 space-y-6">
                <span className="text-sm font-bold text-[#00873E] dark:text-emerald-400 uppercase tracking-widest block">
                  Demonstration Laboratory
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  The Clinical Skills Simulation Lab
                </h2>
                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  Before hospital attachment, students master essential procedures in our science and demonstration
                  laboratory under tutor supervision.
                </p>

                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-[#00873E] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        Full-Body Mannequins & Demonstration Models
                      </h4>
                      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        Students practice vital signs, patient hygiene, wound dressing, and clinical nursing procedures.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-[#00873E] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        Midwifery Delivery Simulators
                      </h4>
                      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        Simulation of antenatal palpation, delivery mechanics, and newborn resuscitation.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-[#00873E] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        Infection Prevention Protocols
                      </h4>
                      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        Strict training in sterile technique, surgical hand-washing, and medical waste management.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
                  <img
                    src="/images/rcsn/lab.jpg"
                    alt="Skills Lab"
                    className="w-full h-80 sm:h-96 lg:h-[480px] object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7 Hospital Partners Grid */}
        <section id="hospitals" className="scroll-mt-28 py-20 lg:py-24 bg-slate-50 dark:bg-slate-950">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="text-center max-w-4xl mx-auto mb-16 space-y-3">
              <span className="text-sm font-bold text-[#00873E] dark:text-emerald-400 uppercase tracking-widest">
                Clinical Attachments
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Partner Teaching Hospitals
              </h2>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
                Major healthcare facilities where our students gain continuous bedside clinical practice.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {hospitals.map((h, i) => (
                <div
                  key={h.name}
                  className="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-all hover:shadow-xl"
                >
                  <div className="h-52 w-full relative bg-slate-800 overflow-hidden">
                    <img
                      src={h.image}
                      alt={h.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3.5 left-3.5 bg-[#005C29] text-white text-xs sm:text-sm font-bold px-3 py-1.5 rounded-lg shadow">
                      Hospital {i + 1}
                    </div>
                  </div>

                  <div className="p-7 sm:p-8 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                          {h.name}
                        </h3>
                        <ShieldCheck className="w-5 h-5 text-[#00873E] shrink-0 mt-0.5" />
                      </div>
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-4">
                        {h.location}
                      </p>

                      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 pt-4 border-t border-slate-100 dark:border-slate-800 leading-relaxed">
                        {h.role}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <RcsnFooter />
      <AdmissionsModal isOpen={admissionsOpen} onClose={() => setAdmissionsOpen(false)} />
    </div>
  );
}
