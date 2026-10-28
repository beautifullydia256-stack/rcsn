import { ChevronRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SettingsExtraNavItem, SettingsTabKey } from '../settingsNavConfig';
import { SETTINGS_SECTIONS, getSettingsSections, getSettingsExtraNav } from '../settingsNavConfig';
import { useSchoolType } from '@/hooks/useSchoolType';
import '@/styles/government-system.css';

type Row =
  | { type: 'section'; id: SettingsTabKey; title: string; description: string }
  | { type: 'link'; item: SettingsExtraNavItem };

function rowGroup(r: Row): string {
  return r.type === 'section'
    ? SETTINGS_SECTIONS.find((s) => s.id === r.id)?.group ?? 'Other'
    : r.item.group;
}

function groupRows(rows: Row[]): { group: string; rows: Row[] }[] {
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    const g = rowGroup(r);
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(r);
  }
  const order = ['Academic', 'School', 'More', 'Shortcuts'];
  return order
    .filter((k) => map.has(k))
    .map((group) => ({ group, rows: map.get(group)! }));
}

function rowSearchText(r: Row): string {
  if (r.type === 'section') {
    return `${r.title} ${r.description}`.toLowerCase();
  }
  return `${r.item.title} ${r.item.description}`.toLowerCase();
}

export default function SettingsMasterList({
  activeSection,
  onSelectSection,
  onNavigate,
  schoolProfile,
  onSchoolProfileClick,
}: {
  activeSection: SettingsTabKey | null;
  onSelectSection: (id: SettingsTabKey) => void;
  onNavigate: (to: string) => void;
  schoolProfile: { name: string; logoUrl: string | null; subtitle: string | null } | null;
  onSchoolProfileClick?: () => void;
}) {
  const { isTertiary } = useSchoolType();
  const [q, setQ] = useState('');
  const norm = q.trim().toLowerCase();

  const sections = useMemo(() => getSettingsSections(isTertiary), [isTertiary]);

  const filteredGroups = useMemo(() => {
    const sectionRows: Row[] = sections.map((s) => ({
      type: 'section' as const,
      id: s.id,
      title: s.title,
      description: s.description,
    }));
    const linkRows: Row[] = getSettingsExtraNav(isTertiary).map((item) => ({ type: 'link' as const, item }));
    const all = [...sectionRows, ...linkRows];
    const schoolHay = schoolProfile
      ? `${schoolProfile.name} ${schoolProfile.subtitle ?? ''}`.toLowerCase()
      : '';
    const filtered =
      norm && schoolHay.includes(norm)
        ? all
        : norm
          ? all.filter((r) => rowSearchText(r).includes(norm))
          : all;
    return groupRows(filtered);
  }, [norm, schoolProfile, sections, isTertiary]);

  return (
    <div className="space-y-4 pb-[calc(var(--pw-botnav-h,64px)+env(safe-area-inset-bottom,0px)+16px)] md:pb-12">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#777777]"
          aria-hidden
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="SEARCH CONFIGURATION MODULES…"
          autoComplete="off"
          className="gov-input w-full pl-8 py-2 text-xs"
          aria-label="Search settings"
        />
      </div>

      {schoolProfile && (
        <button
          type="button"
          onClick={() => onSchoolProfileClick?.()}
          className="gov-card flex w-full items-center gap-3 rounded-lg border border-[#CCCCCC] bg-white p-3 text-left transition-colors hover:bg-[#F9FAFB]"
          aria-label={`${schoolProfile.name}. Open institutional identity.`}
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-[#CCCCCC] bg-[#F4F4F5]">
            {schoolProfile.logoUrl ? (
              <img
                src={schoolProfile.logoUrl}
                alt=""
                className="h-full w-full object-contain p-0.5"
              />
            ) : (
              <span className="text-sm font-mono font-bold text-[#333333]" aria-hidden>
                {schoolProfile.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold uppercase font-sans text-[#111111]">
              {schoolProfile.name}
            </span>
            <span className="block truncate text-[10px] font-mono text-[#666666]">
              INSTITUTIONAL IDENTITY & BRANDING
            </span>
          </span>
          <ChevronRight
            className="h-3.5 w-3.5 shrink-0 text-[#888888]"
            aria-hidden
          />
        </button>
      )}

      <nav aria-label="Settings sections" className="space-y-4">
        {norm && filteredGroups.length === 0 ? (
          <p className="gov-card rounded-lg border border-[#CCCCCC] bg-white p-4 text-center text-xs font-mono text-[#666666]">
            NO CONFIGURATION MODULES MATCH &quot;{q.trim().toUpperCase()}&quot;.
          </p>
        ) : null}
        {filteredGroups.map(({ group, rows }) => (
          <div key={group} className="space-y-1">
            <p className="px-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#666666]">
              {group}
            </p>
            <div className="gov-card overflow-hidden rounded-lg border border-[#CCCCCC] bg-white">
              <ul className="divide-y divide-[#E5E5E5]">
                {rows.map((row) => {
                  if (row.type === 'section') {
                    const meta = SETTINGS_SECTIONS.find((s) => s.id === row.id)!;
                    const Icon = meta.icon;
                    const isActive = activeSection === row.id;
                    return (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => onSelectSection(row.id)}
                          className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                            isActive
                              ? 'bg-[#EAEAEA] font-bold text-[#111111]'
                              : 'hover:bg-[#F9FAFB] text-[#333333]'
                          }`}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[#CCCCCC] bg-[#F8F9FA] text-[#111111]">
                            <Icon className="h-3.5 w-3.5" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs uppercase font-sans tracking-tight">
                              {row.title}
                            </span>
                          </span>
                          <ChevronRight
                            className="h-3.5 w-3.5 shrink-0 text-[#888888]"
                            aria-hidden
                          />
                        </button>
                      </li>
                    );
                  }
                  const { item } = row;
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <button
                        type="button"
                        onClick={() => onNavigate(item.to)}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[#F9FAFB] text-[#333333]"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[#CCCCCC] bg-[#F8F9FA] text-[#111111]">
                          <Icon className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs uppercase font-sans tracking-tight">
                            {item.title}
                          </span>
                        </span>
                        <ChevronRight
                          className="h-3.5 w-3.5 shrink-0 text-[#888888]"
                          aria-hidden
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
