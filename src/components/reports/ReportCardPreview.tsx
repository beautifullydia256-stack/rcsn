/**
 * Renders one report card from report_data (school header + student results).
 * Matches the old 2f00b44 layout: logo, school name, contact, motto, then student report.
 */
import { formatAverageWhole } from '../../lib/reportUtils';

export function ReportCardPreview({ reportData }: { reportData: any }) {
  if (!reportData?.students?.[0]) return null;
  const school = reportData.school || {};
  const examSet = reportData.examSet || {};
  const student = reportData.students[0];
  const summary = student.summary || {};
  const results = student.results || [];
  const comments = student.comments || {};

  return (
    <div className="bg-white text-gray-900 shadow-lg p-6 rounded-lg" style={{ minHeight: '297mm', width: '210mm', maxWidth: '100%' }}>
      {/* School header */}
      <div className="flex items-start gap-4 border-b border-gray-200 pb-4 mb-4">
        {school.logo_url ? (
          <img src={school.logo_url} alt="School logo" className="w-16 h-16 object-contain flex-shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400 text-xs text-center">
            Logo
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900">{school.name || 'School'}</h1>
          {school.address && <p className="text-sm text-gray-600">{school.address}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-0 text-sm text-gray-600 mt-1">
            {school.email && <span>{school.email}</span>}
            {school.phone && <span>{school.phone}</span>}
          </div>
          {school.motto && <p className="text-sm text-gray-500 italic mt-1">&quot;{school.motto}&quot;</p>}
        </div>
      </div>

      {/* Student and term */}
      <div className="flex justify-between items-baseline mb-4">
        <div>
          <p className="font-semibold text-gray-900">{student.name || 'Student'}</p>
          <p className="text-sm text-gray-600">
            {student.current_class || ''} · {student.admission_number || '—'}
          </p>
        </div>
        <p className="text-sm text-gray-600">
          Term {examSet.term ?? '—'}, {examSet.year ?? '—'}
        </p>
      </div>

      {/* Results table */}
      <table className="w-full border-collapse border border-gray-200 text-sm mb-4">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 px-2 py-2 text-left font-medium text-gray-700">Subject</th>
            <th className="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700">Marks</th>
            <th className="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700">Grade</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r: any, idx: number) => (
            <tr key={idx}>
              <td className="border border-gray-200 px-2 py-1.5 text-gray-800">{r.subject || '—'}</td>
              <td className="border border-gray-200 px-2 py-1.5 text-center">
                {r.marks_obtained ?? '—'} / {r.total_marks ?? '—'}
              </td>
              <td className="border border-gray-200 px-2 py-1.5 text-center font-medium">{r.grade || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 p-3 bg-gray-50 rounded-lg text-sm">
        <div>
          <span className="text-gray-600">Average:</span>{' '}
          <span className="font-semibold">
            {summary.average != null && summary.average !== ''
              ? `${formatAverageWhole(summary.average)}%`
              : '—'}
          </span>
        </div>
        <div><span className="text-gray-600">Position:</span> <span className="font-semibold">{summary.classPosition ?? '—'}</span></div>
        <div><span className="text-gray-600">Division:</span> <span className="font-semibold">{summary.division ?? '—'}</span></div>
        <div><span className="text-gray-600">Aggregate:</span> <span className="font-semibold">{summary.aggregate != null ? summary.aggregate.toFixed(1) : '—'}</span></div>
      </div>

      {/* Comments */}
      {(comments.class_teacher_text || comments.headteacher_text) && (
        <div className="space-y-2 text-sm border-t border-gray-200 pt-4">
          {comments.class_teacher_text && (
            <p><span className="font-medium text-gray-700">Class teacher:</span> <span className="text-gray-800">{comments.class_teacher_text}</span></p>
          )}
          {comments.headteacher_text && (
            <p><span className="font-medium text-gray-700">Headteacher:</span> <span className="text-gray-800">{comments.headteacher_text}</span></p>
          )}
        </div>
      )}
    </div>
  );
}
