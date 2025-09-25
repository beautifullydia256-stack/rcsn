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
      try {
        const res = await fetch('/api/teacher/assignments', { cache: 'no-store' });
        const data = await res.json();

        if (res.ok) {
          setAssignments(data.assignments || []);
        } else {
          setError(data.error || 'Failed to fetch assignments.');
        }
      } catch (err: any) {
        setError(err?.message || 'Internal error.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">Loading assignments…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700">
          No Classes Assigned<br />
          You haven't been assigned to any classes yet. Contact your administrator.
        </p>
      </div>
    );
  }

  // Group assignments by class for easier display
  const groupedAssignments = assignments.reduce<Record<string, string[]>>((acc, a) => {
    if (!acc[a.class_name]) acc[a.class_name] = [];
    acc[a.class_name].push(a.subject);
    return acc;
  }, {});

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Your Classes & Subjects</h1>
      <div className="space-y-4">
        {Object.entries(groupedAssignments).map(([className, subjects]) => (
          <div key={className} className="p-4 border rounded shadow-sm">
            <h2 className="font-semibold text-lg">{className}</h2>
            <ul className="list-disc list-inside mt-2">
              {subjects.map((subject) => (
                <li key={subject}>{subject}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
