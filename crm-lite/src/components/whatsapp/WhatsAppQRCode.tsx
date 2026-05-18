
import React from "react";
import { QRCode } from "@/components/ui/qrcode";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";

interface WhatsAppQRCodeProps {
  qrCode: string;
  onConfirmConnection: () => Promise<void>;
}

export const WhatsAppQRCode = ({ qrCode, onConfirmConnection }: WhatsAppQRCodeProps) => {
  return (
    <>
      <div className="flex justify-center">
        <div className="p-4 bg-white rounded-md border">
          <div className="text-center mb-4 text-sm font-medium">
            Escaneie o código QR com seu celular
          </div>
          <QRCode value={qrCode} size={256} />
        </div>
      </div>
      <CardFooter className="flex justify-end">
        <Button onClick={onConfirmConnection}>Confirmar Conexão</Button>
      </CardFooter>
    </>
  );
};
