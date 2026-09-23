import { ChevronRight, Mic, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SettingsExtraNavItem, SettingsTabKey } from '../settingsNavConfig';
import { SETTINGS_EXTRA_NAV, SETTINGS_SECTIONS, getSettingsSections, getSettingsExtraNav } from '../settingsNavConfig';
import { useSchoolType } from '@/hooks/useSchoolType';

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
  }, [norm, schoolProfile]);

  return (
    <div className="space-y-5 pb-[calc(var(--pw-botnav-h,64px)+env(safe-area-inset-bottom,0px)+16px)] md:pb-0">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 dark:text-slate-500"
          aria-hidden
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search"
          autoComplete="off"
          className="ac-input w-full rounded-2xl py-3 pl-10 pr-11 text-[16px] min-h-[48px] shadow-sm"
          aria-label="Search settings"
        />
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          title="Search is text only"
          aria-hidden
        >
          <Mic className="h-5 w-5" strokeWidth={1.75} />
        </span>
      </div>

      {schoolProfile && (
        <button
          type="button"
          onClick={() => onSchoolProfileClick?.()}
          className="flex w-full min-h-[72px] items-center gap-3 rounded-2xl border border-slate-200/25 bg-slate-100/80 p-3 text-left shadow-sm transition-colors hover:bg-slate-200/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:border-white/10 dark:bg-[#161d2a]/95 dark:hover:bg-[#1c2636]/95"
          aria-label={`${schoolProfile.name}. Open school branding.`}
        >
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200/40 bg-slate-200/50 dark:border-white/10 dark:bg-[#0f141c]">
            {schoolProfile.logoUrl ? (
              <img
                src={schoolProfile.logoUrl}
                alt=""
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <span className="text-lg font-semibold text-slate-500 dark:text-slate-400" aria-hidden>
                {schoolProfile.name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-semibold leading-tight text-slate-900 dark:text-[#e8eeff]">
              {schoolProfile.name}
            </span>
            <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-slate-600 dark:text-[#9aa8c4]">
              {schoolProfile.subtitle ? (
                <>
                  {schoolProfile.subtitle}
                  <span className="text-slate-400 dark:text-slate-500"> · </span>
                </>
              ) : null}
              Branding, fee structure, and school setup
            </span>
          </span>
          <ChevronRight
            className="h-[18px] w-[18px] shrink-0 text-slate-400 dark:text-slate-500"
            aria-hidden
          />
        </button>
      )}

      <nav aria-label="Settings sections" className="space-y-5">
        {norm && filteredGroups.length === 0 ? (
          <p className="rounded-2xl border border-slate-200/25 bg-slate-100/60 px-4 py-6 text-center text-sm text-slate-600 dark:border-white/10 dark:bg-[#161d2a]/80 dark:text-[#9aa8c4]">
            No settings match &quot;{q.trim()}&quot;. Try another word or clear the search.
          </p>
        ) : null}
        {filteredGroups.map(({ group, rows }) => (
          <div key={group}>
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {group}
            </p>
            <div className="overflow-hidden rounded-2xl border border-slate-200/25 bg-slate-100/80 shadow-sm dark:border-white/10 dark:bg-[#161d2a]/95">
              <ul className="divide-y divide-slate-200/30 dark:divide-white/10">
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
                          className={`flex w-full min-h-[52px] items-center gap-3 px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                            isActive
                              ? 'bg-slate-200/90 dark:bg-white/10'
                              : 'hover:bg-slate-200/60 dark:hover:bg-white/5'
                          }`}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white ${meta.iconBg}`}
                          >
                            <Icon className="h-4 w-4" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-medium leading-tight text-slate-900 dark:text-[#e8eeff]">
                              {row.title}
                            </span>
                            <span className="mt-0.5 block text-[12px] leading-snug text-slate-600 dark:text-[#9aa8c4]">
                              {row.description}
                            </span>
                          </span>
                          <ChevronRight
                            className="h-[18px] w-[18px] shrink-0 text-slate-400 dark:text-slate-500"
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
                        className="flex w-full min-h-[52px] items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-200/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:hover:bg-white/5"
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white ${item.iconBg}`}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-medium leading-tight text-slate-900 dark:text-[#e8eeff]">
                            {item.title}
                          </span>
                          <span className="mt-0.5 block text-[12px] leading-snug text-slate-600 dark:text-[#9aa8c4]">
                            {item.description}
                          </span>
                        </span>
                        <ChevronRight
                          className="h-[18px] w-[18px] shrink-0 text-slate-400 dark:text-slate-500"
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
