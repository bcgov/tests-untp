import React, { act } from 'react';
import { render, waitFor } from '@testing-library/react';

import { ToastMessage, toastMessage, Status } from './ToastMessage';

describe('Toast Message', () => {
  test('renders ToastMessage component and triggers toast', async () => {
    const status = Status.success;
    const message = 'Test message';

    render(<ToastMessage />);

    act(() => {
      toastMessage({ status, message });
    });

    await waitFor(() => {
      expect(document.body).toHaveTextContent(message);
    });
  });

  test('shows Open VC link when linkURL is provided', async () => {
    const verifyUrl = 'https://example.com/verify/1';

    render(<ToastMessage />);

    act(() => {
      toastMessage({ status: Status.success, message: 'Credential issued', linkURL: verifyUrl });
    });

    await waitFor(() => {
      const link = document.body.querySelector('a[href="' + verifyUrl + '"]');
      expect(link).toHaveTextContent('Open VC');
    });
  });
});
