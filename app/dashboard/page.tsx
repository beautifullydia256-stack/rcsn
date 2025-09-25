'use client';

import { useEffect, useState } from 'react';

interface Assignment {
  class_name: string;
  subject: string;
}

export default function TeacherDashboard() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/teacher/assignments', { cache: 'no-store' });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to fetch assignments');
          setAssignments([]);
        } else {
          setAssignments(data.assignments || []);
          setError(null);
        }
      } catch (e: any) {
        setError(e.message || 'An error occurred');
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Classes & Subjects</h1>

      {loading && <p>Loading your classes…</p>}

      {!loading && error && (
        <p className="text-red-500">Error: {error}</p>
      )}

      {!loading && !error && assignments.length === 0 && (
        <p>No Classes Assigned. You haven't been assigned to any classes yet. Contact your administrator.</p>
      )}

      {!loading && !error && assignments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((a, idx) => (
            <div
              key={idx}
              className="border rounded p-4 shadow-sm hover:shadow-md transition"
            >
              <p className="font-semibold">{a.class_name}</p>
              <p>{a.subject}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
