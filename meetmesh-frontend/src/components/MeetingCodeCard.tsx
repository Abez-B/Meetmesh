import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { TooltipButton } from './TooltipButton';
import { useToast } from './ToastProvider';
import { copyToClipboard } from '../utils/clipboard';

interface Props {
  code: string;
  eventName: string;
}

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

export function MeetingCodeCard({ code, eventName }: Props) {
  const joinUrl = `${BASE_URL}/join/${code}`;
  const [copied, setCopied] = useState(false);
  const { success: showSuccess } = useToast();

  const copy = async () => {
    const success = await copyToClipboard(joinUrl);
    if (success) {
      setCopied(true);
      showSuccess('Join link copied to clipboard');
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="meeting-code-card glass-card">
      {/* QR in white box */}
      <div style={{ background: '#fff', padding: 8, borderRadius: 2, flexShrink: 0 }}>
        <QRCodeSVG value={joinUrl} size={100} bgColor="#ffffff" fgColor="#000000" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="meeting-code-label">{eventName}</div>
        <div className="meeting-code-value">{code}</div>
        <div style={{ marginTop: 8 }}>
          <TooltipButton
            id="copy-join-link"
            text={copied ? '✓ Copied' : 'Copy link'}
            variant={copied ? 'success' : 'default'}
            onClick={copy}
            style={{ width: '110px', height: '32px' } as any}
          />
        </div>
      </div>
    </div>
  );
}
