export default function SectionHeader({
  eyebrow,
  title,
  desc,
}: {
  eyebrow?: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="mb-6 space-y-1">
      {eyebrow && (
        <p className="mb-0 flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.2em] text-emerald-500 dark:text-[#00e5c3]">
          <span className="inline-block h-0.5 w-3.5 shrink-0 rounded-sm bg-emerald-500 dark:bg-[#00e5c3]" aria-hidden />
          {eyebrow}
        </p>
      )}
      <h2
        className="text-xl font-normal tracking-tight ac-text-primary sm:text-2xl"
        style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
      >
        {title}
      </h2>
      {desc && (
        <p className="max-w-3xl text-[13px] leading-relaxed text-slate-600 dark:text-[#b0bdd8]">{desc}</p>
      )}
    </div>
  );
}
