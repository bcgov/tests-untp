import React, { act } from 'react';
import { render, waitFor } from '@testing-library/react';

import { ToastMessage, toastMessage, Status } from './ToastMessage';

describe('Toast Message', () => {
  test('renders ToastMessage component and triggers toast', async () => {
    const status = Status.success;
    const message = 'Test message';

    // Render the component
    render(<ToastMessage />);

    // Call the toastMessage function
    act(() => {
      toastMessage({ status, message });
    });

    // Check that the toast message is correctly.
    await waitFor(() => {
      expect(document.body).toHaveTextContent(message);
    });
  });

  test('renders toast with linkURL when provided', async () => {
    const status = Status.success;
    const message = 'VC issued';
    const linkURL = 'https://example.com/vc/123';

    render(<ToastMessage />);

    act(() => {
      toastMessage({ status, message, linkURL });
    });

    await waitFor(() => {
      expect(document.body).toHaveTextContent(message);
      expect(document.body).toHaveTextContent('Open VC');
      const link = document.querySelector('a[href="https://example.com/vc/123"]');
      expect(link).not.toBeNull();
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});
