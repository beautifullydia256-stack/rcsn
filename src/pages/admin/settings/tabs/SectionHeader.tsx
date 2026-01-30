export default function SectionHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-4">
      <div className="font-medium text-white">{title}</div>
      {desc && <div className="text-sm text-white/70">{desc}</div>}
    </div>
  );
}
