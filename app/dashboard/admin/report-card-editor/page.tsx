'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabase';

// Import GrapesJS dynamically to avoid SSR issues

export default function ReportCardEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const router = useRouter();
  // Use the imported supabase client

  // Initialize GrapesJS editor
  useEffect(() => {
    const initEditor = async () => {
      if (!editorRef.current) return;

      try {
        // Set a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          setIsLoading(false);
          console.error('GrapesJS loading timeout');
        }, 10000);

        // Dynamically import GrapesJS
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
          }
        });

        // Load default report card template
        loadDefaultTemplate(editorInstance);
        
        setEditor(editorInstance);
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing GrapesJS:', error);
        setIsLoading(false);
        // Show error message to user
        setSaveMessage('Error loading editor. Please refresh the page.');
      }
    };

    initEditor();
  }, []);

  // Load default report card template
  const loadDefaultTemplate = (editorInstance: any) => {
    const defaultTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Student Report Card</title>
        <style>
          body {
            font-family: 'Times New Roman', serif;
            margin: 0;
            padding: 20px;
            background: white;
            color: black;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .school-logo {
            width: 120px;
            height: 120px;
            border: 2px solid #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f0f0f0;
          }
          .school-info {
            text-align: right;
            flex: 1;
          }
          .school-name {
            font-size: 18pt;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .school-contact {
            font-size: 10pt;
            margin-bottom: 5px;
          }
          .school-motto {
            font-size: 10pt;
            font-style: italic;
          }
          .report-title {
            text-align: center;
            font-size: 16pt;
            font-weight: bold;
            text-transform: uppercase;
            margin: 20px 0;
            padding: 10px;
            background: #f5f5f5;
            border: 1px solid #ddd;
          }
          .student-info {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            padding: 15px;
            background: #f9f9f9;
            border: 1px solid #ddd;
          }
          .student-details {
            flex: 1;
          }
          .student-photo {
            width: 80px;
            height: 100px;
            border: 2px solid #ccc;
            background: #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: 20px;
          }
          .results-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .results-table th,
          .results-table td {
            border: 1px solid #333;
            padding: 8px;
            text-align: center;
          }
          .results-table th {
            background: #f0f0f0;
            font-weight: bold;
          }
          .summary {
            margin: 20px 0;
            padding: 15px;
            background: #f5f5f5;
            border: 1px solid #ddd;
          }
          .comments {
            margin: 20px 0;
            padding: 15px;
            background: #f9f9f9;
            border: 1px solid #ddd;
          }
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.1;
            z-index: -1;
            pointer-events: none;
            font-size: 72pt;
            font-weight: bold;
            color: #ccc;
          }
        </style>
      </head>
      <body>
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
      </body>
      </html>
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
    if (!editor) return;

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
      const fullHtml = template.html_content + '<style>' + template.css_content + '</style>';
      editor.setComponents(fullHtml);
      setSelectedTemplate(templateId);
    }
  };

  // Initialize templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Loading Report Card Editor...</div>
          <div className="text-white/60 text-sm">This may take a few moments</div>
          {saveMessage && (
            <div className="mt-4 text-red-300 text-sm">{saveMessage}</div>
          )}
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

      {/* GrapesJS Editor */}
      <div className="h-screen">
        <div ref={editorRef} className="h-full" />
      </div>

      {/* GrapesJS Panels */}
      <div className="fixed top-20 left-4 z-50">
        <div className="panel__basic-actions"></div>
      </div>
      <div className="fixed top-20 right-4 z-50">
        <div className="panel__devices"></div>
      </div>
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
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
