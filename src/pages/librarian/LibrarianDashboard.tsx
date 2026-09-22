import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  BookMarked,
  Clock,
  DollarSign,
  Search,
  Plus,
  ArrowRight,
  TrendingUp,
  Download,
  ShoppingBag,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '../../styles/posThemeTokens';

export default function LibrarianDashboard() {
  const navigate = useNavigate();
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const kpis = [
    {
      label: 'Total Books Cataloged',
      val: '4,850',
      sub: 'Across 10 Dewey classes',
      icon: <BookOpen className="w-4 h-4 text-purple-400" />,
    },
    {
      label: 'Active Loans Today',
      val: '184',
      sub: 'Borrowed by students & staff',
      icon: <BookMarked className="w-4 h-4 text-emerald-400" />,
    },
    {
      label: 'Overdue Books',
      val: '28',
      sub: 'Require urgent return',
      icon: <Clock className="w-4 h-4 text-amber-400" />,
    },
    {
      label: 'Outstanding Fines',
      val: 'UGX 142,000',
      sub: 'Defaulter ledger total',
      icon: <DollarSign className="w-4 h-4 text-rose-400" />,
    },
  ];

  const recentCirculation = [
    {
      student: 'Grace Nakato',
      className: 'Senior 4 West',
      title: 'Things Fall Apart - Chinua Achebe',
      action: 'Borrowed',
      date: 'Today, 10:15 AM',
      due: '06 Oct 2026',
    },
    {
      student: 'Ronald Mugerwa',
      className: 'Senior 3 East',
      title: 'Principles of Physics for East Africa',
      action: 'Returned',
      date: 'Today, 09:30 AM',
      due: 'On Time',
    },
    {
      student: 'Sarah Namutebi',
      className: 'Senior 6 Arts',
      title: 'Song of Lawino & Ocol - Okot p’Bitek',
      action: 'Borrowed',
      date: 'Today, 08:45 AM',
      due: '06 Oct 2026',
    },
    {
      student: 'Emmanuel Ssenkungu',
      className: 'Senior 2 East',
      title: 'Oxford Advanced Learner’s Dictionary',
      action: 'Returned',
      date: 'Yesterday',
      due: 'On Time',
    },
  ];

  const popularTitles = [
    { title: 'Things Fall Apart', author: 'Chinua Achebe', category: '800 Literature', loans: 48 },
    { title: 'Pure Mathematics for Advanced Level', author: 'B.D. Bunday', category: '510 Mathematics', loans: 42 },
    { title: 'Song of Lawino', author: 'Okot p’Bitek', category: '800 Literature', loans: 39 },
    { title: 'Longman Certificate Biology', author: 'Janet & Martin', category: '570 Biology', loans: 35 },
  ];

  return (
    <div style={{ width: '100%', maxWidth: 'none', padding: '24px 32px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: tk.text, margin: 0 }}>
            Library Dashboard
          </h1>
          <p style={{ fontFamily: INTER, fontSize: 13, color: tk.subText, margin: '4px 0 0' }}>
            Circulation desk statistics, catalog search, and textbook inventory.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard/librarian/circulation')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#8b5cf6',
              color: '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <BookMarked className="w-4 h-4" />
            <span>Circulation Desk</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/librarian/catalog')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
              border: `1px solid ${tk.cardBorder}`,
              color: tk.text,
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Search className="w-4 h-4" />
            <span>Search Catalog</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 28 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: tk.subText, fontWeight: 600 }}>{k.label}</span>
              {k.icon}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: tk.text, fontFamily: SORA }}>{k.val}</div>
            <div style={{ fontSize: 11, color: tk.subText, marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Two-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
        {/* Recent Circulation */}
        <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: tk.text, fontFamily: SORA }}>
                Live Circulation Stream
              </h3>
              <div style={{ fontSize: 12, color: tk.subText, marginTop: 2 }}>Issues and returns processed today</div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/librarian/circulation')}
              style={{ background: 'transparent', border: 'none', color: '#8b5cf6', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <span>Desk</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentCirculation.map((rc, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${tk.cardBorder}`,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: tk.text }}>{rc.title}</div>
                  <div style={{ fontSize: 11, color: tk.subText }}>
                    {rc.student} ({rc.className}) • {rc.date}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: rc.action === 'Borrowed' ? 'rgba(139,92,246,0.15)' : 'rgba(16,185,129,0.15)',
                      color: rc.action === 'Borrowed' ? '#8b5cf6' : '#10b981',
                    }}
                  >
                    {rc.action}
                  </span>
                  <div style={{ fontSize: 10, color: tk.subText, marginTop: 2 }}>Due: {rc.due}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Books */}
        <div style={{ background: cardGrad(isDark), border: `1px solid ${tk.cardBorder}`, borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: tk.text, fontFamily: SORA }}>
                Most Borrowed Books This Term
              </h3>
              <div style={{ fontSize: 12, color: tk.subText, marginTop: 2 }}>Curriculum text & literature popularity</div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/librarian/catalog')}
              style={{ background: 'transparent', border: 'none', color: '#8b5cf6', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <span>Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {popularTitles.map((pt, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${tk.cardBorder}`,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: tk.text }}>{pt.title}</div>
                  <div style={{ fontSize: 11, color: tk.subText }}>
                    {pt.author} • <span style={{ color: '#8b5cf6' }}>{pt.category}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: tk.text }}>{pt.loans}</div>
                  <div style={{ fontSize: 10, color: tk.subText }}>borrows</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
