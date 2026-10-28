export default function SectionHeader({
  eyebrow,
  badge,
  title,
  desc,
  embedded,
}: {
  eyebrow?: string;
  badge?: string;
  title: string;
  desc?: string;
  embedded?: boolean;
}) {
  if (embedded) {
    return null;
  }
  const tag = badge || eyebrow;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#CCCCCC] pb-3">
      <div className="flex items-center gap-3">
        <h2 className="text-[15px] font-bold tracking-tight text-[#111111] uppercase font-sans">
          {title}
        </h2>
        {tag && (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-bold bg-[#EAEAEA] text-[#222222] border border-[#CCCCCC]">
            {tag}
          </span>
        )}
      </div>
    </div>
  );
}
