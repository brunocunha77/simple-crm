import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { createWhatsAppInstance, checkAndUpdateInstanceStatus } from '../services/whatsappService';
import { useAuth } from '../contexts/AuthContext';

export default function WhatsAppConnection() {
  const [status, setStatus] = useState<'qr' | 'connecting' | 'connected' | 'error'>('qr');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const connectWhatsApp = async () => {
      try {
        setStatus('connecting');
        const { qrCode } = await createWhatsAppInstance(user.id);
        setQrCode(qrCode);
        setStatus('qr');
      } catch (error) {
        console.error('Erro ao conectar WhatsApp:', error);
        setStatus('error');
      }
    };

    if (user) {
      connectWhatsApp();
    }
  }, [user]);

  useEffect(() => {
    if (status === 'qr' && qrCode) {
      const interval = setInterval(async () => {
        const { status: instanceStatus } = await checkAndUpdateInstanceStatus(user.id);
        if (instanceStatus === 'connected') {
          setStatus('connected');
          clearInterval(interval);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [status, qrCode, user]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-lg">
        <div className="w-[300px] h-[300px] flex items-center justify-center">
          {qrCode && (
            <QRCodeSVG
              value={qrCode}
              size={280}
              level="H"
              includeMargin={true}
            />
          )}
        </div>
      </div>
      <p className="text-sm text-gray-600">
        {status === 'qr' ? 'Escaneie o QR Code com seu WhatsApp' : 'Conectando...'}
      </p>
    </div>
  );
} 