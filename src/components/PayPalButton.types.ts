// Shared prop contract for the platform-specific PayPal button
// (PayPalButton.web.tsx and PayPalButton.native.tsx).
export interface PayPalButtonProps {
  amount: number;
  // Called after the server confirms the capture completed.
  onPaid: (captureId: string | null) => void;
  onError: (message: string) => void;
  onCancel?: () => void;
}
