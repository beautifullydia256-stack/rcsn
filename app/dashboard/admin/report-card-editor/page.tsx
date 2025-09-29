'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabase';
import dynamic from 'next/dynamic';
import 'grapesjs/dist/css/grapes.min.css';

// Import GrapesJS dynamically to avoid SSR issues

export default function ReportCardEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [useFallbackEditor, setUseFallbackEditor] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [cssContent, setCssContent] = useState('');
  const router = useRouter();
  // Use the imported supabase client

  // Initialize GrapesJS editor with proper Vercel compatibility
  useEffect(() => {
    const initEditor = async () => {
      if (!editorRef.current) return;

      try {
        // Set a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          setIsLoading(false);
          setSaveMessage('Editor failed to load. Please refresh the page.');
          console.error('GrapesJS loading timeout');
        }, 10000);

        // Check if we're in browser environment
        if (typeof window === 'undefined') {
          clearTimeout(timeoutId);
          setIsLoading(false);
          return;
        }

        // Dynamically import GrapesJS with proper error handling
        const grapesjs = await import('grapesjs');
        const grapesjsDefault = grapesjs.default;
        
        clearTimeout(timeoutId);

        const editorInstance = grapesjsDefault.init({
          container: editorRef.current,
          height: '100vh',
          width: '100%',
          storageManager: false,
          plugins: [],
          pluginsOpts: {},
          blockManager: {
            appendTo: '.blocks-container'
          },
          layerManager: {
            appendTo: '.layers-container'
          },
          traitManager: {
            appendTo: '.traits-container'
          },
          selectorManager: {
            appendTo: '.styles-container'
          },
          canvas: {
            styles: [
              'https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css'
            ]
          }
        });

        // Load default report card template
        loadDefaultTemplate(editorInstance);
        
        setEditor(editorInstance);
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing GrapesJS:', error);
        setIsLoading(false);
        setSaveMessage('Visual editor failed to load. Please refresh the page.');
      }
    };

    initEditor();
  }, []);

  // Load default report card template
  const loadDefaultTemplate = (editorInstance: any) => {
    const defaultTemplate = `
      <div class="report-card">
        <!-- Watermark -->
        <div class="watermark">SCHOOL LOGO</div>
        
        <!-- Header -->
        <div class="header">
          <div class="school-logo">
            <div style="text-align: center; font-size: 8px;">
              <div style="font-weight: bold;">SCHOOL</div>
              <div style="font-weight: bold;">LOGO</div>
            </div>
          </div>
          <div class="school-info">
            <div class="school-name">SCHOOL NAME</div>
            <div class="school-contact">Address, Phone, Email</div>
            <div class="school-motto">School Motto</div>
          </div>
        </div>

        <!-- Report Title -->
        <div class="report-title">
          STUDENT REPORT CARD
        </div>

        <!-- Student Information -->
        <div class="student-info">
          <div class="student-details">
            <div><strong>Student ID:</strong> [STUDENT_ID]</div>
            <div><strong>Name:</strong> [STUDENT_NAME]</div>
            <div><strong>Class:</strong> [STUDENT_CLASS]</div>
            <div><strong>Term:</strong> [TERM]</div>
            <div><strong>Year:</strong> [YEAR]</div>
          </div>
          <div class="student-photo">
            <div style="font-size: 10px; color: #666;">PHOTO</div>
          </div>
        </div>

        <!-- Results Table -->
        <table class="results-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Marks Obtained</th>
              <th>Total Marks</th>
              <th>Grade</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>[SUBJECT_1]</td>
              <td>[MARKS_1]</td>
              <td>[TOTAL_1]</td>
              <td>[GRADE_1]</td>
              <td>[REMARK_1]</td>
            </tr>
            <tr>
              <td>[SUBJECT_2]</td>
              <td>[MARKS_2]</td>
              <td>[TOTAL_2]</td>
              <td>[GRADE_2]</td>
              <td>[REMARK_2]</td>
            </tr>
          </tbody>
        </table>

        <!-- Summary -->
        <div class="summary">
          <h3>Performance Summary</h3>
          <p><strong>Average Score:</strong> [AVERAGE_SCORE]</p>
          <p><strong>Overall Grade:</strong> [OVERALL_GRADE]</p>
          <p><strong>Position:</strong> [POSITION]</p>
        </div>

        <!-- Comments -->
        <div class="comments">
          <h3>Teacher's Comments</h3>
          <p>[TEACHER_COMMENT]</p>
          <p><strong>Class Teacher:</strong> [TEACHER_NAME] | <strong>Date:</strong> [DATE]</p>
        </div>
      </div>
    `;

    editorInstance.setComponents(defaultTemplate);
  };

  // Load templates from Supabase
  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  // Save template to Supabase
  const saveTemplate = async (templateName: string) => {
    if (!editor) {
      setSaveMessage('Editor not ready. Please wait for it to load.');
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    try {
      const html = editor.getHtml();
      const css = editor.getCss();
      
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: templateName,
          html_content: html,
          css_content: css,
          is_default: false
        }),
      });

      if (response.ok) {
        setSaveMessage('Template saved successfully!');
        loadTemplates();
      } else {
        const errorData = await response.json();
        setSaveMessage('Error saving template: ' + errorData.error);
      }
    } catch (error) {
      setSaveMessage('Error saving template: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  // Load selected template
  const loadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template && editor) {
      editor.setComponents(template.html_content);
      editor.setStyle(template.css_content);
      setSelectedTemplate(templateId);
    }
  };

  // Initialize templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <div className="text-white text-xl mb-2">Loading Report Card Editor...</div>
              <div className="text-white/60 text-sm">This may take a few moments</div>
              {saveMessage && (
                <div className="mt-4 text-red-300 text-sm">{saveMessage}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-semibold">Report Card Editor</h1>
            <p className="text-white/80 text-sm mt-1">Design and customize your school's report card templates</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard/admin/reports/generate')}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
            >
              Back to Reports
            </button>
          </div>
        </div>
      </div>

      {/* Editor Controls */}
      <div className="bg-white/5 backdrop-blur-md border-b border-white/10 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Template Selection */}
          <div className="flex items-center gap-2">
            <label className="text-white text-sm">Load Template:</label>
            <select
              value={selectedTemplate}
              onChange={(e) => loadTemplate(e.target.value)}
              className="px-3 py-1 rounded bg-white/10 border border-white/20 text-white text-sm"
            >
              <option value="">Select a template...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.school_id === null ? `📋 ${template.name} (Default)` : `🏫 ${template.name}`}
                </option>
              ))}
            </select>
          </div>

          {/* Save Template */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Template name..."
              id="templateName"
              className="px-3 py-1 rounded bg-white/10 border border-white/20 text-white text-sm placeholder-white/50"
            />
            <button
              onClick={() => {
                const name = (document.getElementById('templateName') as HTMLInputElement)?.value;
                if (name) saveTemplate(name);
              }}
              disabled={isSaving}
              className="px-4 py-1 rounded bg-green-600 hover:bg-green-500 text-white text-sm disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Template'}
            </button>
          </div>

          {/* Save Message */}
          {saveMessage && (
            <div className={`text-sm ${saveMessage.includes('Error') ? 'text-red-300' : 'text-green-300'}`}>
              {saveMessage}
            </div>
          )}
        </div>
      </div>

      {/* GrapesJS Visual Editor */}
      <div className="h-screen">
        <div ref={editorRef} className="h-full" />
      </div>

      {/* GrapesJS Panels */}
      <div className="fixed top-20 left-4 z-50">
        <div className="blocks-container"></div>
      </div>
      <div className="fixed bottom-4 left-4 z-50">
        <div className="layers-container"></div>
      </div>
      <div className="fixed bottom-4 right-4 z-50">
        <div className="traits-container"></div>
      </div>
      <div className="fixed top-1/2 right-4 transform -translate-y-1/2 z-50">
        <div className="styles-container"></div>
      </div>

    </div>
  );
}
