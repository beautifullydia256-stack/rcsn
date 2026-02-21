export default function SectionHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-4">
      <div className="ac-text-primary font-medium">{title}</div>
      {desc && <div className="ac-text-secondary text-sm">{desc}</div>}
    </div>
  );
}
