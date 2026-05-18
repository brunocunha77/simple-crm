import React from "react";
import QRCode from "react-qr-code";

interface MyQRCodeProps {
  qrString: string;
}

function MyQRCode({ qrString }: MyQRCodeProps) {
  return (
    <div className="flex justify-center p-4 bg-white rounded-lg">
      <QRCode 
        value={qrString} 
        size={400}
        level="H"
      />
    </div>
  );
}

export default MyQRCode; 