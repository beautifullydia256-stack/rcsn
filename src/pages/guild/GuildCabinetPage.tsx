import React, { useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';
import {
  Users2,
  ShieldCheck,
  Landmark,
  Phone,
  Mail,
  Award,
  BookOpen,
  HeartPulse,
  Trophy,
  Wallet,
  Sparkles,
  MessageSquare,
  ChevronRight
} from 'lucide-react';

interface CabinetMember {
  id: string;
  role: string;
  name: string;
  class_name: string;
  portfolio: string;
  phone?: string;
  email?: string;
  term: string;
}

export default function GuildCabinetPage() {
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const cabinet: CabinetMember[] = [
    {
      id: 'c1',
      role: 'Guild President',
      name: 'H.E. Jonathan Kato',
      class_name: 'Senior 6 Arts',
      portfolio: 'Executive governance, student representation, and senate oversight',
      phone: '+256 701 445 889',
      email: 'guild.president@rips.sch',
      term: '2026/2027',
    },
    {
      id: 'c2',
      role: 'Vice President',
      name: 'Hon. Brenda Akello',
      class_name: 'Senior 5 Science',
      portfolio: 'Cabinet coordination, academic integrity, and disciplinary liaison',
      phone: '+256 772 334 112',
      email: 'guild.vp@rips.sch',
      term: '2026/2027',
    },
    {
      id: 'c3',
      role: 'Minister of Finance & Treasury',
      name: 'Hon. Ivan Wasswa',
      class_name: 'Senior 6 PCM',
      portfolio: 'Guild fees budget oversight, project disbursements, and audit slips',
      phone: '+256 755 889 001',
      email: 'guild.finance@rips.sch',
      term: '2026/2027',
    },
    {
      id: 'c4',
      role: 'Minister of Health & Welfare',
      name: 'Hon. Grace Namubiru',
      class_name: 'Senior 5 PCB',
      portfolio: 'Sickbay inspections, hostel sanitation, and cafeteria dining quality',
      phone: '+256 703 112 990',
      email: 'guild.welfare@rips.sch',
      term: '2026/2027',
    },
    {
      id: 'c5',
      role: 'Minister of Academic Affairs',
      name: 'Hon. David Okello',
      class_name: 'Senior 6 BCM',
      portfolio: 'Prep timetables, library access, and examination hall conditions',
      phone: '+256 788 443 221',
      email: 'guild.academics@rips.sch',
      term: '2026/2027',
    },
    {
      id: 'c6',
      role: 'Minister of Sports & Entertainment',
      name: 'Hon. Ronald Ssebaggala',
      class_name: 'Senior 4 East',
      portfolio: 'Inter-house tournaments, sports equipment, and weekend entertainment',
      phone: '+256 752 990 443',
      email: 'guild.sports@rips.sch',
      term: '2026/2027',
    },
  ];

  return (
    <div
      className="p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-none"
      style={{
        backgroundColor: t.screenBg,
        color: t.textHi,
        fontFamily: INTER,
      }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md"
              style={{
                backgroundColor: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)',
                color: t.mint,
                fontFamily: SORA,
              }}
            >
              GUILD EXECUTIVE CABINET
            </span>
            <span className="text-xs" style={{ color: t.textLow }}>• Term 2026/2027</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold mt-1 tracking-tight"
            style={{ fontFamily: SORA, color: t.textHi }}
          >
            Ministers & Executive Portfolios
          </h1>
          <p className="text-sm mt-0.5" style={{ color: t.textMid }}>
            The official student council leadership and ministerial cabinet appointed to represent the student body.
          </p>
        </div>

        <div
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold"
          style={{
            backgroundColor: t.panel,
            borderColor: t.stroke,
            color: t.mint,
          }}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Tenure Certified by Dean of Students</span>
        </div>
      </div>

      {/* Cabinet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {cabinet.map((m) => (
          <div
            key={m.id}
            className="p-5 rounded-3xl border transition-all hover:scale-[1.01] flex flex-col justify-between"
            style={{
              background: cardGrad(isDark),
              borderColor: t.stroke,
            }}
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base"
                    style={{
                      background: isDark ? 'rgba(16,217,168,0.15)' : 'rgba(16,185,129,0.12)',
                      color: t.mint,
                    }}
                  >
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                      style={{
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                        color: t.mint,
                      }}
                    >
                      {m.role}
                    </span>
                    <h3 className="text-base font-bold mt-1" style={{ color: t.textHi }}>
                      {m.name}
                    </h3>
                    <div className="text-xs font-medium" style={{ color: t.textLow }}>
                      {m.class_name}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t text-xs leading-relaxed" style={{ borderColor: t.stroke, color: t.textMid }}>
                {m.portfolio}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t space-y-1.5" style={{ borderColor: t.stroke }}>
              <div className="flex items-center gap-2 text-[11px]" style={{ color: t.textLow }}>
                <Phone className="w-3.5 h-3.5" />
                <span>{m.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]" style={{ color: t.textLow }}>
                <Mail className="w-3.5 h-3.5" />
                <span>{m.email}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
