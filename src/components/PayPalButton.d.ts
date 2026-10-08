import * as React from 'react';
import type { PayPalButtonProps } from './PayPalButton.types';

// Lets `import PayPalButton from './PayPalButton'` type-check while Metro
// resolves the platform-specific implementation (.web.tsx / .native.tsx).
declare const PayPalButton: React.ComponentType<PayPalButtonProps>;
export default PayPalButton;
