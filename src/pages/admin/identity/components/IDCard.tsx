import { useEffect, useRef } from "react";

interface IDCardProps {
  student: any;
  school: any;
}

const CARD_WIDTH = 1011;
const CARD_HEIGHT = 638;

const FONT_FAMILY = "'Inter', 'Segoe UI', system-ui, sans-serif";
const COLOR_TEXT = "#1F2937";
const COLOR_LABEL = "#6B7280";
const COLOR_ACCENT = "#2F5DA8";
const BG_CARD = "#F9FAFB";
const BG_WHITE = "#FFFFFF";
const BORDER = "#E5E7EB";

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
          width: 1.5,
          height: 40,
          displayValue: false,
          margin: 4,
        });
        barcodeRef.current.innerHTML = "";
        const wrapper = document.createElement("div");
        wrapper.style.textAlign = "center";
        wrapper.style.width = "100%";
        wrapper.appendChild(canvas);
        barcodeRef.current.appendChild(wrapper);
      } catch (error) {
        console.error("Error generating barcode:", error);
        if (barcodeRef.current) {
          barcodeRef.current.innerHTML = `<div style="text-align: center; padding: 8px; font-size: 12px; color: #6B7280; font-family: monospace;">${idValue}</div>`;
        }
      }
    };

    generateBarcode();
  }, [student]);

  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  const issueDate = new Date();

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const dob = student.date_of_birth
    ? formatDate(new Date(student.date_of_birth))
    : "—";
  const expiry = formatDate(expiryDate);
  const issued = formatDate(issueDate);
  const cardId = student.admission_number || student.student_id;
  const studentInitial = (student.name && student.name.charAt(0)) || "?";
  const schoolName = school.name || "School Name";

  const DataRow = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "6px" }}>
      <span style={{ fontFamily: FONT_FAMILY, fontSize: "11px", color: COLOR_LABEL, fontWeight: 500, minWidth: "100px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
        {label}
      </span>
      <span style={{ fontFamily: FONT_FAMILY, fontSize: "13px", color: COLOR_TEXT, fontWeight: 400 }}>
        {value}
      </span>
    </div>
  );

  return (
    <div
      className="id-card-wrapper"
      style={{
        width: `${CARD_WIDTH}px`,
        height: `${CARD_HEIGHT}px`,
        position: "relative",
        fontFamily: FONT_FAMILY,
        background: BG_CARD,
        borderRadius: "8px",
        border: `1px solid ${BORDER}`,
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {/* Background watermark – school logo 5% opacity */}
      {school.logo_url && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "280px",
            height: "280px",
            opacity: 0.05,
            pointerEvents: "none",
            backgroundImage: `url(${school.logo_url})`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
        />
      )}

      {/* Micro-text security line – school name repeated */}
      <div
        style={{
          position: "absolute",
          bottom: "72px",
          left: 0,
          right: 0,
          height: "8px",
          overflow: "hidden",
          opacity: 0.25,
          fontFamily: FONT_FAMILY,
          fontSize: "6px",
          color: COLOR_TEXT,
          letterSpacing: "0.2em",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
        }}
      >
        {(schoolName + " • ").repeat(80)}
      </div>

      {/* Thin accent stripe (3–5mm equivalent) */}
      <div
        style={{
          height: "6px",
          width: "100%",
          background: COLOR_ACCENT,
        }}
      />

      <div style={{ padding: "20px 28px 16px", position: "relative", zIndex: 1 }}>
        {/* Top row: logo left, school name + contact right */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
            marginBottom: "18px",
            paddingBottom: "14px",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "6px",
              border: `1px solid ${BORDER}`,
              overflow: "hidden",
              background: BG_WHITE,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {school.logo_url ? (
              <img
                src={school.logo_url}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : (
              <div style={{ width: "100%", height: "100%", background: COLOR_ACCENT }} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
            <p
              style={{
                margin: 0,
                fontSize: "15px",
                fontWeight: 600,
                color: COLOR_TEXT,
                lineHeight: 1.3,
                letterSpacing: "0.01em",
              }}
            >
              {schoolName}
            </p>
            {(school.contact_phone || school.contact_email) && (
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "11px",
                  color: COLOR_LABEL,
                  fontWeight: 400,
                }}
              >
                {[school.contact_phone, school.contact_email].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>

        {/* Two-column: photo left, student details right */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "24px",
            alignItems: "start",
            marginBottom: "18px",
          }}
        >
          {/* Passport-size photo (3:4 ratio) */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "140px",
                height: "187px",
                borderRadius: "6px",
                border: `1px solid ${BORDER}`,
                overflow: "hidden",
                background: "#E5E7EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {student.profile_picture_url ? (
                <img
                  src={student.profile_picture_url}
                  alt={student.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span
                  style={{
                    fontFamily: FONT_FAMILY,
                    fontSize: "48px",
                    fontWeight: 600,
                    color: "#9CA3AF",
                  }}
                >
                  {studentInitial}
                </span>
              )}
            </div>
            <span
              style={{
                fontFamily: FONT_FAMILY,
                fontSize: "9px",
                color: COLOR_LABEL,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Student Photo
            </span>
          </div>

          {/* Student details – form-style aligned rows */}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <h2
                style={{
                  margin: 0,
                  fontFamily: FONT_FAMILY,
                  fontSize: "18px",
                  fontWeight: 700,
                  color: COLOR_TEXT,
                  lineHeight: 1.2,
                  letterSpacing: "0.01em",
                }}
              >
                {student.name || "—"}
              </h2>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontFamily: FONT_FAMILY,
                  fontSize: "9px",
                  fontWeight: 600,
                  color: "#059669",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#059669" }} />
                Active
              </span>
            </div>

            <div style={{ marginTop: "8px" }}>
              <DataRow label="ID Number" value={cardId} />
              <DataRow label="Date of Birth" value={dob} />
              {student.current_class && <DataRow label="Class" value={student.current_class} />}
              <DataRow label="Valid Until" value={expiry} />
            </div>
          </div>
        </div>

        {/* Barcode area – framed, with caption and reduced width */}
        <div
          style={{
            border: `1px solid ${BORDER}`,
            borderRadius: "6px",
            background: BG_WHITE,
            padding: "12px 20px 10px",
            maxWidth: "85%",
            margin: "0 auto",
          }}
        >
          <p
            style={{
              margin: "0 0 6px",
              fontFamily: FONT_FAMILY,
              fontSize: "9px",
              color: COLOR_LABEL,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              textAlign: "center",
            }}
          >
            Scan for Verification
          </p>
          <div
            ref={barcodeRef}
            style={{
              minHeight: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
          <p
            style={{
              margin: "4px 0 0",
              fontFamily: "ui-monospace, monospace",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: COLOR_TEXT,
              textAlign: "center",
            }}
          >
            {cardId}
          </p>
        </div>

        {/* Footer: issue date, card version */}
        <div
          style={{
            marginTop: "10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: FONT_FAMILY,
            fontSize: "9px",
            color: COLOR_LABEL,
            fontWeight: 400,
          }}
        >
          <span>Issued: {issued}</span>
          <span>Card v1.0</span>
        </div>
      </div>
    </div>
  );
}
