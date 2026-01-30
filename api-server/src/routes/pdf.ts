import { Router } from 'express';
import { generatePDF } from '../services/puppeteerService';

export const pdfRouter = Router();

interface GeneratePDFRequest {
  snapshotId: string;
  studentIds?: string[];
  templateId?: string;
  reportData?: any; // Pre-computed report data
}

/**
 * POST /api/pdf/generate
 * Generate PDF reports from snapshot
 */
pdfRouter.post('/generate', async (req, res) => {
  try {
    const { snapshotId, studentIds, templateId, reportData }: GeneratePDFRequest = req.body;

    if (!snapshotId) {
      return res.status(400).json({ error: 'snapshotId is required' });
    }

    // Generate PDF using preserved template logic
    const pdfBuffer = await generatePDF({
      snapshotId,
      studentIds,
      templateId,
      reportData,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reports_${snapshotId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: error.message || 'PDF generation failed' });
  }
});

/**
 * POST /api/pdf/generate-bulk
 * Generate multiple PDFs and return job ID
 */
pdfRouter.post('/generate-bulk', async (req, res) => {
  try {
    const { snapshotId, studentIds, templateId } = req.body;

    if (!snapshotId) {
      return res.status(400).json({ error: 'snapshotId is required' });
    }

    // TODO: Implement job queue
    const jobId = `job_${Date.now()}`;

    // Start generation in background
    generatePDF({ snapshotId, studentIds, templateId }).catch(console.error);

    res.json({
      jobId,
      statusUrl: `/api/pdf/status/${jobId}`,
      message: 'PDF generation started',
    });
  } catch (error: any) {
    console.error('Bulk PDF generation error:', error);
    res.status(500).json({ error: error.message || 'Bulk PDF generation failed' });
  }
});

/**
 * GET /api/pdf/status/:jobId
 * Get generation job status
 */
pdfRouter.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    // TODO: Implement job status tracking
    res.json({
      jobId,
      status: 'processing', // 'pending', 'processing', 'completed', 'failed'
      progress: 0,
      total: 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get job status' });
  }
});




