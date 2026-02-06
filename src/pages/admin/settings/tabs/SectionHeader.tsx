export default function SectionHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-4">
      <div className="font-medium text-gray-900">{title}</div>
      {desc && <div className="text-sm text-gray-600">{desc}</div>}
    </div>
  );
}
