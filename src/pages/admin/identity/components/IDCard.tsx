import { useEffect, useRef } from "react";

interface IDCardProps {
  student: any;
  school: any;
}

const CARD_WIDTH = 1011;
const CARD_HEIGHT = 638;

export default function IDCard({ student, school }: IDCardProps) {
  const barcodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const generateBarcode = async () => {
      if (!barcodeRef.current) return;
      const idValue = student.admission_number || student.student_id;
      if (!idValue) return;

      try {
        // @ts-ignore - jsbarcode types may not be available
        const JsBarcode = (await import("jsbarcode")).default;
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, idValue, {
          format: "CODE128",
          width: 1.8,
          height: 50,
          displayValue: false,
          margin: 8,
        });
        barcodeRef.current.innerHTML = "";
        const wrapper = document.createElement("div");
        wrapper.style.textAlign = "center";
        wrapper.style.width = "100%";
        wrapper.style.minHeight = "60px";
        wrapper.appendChild(canvas);
        barcodeRef.current.appendChild(wrapper);
      } catch (error) {
        console.error("Error generating barcode:", error);
        if (barcodeRef.current) {
          barcodeRef.current.innerHTML = `<div style="text-align: center; padding: 12px; font-size: 14px; color: #64748b; font-family: monospace;">${idValue}</div>`;
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
  const expiry = formatDate(expiryDate);
  const cardId = student.admission_number || student.student_id;
  const studentInitial = (student.name && student.name.charAt(0)) || "?";

  return (
    <div
      className="id-card-wrapper"
      style={{
        width: `${CARD_WIDTH}px`,
        height: `${CARD_HEIGHT}px`,
        position: "relative",
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        background: "#ffffff",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      }}
    >
      {/* Top: light background – school badge left, school name in blue (like reference ID) */}
      <div
        style={{
          width: "100%",
          background: "#fafaf9",
          borderBottom: "1px solid #e2e8f0",
          padding: "24px 36px 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "20px",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              width: "78px",
              height: "78px",
              borderRadius: "12px",
              border: "2px solid #e2e8f0",
              overflow: "hidden",
              background: "white",
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
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "#1e40af",
                }}
              />
            )}
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 0 }}>
            <span
              style={{
                color: "#1e40af",
                fontSize: "22px",
                fontWeight: 700,
                letterSpacing: "0.02em",
                lineHeight: 1.2,
                textAlign: "center",
                textTransform: "uppercase",
              }}
            >
              {(school.name || "School Name").toUpperCase()}
            </span>
          </div>
        </div>
        <div
          style={{
            background: "#1e40af",
            color: "white",
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textAlign: "center",
            padding: "8px 16px",
            textTransform: "uppercase",
          }}
        >
          STUDENT ID CARD
        </div>
      </div>

      {/* Main content row: photo + details (pushed down for real-ID spacing) */}
      <div
        style={{
          display: "flex",
          padding: "44px 36px 24px 36px",
          gap: "36px",
          alignItems: "flex-start",
        }}
      >
        {/* Photo */}
        <div
          style={{
            width: "200px",
            height: "200px",
            borderRadius: "12px",
            overflow: "hidden",
            flexShrink: 0,
            border: "3px solid #e2e8f0",
            background: "#f8fafc",
          }}
        >
          {student.profile_picture_url ? (
            <img
              src={student.profile_picture_url}
              alt={student.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(145deg, #0f766e 0%, #14b8a6 100%)",
                color: "white",
                fontSize: "72px",
                fontWeight: 700,
              }}
            >
              {studentInitial}
            </div>
          )}
        </div>

        {/* Details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: "28px",
              fontWeight: 700,
              color: "#0f172a",
              lineHeight: 1.2,
            }}
          >
            {student.name || "—"}
          </h2>
          <p
            style={{
              margin: "0 0 20px",
              fontSize: "14px",
              color: "#64748b",
              fontWeight: 500,
            }}
          >
            Student
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "20px 32px",
              marginTop: "24px",
            }}
          >
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Card ID
              </p>
              <p style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0f172a", fontFamily: "monospace", letterSpacing: "0.02em" }}>
                {cardId}
              </p>
            </div>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Date of Birth
              </p>
              <p style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#0f172a" }}>
                {dob}
              </p>
            </div>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Valid Until
              </p>
              <p style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#0f172a" }}>
                {expiry}
              </p>
            </div>
          </div>

          {student.current_class && (
            <div style={{ marginTop: "16px" }}>
              <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Class
              </p>
              <p style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#0f172a" }}>
                {student.current_class}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar: barcode only (school name + badge are in header above) */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "100px",
          borderTop: "1px solid #e2e8f0",
          background: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 36px",
        }}
      >
        <div
          style={{
            width: "380px",
            textAlign: "center",
          }}
        >
          <div
            ref={barcodeRef}
            style={{
              minHeight: "52px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "#0f172a",
              fontFamily: "monospace",
            }}
          >
            {cardId}
          </p>
        </div>
      </div>
    </div>
  );
}
