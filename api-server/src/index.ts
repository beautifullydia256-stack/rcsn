import express from 'express';
import cors from 'cors';
import { pdfRouter } from './routes/pdf';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'pwezacore-pdf-api' });
});

// PDF generation routes
app.use('/api/pdf', pdfRouter);

app.listen(PORT, () => {
  console.log(`PDF API Server running on port ${PORT}`);
});




