import { useEffect, useRef } from "react";

interface IDCardProps {
  student: any;
  school: any;
}

export default function IDCard({ student, school }: IDCardProps) {
  const barcodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate barcode
    const generateBarcode = async () => {
      if (!barcodeRef.current) return;

      try {
        // Dynamic import to handle missing dependency gracefully
        const JsBarcode = (await import("jsbarcode")).default;
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, student.admission_number || student.student_id, {
          format: "CODE128",
          width: 2,
          height: 60,
          displayValue: false,
        });
        barcodeRef.current.innerHTML = "";
        barcodeRef.current.appendChild(canvas);
      } catch (error) {
        console.error("Error generating barcode:", error);
        // Fallback: show text if barcode generation fails
        if (barcodeRef.current) {
          barcodeRef.current.innerHTML = `<div style="text-align: center; padding: 10px; font-size: 14px; color: #666;">Barcode: ${student.admission_number || student.student_id}</div>`;
        }
      }
    };

    generateBarcode();
  }, [student]);

  // Calculate expiry date (1 year from now)
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  // Format dates
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const dob = student.date_of_birth
    ? formatDate(new Date(student.date_of_birth))
    : "N/A";
  const expiry = formatDate(expiryDate);

  // Verification URL
  const verificationUrl = `${window.location.origin}/verify/${student.student_id}`;

  return (
    <div
      className="id-card-wrapper"
      style={{
        width: "1011px",
        height: "638px",
        position: "relative",
        fontFamily: "'Arial', sans-serif",
        background: "white",
        border: "1px solid #ddd",
        overflow: "hidden",
      }}
    >
      {/* Header Background */}
      <div
        className="header-bg"
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          height: "40%",
          width: "100%",
          position: "absolute",
          top: 0,
        }}
      >
        <h1
          style={{
            color: "white",
            float: "right",
            margin: "40px 60px",
            fontSize: "48px",
            fontWeight: 900,
            textShadow: "2px 2px 4px rgba(0,0,0,0.2)",
          }}
        >
          STUDENT ID CARD
        </h1>
      </div>

      {/* Student Photo */}
      <div
        className="student-photo"
        style={{
          position: "absolute",
          top: "15%",
          left: "5%",
          width: "280px",
          height: "280px",
          borderRadius: "50%",
          border: "15px solid #5D8EB4",
          overflow: "hidden",
          zIndex: 10,
          background: "#f0f0f0",
        }}
      >
        {student.profile_picture_url ? (
          <img
            src={student.profile_picture_url}
            alt={student.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              fontSize: "120px",
              fontWeight: "bold",
            }}
          >
            {student.name?.charAt(0) || "?"}
          </div>
        )}
      </div>

      {/* Card Body */}
      <div
        className="card-body"
        style={{
          position: "absolute",
          top: "45%",
          left: "40%",
          width: "55%",
        }}
      >
        <h2
          className="school-name"
          style={{
            color: "#002147",
            fontSize: "36px",
            marginBottom: "30px",
            fontWeight: "bold",
          }}
        >
          {school.name || "School Name"}
        </h2>

        <div
          className="student-name"
          style={{
            marginBottom: "30px",
          }}
        >
          <p style={{ color: "#666", margin: 0, fontSize: "18px" }}>
            Student Name:
          </p>
          <p
            style={{
              fontWeight: "bold",
              fontSize: "28px",
              margin: "5px 0",
              color: "#002147",
            }}
          >
            {student.name}
          </p>
        </div>

        <div
          className="info-grid"
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "90%",
          }}
        >
          <div>
            <p style={{ color: "#666", margin: 0, fontSize: "14px" }}>
              Card ID:
            </p>
            <p style={{ fontWeight: "bold", fontSize: "20px", margin: "5px 0" }}>
              {student.admission_number || student.student_id.slice(0, 8)}
            </p>
          </div>
          <div>
            <p style={{ color: "#666", margin: 0, fontSize: "14px" }}>
              Date of Birth:
            </p>
            <p style={{ fontWeight: "bold", fontSize: "20px", margin: "5px 0" }}>
              {dob}
            </p>
          </div>
          <div>
            <p style={{ color: "#666", margin: 0, fontSize: "14px" }}>
              Expiry Date:
            </p>
            <p style={{ fontWeight: "bold", fontSize: "20px", margin: "5px 0" }}>
              {expiry}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="footer"
        style={{
          position: "absolute",
          bottom: "5%",
          width: "100%",
          padding: "0 5%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* School Logo */}
        <div
          className="school-logo"
          style={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              border: "4px solid #5D8EB4",
              borderRadius: "50%",
              padding: "5px",
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {school.logo_url ? (
              <img
                src={school.logo_url}
                alt="School Logo"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "#5D8EB4",
                  borderRadius: "50%",
                }}
              />
            )}
          </div>
          <span
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              marginLeft: "15px",
              color: "#333",
            }}
          >
            {school.name || "PwezaCore"}
          </span>
        </div>

        {/* Barcode Area */}
        <div
          className="barcode-area"
          style={{
            textAlign: "center",
          }}
        >
          <div ref={barcodeRef} id="barcode-generator" />
          <p
            style={{
              fontSize: "16px",
              letterSpacing: "3px",
              marginTop: "5px",
              fontWeight: "600",
            }}
          >
            {student.admission_number || student.student_id.slice(0, 8)}
          </p>
        </div>
      </div>
    </div>
  );
}
