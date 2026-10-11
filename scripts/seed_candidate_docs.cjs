const { createClient } = require('@supabase/supabase-js');
const url = 'https://npqjrtspgxhuwrljbemz.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wcWpydHNwZ3hodXdybGpiZW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5NjgwNDcsImV4cCI6MjEwNjU0NDA0N30.vyip6RbWLuVGgj1ZrvBqDErpVjCIAPUkNy6VP0fccis';
const supabase = createClient(url, key);

function makePassportSvg(name, gender, initials, bgGrad) {
  const isFemale = gender === 'Female';
  const hair = isFemale
    ? "<path d='M75,100 C75,55 90,45 120,45 C150,45 165,55 165,100 C165,85 155,60 120,60 C85,60 75,85 75,100 Z' fill='#1A110B'/><ellipse cx='120' cy='52' rx='38' ry='16' fill='#1A110B'/>"
    : "<path d='M76,90 C76,55 90,48 120,48 C150,48 164,55 164,90 C160,65 145,55 120,55 C95,55 80,65 76,90 Z' fill='#1A110B'/>";

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 280' width='240' height='280'>
    <defs>
      <linearGradient id='bg' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stop-color='${bgGrad[0]}'/>
        <stop offset='100%' stop-color='${bgGrad[1]}'/>
      </linearGradient>
      <linearGradient id='skin' x1='0%' y1='0%' x2='0%' y2='100%'>
        <stop offset='0%' stop-color='#6F4E37'/>
        <stop offset='100%' stop-color='#533827'/>
      </linearGradient>
      <linearGradient id='suit' x1='0%' y1='0%' x2='0%' y2='100%'>
        <stop offset='0%' stop-color='#0B3B24'/>
        <stop offset='100%' stop-color='#041A10'/>
      </linearGradient>
    </defs>
    <rect width='240' height='280' fill='url(#bg)' rx='12'/>
    <rect y='245' width='240' height='35' fill='#0B3B24' fill-opacity='0.9'/>
    <text x='120' y='267' font-family='Arial, sans-serif' font-size='10' font-weight='bold' fill='#FFFFFF' text-anchor='middle' letter-spacing='2'>RCSN PASSPORT 2026</text>
    
    <path d='M30,250 C30,195 70,185 120,185 C170,185 210,195 210,250 Z' fill='url(#suit)'/>
    <polygon points='120,190 95,160 145,160' fill='#FFFFFF'/>
    <polygon points='120,170 125,240 120,248 115,240' fill='#00873E'/>
    <rect x='105' y='140' width='30' height='28' fill='url(#skin)' rx='4'/>
    <ellipse cx='120' cy='105' rx='42' ry='50' fill='url(#skin)'/>
    ${hair}
    <ellipse cx='105' cy='102' rx='5' ry='3' fill='#FFFFFF'/>
    <circle cx='105' cy='102' r='2' fill='#1A110B'/>
    <ellipse cx='135' cy='102' rx='5' ry='3' fill='#FFFFFF'/>
    <circle cx='135' cy='102' r='2' fill='#1A110B'/>
    <path d='M97,94 Q105,91 113,94' stroke='#1A110B' stroke-width='2.5' fill='none'/>
    <path d='M127,94 Q135,91 143,94' stroke='#1A110B' stroke-width='2.5' fill='none'/>
    <path d='M118,105 Q120,118 123,118 Q125,118 126,115' stroke='#3E2719' stroke-width='2' fill='none'/>
    <path d='M110,128 Q120,135 130,128' stroke='#FFFFFF' stroke-width='2' fill='none'/>
    <rect x='15' y='12' width='60' height='18' rx='4' fill='#FFFFFF' fill-opacity='0.9'/>
    <text x='45' y='25' font-family='Arial, sans-serif' font-size='9' font-weight='bold' fill='#0B3B24' text-anchor='middle'>${initials}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function makeUnebSlipSvg(candidateName, indexNo, schoolName, examYear, subjectsList) {
  const rows = subjectsList
    .map((s, idx) => {
      const y = 310 + idx * 24;
      const fill = idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
      return `<rect x='40' y='${y - 16}' width='520' height='22' fill='${fill}' stroke='#E2E8F0' stroke-width='0.5'/>
      <text x='60' y='${y}' font-family='Arial, sans-serif' font-size='12' font-weight='600' fill='#1E293B'>${s.code || 500 + idx} ${s.name}</text>
      <text x='400' y='${y}' font-family='Arial, sans-serif' font-size='12' font-weight='bold' fill='#047857' text-anchor='middle'>${s.grade}</text>
      <text x='500' y='${y}' font-family='Arial, sans-serif' font-size='11' font-weight='bold' fill='#0F172A' text-anchor='middle'>${s.gradeDesc || 'CREDIT'}</text>`;
    })
    .join('');

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 780' width='600' height='780'>
    <rect width='600' height='780' fill='#FFFDF8' stroke='#CBD5E1' stroke-width='1'/>
    <rect x='15' y='15' width='570' height='750' fill='none' stroke='#00873E' stroke-width='2' stroke-dasharray='8,4'/>
    <rect x='20' y='20' width='560' height='740' fill='none' stroke='#CA8A04' stroke-width='1'/>
    <text x='300' y='420' font-family='Arial, sans-serif' font-size='56' font-weight='900' fill='#00873E' fill-opacity='0.04' text-anchor='middle' transform='rotate(-30 300 420)'>UNEB OFFICIAL VERIFIED</text>
    <rect x='30' y='30' width='540' height='90' fill='#F0FDF4' rx='8' stroke='#86EFAC' stroke-width='1'/>
    <text x='300' y='60' font-family='Arial, sans-serif' font-size='16' font-weight='900' fill='#14532D' text-anchor='middle' letter-spacing='1'>UGANDA NATIONAL EXAMINATIONS BOARD</text>
    <text x='300' y='80' font-family='Arial, sans-serif' font-size='13' font-weight='700' fill='#166534' text-anchor='middle'>UGANDA CERTIFICATE OF EDUCATION (UCE) RESULT SLIP</text>
    <text x='300' y='102' font-family='Arial, sans-serif' font-size='11' font-weight='bold' fill='#854D0E' text-anchor='middle'>EXAMINATION YEAR: ${examYear} • OFFICIAL CERTIFICATION</text>
    <rect x='40' y='140' width='520' height='120' fill='#FFFFFF' stroke='#E2E8F0' rx='6'/>
    <text x='60' y='165' font-family='Arial, sans-serif' font-size='11' font-weight='bold' fill='#64748B'>CANDIDATE NAME:</text>
    <text x='180' y='165' font-family='Arial, sans-serif' font-size='13' font-weight='900' fill='#0F172A'>${candidateName.toUpperCase()}</text>
    <text x='60' y='195' font-family='Arial, sans-serif' font-size='11' font-weight='bold' fill='#64748B'>INDEX NUMBER:</text>
    <text x='180' y='195' font-family='monospace' font-size='13' font-weight='900' fill='#0369A1'>${indexNo}</text>
    <text x='60' y='225' font-family='Arial, sans-serif' font-size='11' font-weight='bold' fill='#64748B'>EXAMINATION CENTRE:</text>
    <text x='200' y='225' font-family='Arial, sans-serif' font-size='12' font-weight='700' fill='#0F172A'>${schoolName}</text>
    <text x='60' y='250' font-family='Arial, sans-serif' font-size='11' font-weight='bold' fill='#64748B'>STATUS / VERIFICATION:</text>
    <text x='200' y='250' font-family='Arial, sans-serif' font-size='11' font-weight='bold' fill='#047857'>CONFIRMED VERIFIED BY RCSN ADMISSIONS</text>
    <rect x='40' y='275' width='520' height='26' fill='#00873E' rx='4'/>
    <text x='60' y='292' font-family='Arial, sans-serif' font-size='11' font-weight='bold' fill='#FFFFFF'>SUBJECT NAME</text>
    <text x='400' y='292' font-family='Arial, sans-serif' font-size='11' font-weight='bold' fill='#FFFFFF' text-anchor='middle'>GRADE</text>
    <text x='500' y='292' font-family='Arial, sans-serif' font-size='11' font-weight='bold' fill='#FFFFFF' text-anchor='middle'>STANDARD</text>
    ${rows}
    <g transform='translate(70, 600)'>
      <circle cx='50' cy='50' r='45' fill='none' stroke='#DC2626' stroke-width='2' stroke-dasharray='4,2'/>
      <circle cx='50' cy='50' r='38' fill='none' stroke='#DC2626' stroke-width='1'/>
      <text x='50' y='38' font-family='Arial, sans-serif' font-size='8' font-weight='bold' fill='#DC2626' text-anchor='middle'>UNEB SECRETARIAT</text>
      <text x='50' y='52' font-family='Arial, sans-serif' font-size='10' font-weight='900' fill='#DC2626' text-anchor='middle'>VERIFIED</text>
      <text x='50' y='64' font-family='Arial, sans-serif' font-size='8' font-weight='bold' fill='#DC2626' text-anchor='middle'>KAMPALA, UGANDA</text>
    </g>
    <g transform='translate(360, 610)'>
      <rect width='190' height='35' fill='#0F172A' rx='4'/>
      <text x='95' y='22' font-family='monospace' font-size='12' font-weight='bold' fill='#38BDF8' text-anchor='middle'>*UNEB-${indexNo.replace(/[^a-zA-Z0-9]/g, '')}*</text>
      <text x='95' y='50' font-family='Arial, sans-serif' font-size='9' font-weight='bold' fill='#64748B' text-anchor='middle'>DIGITAL SECURITY VERIFIED</text>
    </g>
    <text x='300' y='740' font-family='Arial, sans-serif' font-size='9' fill='#94A3B8' text-anchor='middle'>This official result slip was uploaded and verified for Rakai Community School of Nursing Admissions intake.</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

async function run() {
  const brendaPhoto = makePassportSvg('Akello Brenda Faith', 'Female', 'ABF', ['#E0F2FE', '#BAE6FD']);
  const brendaSlip = makeUnebSlipSvg(
    'Akello Brenda Faith',
    'U0124/055',
    'Lira Comprehensive SS',
    '2025',
    [
      { code: '553', name: 'Biology', grade: 'D1', gradeDesc: 'DISTINCTION' },
      { code: '545', name: 'Chemistry', grade: 'D2', gradeDesc: 'DISTINCTION' },
      { code: '535', name: 'Physics', grade: 'C3', gradeDesc: 'CREDIT' },
      { code: '456', name: 'Mathematics', grade: 'C4', gradeDesc: 'CREDIT' },
      { code: '112', name: 'English Language', grade: 'D1', gradeDesc: 'DISTINCTION' },
      { code: '223', name: 'Geography', grade: 'C3', gradeDesc: 'CREDIT' },
      { code: '241', name: 'History', grade: 'C4', gradeDesc: 'CREDIT' },
    ]
  );

  const katoPhoto = makePassportSvg('Kato Isaac Mukasa', 'Male', 'KIM', ['#FEF3C7', '#FDE68A']);
  const katoSlip = makeUnebSlipSvg(
    'Kato Isaac Mukasa',
    'U0017/088',
    'Masaka Secondary School',
    '2025',
    [
      { code: '553', name: 'Biology', grade: 'D2', gradeDesc: 'DISTINCTION' },
      { code: '545', name: 'Chemistry', grade: 'C3', gradeDesc: 'CREDIT' },
      { code: '535', name: 'Physics', grade: 'C4', gradeDesc: 'CREDIT' },
      { code: '456', name: 'Mathematics', grade: 'C3', gradeDesc: 'CREDIT' },
      { code: '112', name: 'English Language', grade: 'C4', gradeDesc: 'CREDIT' },
      { code: '273', name: 'Geography', grade: 'C5', gradeDesc: 'CREDIT' },
    ]
  );

  const nalubegaPhoto = makePassportSvg('Nalubega Proscovia Sarah', 'Female', 'NPS', ['#FCE7F3', '#FBCFE8']);
  const nalubegaSlip = makeUnebSlipSvg(
    'Nalubega Proscovia Sarah',
    'U0482/019',
    'St. Maria Goretti SS',
    '2024',
    [
      { code: '553', name: 'Biology', grade: 'D1', gradeDesc: 'DISTINCTION' },
      { code: '545', name: 'Chemistry', grade: 'D2', gradeDesc: 'DISTINCTION' },
      { code: '535', name: 'Physics', grade: 'C3', gradeDesc: 'CREDIT' },
      { code: '456', name: 'Mathematics', grade: 'C4', gradeDesc: 'CREDIT' },
      { code: '112', name: 'English Language', grade: 'D1', gradeDesc: 'DISTINCTION' },
      { code: '241', name: 'History', grade: 'C3', gradeDesc: 'CREDIT' },
    ]
  );

  const updates = [
    {
      appNum: 'RCSN-2026-394812',
      passport_photo_url: brendaPhoto,
      attached_document_url: brendaSlip,
      attached_document_name: 'Akello_Brenda_Faith_UNEB_UCE_Pass_Slip_2025.pdf',
      attached_document_size: '1.4 MB',
    },
    {
      appNum: 'RCSN-2026-281903',
      passport_photo_url: katoPhoto,
      attached_document_url: katoSlip,
      attached_document_name: 'Kato_Isaac_Mukasa_UNEB_UCE_Pass_Slip_2025.pdf',
      attached_document_size: '1.2 MB',
    },
    {
      appNum: 'RCSN-2026-104921',
      passport_photo_url: nalubegaPhoto,
      attached_document_url: nalubegaSlip,
      attached_document_name: 'Nalubega_Proscovia_Sarah_UNEB_Result_Slip_2024.pdf',
      attached_document_size: '1.6 MB',
    },
  ];

  for (const u of updates) {
    const { error } = await supabase
      .from('admission_applications')
      .update({
        passport_photo_url: u.passport_photo_url,
        attached_document_url: u.attached_document_url,
        attached_document_name: u.attached_document_name,
        attached_document_size: u.attached_document_size,
      })
      .eq('application_number', u.appNum);
    console.log('Updated', u.appNum, 'Error:', error);
  }
}
run();
