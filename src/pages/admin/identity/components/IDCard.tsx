import { useEffect, useRef } from "react";

interface IDCardProps {
  student: any;
  school: any;
}

/**
 * Production-ready ID card — CR80 (85.60mm × 53.98mm).
 * Locked system style per spec; optimized for print and PDF.
 */
export default function IDCard({ student, school }: IDCardProps) {
  const barcodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const generateBarcode = async () => {
      if (!barcodeRef.current) return;
      const idValue = student.admission_number || student.student_id;
      if (!idValue) return;

      try {
        // @ts-ignore
        const JsBarcode = (await import("jsbarcode")).default;
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, idValue, {
          format: "CODE128",
          width: 1.2,
          height: 28,
          displayValue: false,
          margin: 2,
        });
        barcodeRef.current.innerHTML = "";
        const wrapper = document.createElement("div");
        wrapper.className = "barcode-inner";
        wrapper.style.textAlign = "center";
        wrapper.style.width = "100%";
        wrapper.style.height = "10mm";
        wrapper.style.display = "flex";
        wrapper.style.alignItems = "center";
        wrapper.style.justifyContent = "center";
        wrapper.appendChild(canvas);
        barcodeRef.current.appendChild(wrapper);
      } catch (error) {
        console.error("Error generating barcode:", error);
        if (barcodeRef.current) {
          barcodeRef.current.innerHTML = `<div class="barcode-fallback">${idValue}</div>`;
        }
      }
    };

    generateBarcode();
  }, [student]);

  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const dob = student.date_of_birth
    ? formatDate(new Date(student.date_of_birth))
    : "—";
  const validUntil = formatDate(expiryDate);
  const cardId = student.admission_number || student.student_id;
  const studentInitial = (student.name && student.name.charAt(0)) || "?";
  const schoolName = (school.name || "School Name").toUpperCase();

  // School meta: location · P.O Box · phone, then email (from database)
  const metaParts = [
    school.location || school.address,
    school.pobox && `P.O Box ${school.pobox}`,
    school.contact_phone,
  ].filter(Boolean);
  const schoolMetaLine1 = metaParts.join(" · ");
  const schoolMetaLine2 = school.contact_email || "";

  return (
    <>
      <style>{`
        @page {
          size: 85.60mm 53.98mm;
          margin: 0;
        }
        @media print {
          body { margin: 0; font-family: 'Inter', sans-serif; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .id-card-print-wrap { transform: none !important; width: 85.60mm !important; height: 53.98mm !important; }
        }
        .id-card {
          width: 85.60mm;
          height: 53.98mm;
          padding: 4mm;
          box-sizing: border-box;
          background: #F4F6F8;
          border-radius: 3mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .id-card-watermark {
          position: absolute;
          font-size: 22pt;
          font-weight: 600;
          color: rgba(47,93,168,0.05);
          transform: rotate(-20deg);
          top: 40%;
          left: 5%;
          pointer-events: none;
          white-space: nowrap;
          font-family: inherit;
        }
        .id-card .header {
          display: flex;
          align-items: center;
          border-bottom: 0.4mm solid #E5E7EB;
          padding-bottom: 2mm;
        }
        .id-card .logo {
          width: 10mm;
          height: 10mm;
          object-fit: contain;
          margin-right: 3mm;
          flex-shrink: 0;
        }
        .id-card .logo-placeholder {
          width: 10mm;
          height: 10mm;
          margin-right: 3mm;
          flex-shrink: 0;
          background: #2F5DA8;
          border-radius: 1mm;
        }
        .id-card .school { flex: 1; min-width: 0; }
        .id-card .school .name {
          font-size: 9pt;
          font-weight: 600;
          color: #2F5DA8;
          letter-spacing: .3px;
          line-height: 1.2;
        }
        .id-card .school .meta {
          font-size: 6.5pt;
          color: #6B7280;
          margin-top: 0.5mm;
          line-height: 1.3;
        }
        .id-card .body {
          display: flex;
          margin-top: 3mm;
          flex: 1;
          min-height: 0;
        }
        .id-card .photo-wrap {
          width: 22mm;
          height: 28mm;
          border-radius: 2mm;
          border: 0.3mm solid #E5E7EB;
          overflow: hidden;
          flex-shrink: 0;
          background: #E5E7EB;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .id-card .photo-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .id-card .photo-initial {
          font-size: 14pt;
          font-weight: 700;
          color: #9CA3AF;
        }
        .id-card .details {
          margin-left: 3mm;
          flex: 1;
          min-width: 0;
        }
        .id-card .student-name {
          font-size: 11pt;
          font-weight: 700;
          color: #1F2937;
          margin-bottom: 2mm;
          line-height: 1.2;
        }
        .id-card .info-row {
          font-size: 7.5pt;
          margin-bottom: 1mm;
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 2mm;
          color: #1F2937;
        }
        .id-card .info-row span:first-child {
          color: #6B7280;
          font-weight: 500;
          flex-shrink: 0;
        }
        .id-card .info-row span:last-child {
          font-weight: 400;
          text-align: right;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .id-card .footer {
          border-top: 0.4mm solid #E5E7EB;
          padding-top: 2mm;
          text-align: center;
        }
        .id-card .footer .barcode {
          height: 10mm;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .id-card .barcode-inner canvas { max-height: 10mm; width: auto !important; }
        .id-card .barcode-fallback { font-size: 6pt; color: #6B7280; font-family: monospace; }
        .id-card .barcode-text {
          font-size: 7pt;
          letter-spacing: 2px;
          color: #374151;
          margin-top: 0.5mm;
          font-weight: 500;
        }
      `}</style>

      {/* Screen: scale up for preview. Print: actual CR80 size via @page */}
      <div
        className="id-card-print-wrap"
        style={{
          transform: "scale(2.8)",
          transformOrigin: "top left",
          width: "85.60mm",
          height: "53.98mm",
        }}
      >
        <div className="id-card">
          <div className="id-card-watermark" aria-hidden>
            {schoolName}
          </div>

          <div className="header">
            {school.logo_url ? (
              <img src={school.logo_url} alt="" className="logo" />
            ) : (
              <div className="logo-placeholder" />
            )}
            <div className="school">
              <div className="name">{schoolName}</div>
              <div className="meta">
                {schoolMetaLine1}
                {schoolMetaLine2 ? <><br />{schoolMetaLine2}</> : null}
              </div>
            </div>
          </div>

          <div className="body">
            <div className="photo-wrap">
              {student.profile_picture_url ? (
                <img src={student.profile_picture_url} alt={student.name} />
              ) : (
                <span className="photo-initial">{studentInitial}</span>
              )}
            </div>

            <div className="details">
              <div className="student-name">{student.name || "—"}</div>

              <div className="info-row">
                <span>ID Number</span>
                <span>{cardId}</span>
              </div>
              {student.current_class && (
                <div className="info-row">
                  <span>Class</span>
                  <span>{student.current_class}</span>
                </div>
              )}
              <div className="info-row">
                <span>Date of Birth</span>
                <span>{dob}</span>
              </div>
              <div className="info-row">
                <span>Valid Until</span>
                <span>{validUntil}</span>
              </div>
            </div>
          </div>

          <div className="footer">
            <div ref={barcodeRef} className="barcode" />
            <div className="barcode-text">{cardId}</div>
          </div>
        </div>
      </div>
    </>
  );
}
