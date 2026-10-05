import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Stethoscope,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Award
} from 'lucide-react';
import RcsnNavbar from '@/components/website/RcsnNavbar';
import RcsnFooter from '@/components/website/RcsnFooter';
import AdmissionsModal from '@/components/website/AdmissionsModal';
import SeoHead from '@/components/website/SeoHead';

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
      <SeoHead
        title="Hospital Clinical Training & Rotation Partners | RCSN Rakai Uganda"
        description="Hands-on clinical rotations across 7 partner hospitals including Rakai General Hospital and Masaka Regional Referral Hospital. Supervised laboratory simulation."
        canonicalPath="/clinical-training"
        image="https://www.rcsn.ac.ug/images/rcsn/lab.webp"
        imageAlt="Skills Demonstration Laboratory at Rakai Community School of Nursing"
      />
      <RcsnNavbar onOpenAdmissions={() => setAdmissionsOpen(true)} />

      <main className="flex-1">
        {/* Header - Solid Dark Slate */}
        <section className="bg-slate-950 text-white py-16 lg:py-24 relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="/images/rcsn/lab.webp"
              alt="Skills Demonstration Laboratory at Rakai Community School of Nursing"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/65 to-slate-950/45" />
          </div>

          <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="max-w-4xl space-y-4">
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                Clinical Training & Partner Hospitals
              </h1>
              <p className="text-lg sm:text-xl text-slate-200 leading-relaxed font-normal drop-shadow">
                RCSN collaborates with 7 major health facilities and regional referral hospitals in Uganda, ensuring
                our students receive authentic, supervised ward rotations.
              </p>
            </div>
          </div>
        </section>

        {/* Skills Lab Showcase */}
        <section id="skills-lab" className="scroll-mt-28 py-16 lg:py-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              <div className="lg:col-span-6 space-y-6">
                <div>
                  <span className="text-xs font-bold text-[#00873E] dark:text-emerald-400 uppercase tracking-widest block mb-1">
                    Demonstration Laboratory
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                    Clinical Skills Simulation Lab
                  </h2>
                </div>
                <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  Before hospital attachment, students master hands-on procedures under tutor supervision with actual patient beds, monitors, and delivery models.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-[#00873E] mb-2" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Ward Simulation</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Beds, vitals monitors, IV lines & catheterization.</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-[#00873E] mb-2" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Maternity Models</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Delivery mechanics & newborn resuscitation.</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-[#00873E] mb-2" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Infection Control</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sterile technique, surgical scrub & PPE standards.</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 group relative">
                  <img
                    src="/images/rcsn/rcsn-skills-lab-practical.webp"
                    alt="Clinical Skills Demonstration Laboratory with Beds and Equipment"
                    className="w-full h-80 sm:h-96 lg:h-[420px] object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 text-white">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                      Campus Demonstration Facility
                    </span>
                    <h4 className="text-lg font-bold">Skills Simulation Lab in Action</h4>
                    <p className="text-xs text-slate-200 mt-0.5">
                      Fully equipped with hospital patient beds, maternal delivery models, and diagnostic tools.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Clinical Faculty & Preceptors */}
        <section id="faculty" className="py-16 lg:py-20 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              <div className="lg:col-span-6 lg:order-2 space-y-5">
                <div>
                  <span className="text-xs font-bold text-[#00873E] dark:text-emerald-400 uppercase tracking-widest block mb-1">
                    Clinical Faculty
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                    Qualified Clinical Instructors & Medical Tutors
                  </h2>
                </div>
                <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  Our clinical tutors accompany students directly onto hospital wards, mentoring them through real patient care under UNMC standards.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                      <ShieldCheck className="w-4 h-4 text-[#00873E]" />
                      <span>Bedside Mentorship</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Low tutor-to-student attachment ratio with daily ward reviews.</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                      <Award className="w-4 h-4 text-[#00873E]" />
                      <span>UNMC Certified</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Practicing specialists across maternal health, pediatrics, and surgery.</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 lg:order-1">
                <div className="rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 group relative">
                  <img
                    src="/images/rcsn/rcsn-clinical-tutors.webp"
                    alt="Senior Clinical Instructors and Medical Tutors in Clinical White Coats"
                    className="w-full h-80 sm:h-96 lg:h-[420px] object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 text-white">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                      Faculty Leadership
                    </span>
                    <h4 className="text-lg font-bold">RCSN Clinical Tutors & Preceptors</h4>
                    <p className="text-xs text-slate-200 mt-0.5">
                      Leading hospital ward attachments and practical examination preparations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Morning Assembly Briefing & Clinical Orientation */}
        <section id="briefings" className="py-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-slate-50 dark:bg-slate-800/60 p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-slate-700">
              <div className="md:col-span-5 rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 h-64 sm:h-72">
                <img
                  src="/images/rcsn/rcsn-hall-briefing.webp"
                  alt="Clinical Assembly Briefing and Roll Call in Campus Hall"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="md:col-span-7 space-y-4">
                <span className="text-xs font-bold text-[#00873E] uppercase tracking-wider block">
                  Daily Hospital Readiness
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  Morning Clinical Briefing & Shift Alignment
                </h3>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  Every clinical rotation morning begins with roll calls, infection prevention inspection, and duty allocation in the assembly hall. Tutors review patient confidentiality and clinical ethics before buses depart for partner hospitals.
                </p>
                <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300 pt-2">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00873E]" />
                    Ward Duty Rosters
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00873E]" />
                    Uniform & Hygiene Audits
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00873E]" />
                    Emergency Protocol Reviews
                  </span>
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
