'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Collapse, Typography } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { Scanner } from '@/components/Scanner';
import type { IScannerRef } from '@/types/scanner.types';

/**
 * Optional QR scanner on the verify page (pyx QRCodeScannerDialogButton successor).
 * Decodes a credential verify URL or ?q= JSON envelope and navigates to /verify.
 */
export default function VerifyQrScanner() {
  const router = useRouter();
  const scannerRef = useRef<IScannerRef>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigateFromScan = useCallback(
    (decodedText: string) => {
      setError(null);
      try {
        const trimmed = decodedText.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          const url = new URL(trimmed);
          if (url.pathname.endsWith('/verify') || url.pathname.includes('/verify')) {
            router.push(`${url.pathname}${url.search}`);
            return;
          }
        }

        const parsed = JSON.parse(trimmed) as { payload?: { uri?: string; digestMultibase?: string; hash?: string } };
        const uri = parsed?.payload?.uri;
        if (uri) {
          const params = new URLSearchParams({ uri });
          if (parsed.payload.digestMultibase) params.set('digestMultibase', parsed.payload.digestMultibase);
          if (parsed.payload.hash) params.set('hash', parsed.payload.hash);
          router.push(`/verify?${params.toString()}`);
          return;
        }

        setError('Scanned code is not a credential verify link');
      } catch {
        setError('Scanned code is not a valid verify URL or JSON payload');
      }
    },
    [router],
  );

  const onScanSuccess = useCallback(
    (decodedText: string) => {
      void scannerRef.current?.closeQrCodeScanner();
      setOpen(false);
      navigateFromScan(decodedText);
    },
    [navigateFromScan],
  );

  return (
    <Box sx={{ mb: 2 }}>
      <Button
        variant='outlined'
        startIcon={<QrCodeScannerIcon />}
        onClick={() => {
          setOpen((v) => !v);
          setError(null);
        }}
      >
        {open ? 'Hide scanner' : 'Scan credential QR'}
      </Button>
      <Collapse in={open}>
        <Box sx={{ mt: 2, maxWidth: 480 }}>
          <Scanner
            ref={scannerRef}
            qrCodeSuccessCallback={onScanSuccess}
            qrCodeErrorCallback={() => undefined}
          />
        </Box>
      </Collapse>
      {error && (
        <Typography color='error' variant='body2' sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
