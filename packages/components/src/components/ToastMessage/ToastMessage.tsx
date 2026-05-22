import React from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// An enumeration for different toast statuses
export enum Status {
  success = 'success',
  error = 'error',
  warning = 'warning',
  info = 'info',
}

// The function for displaying toast messages
export function toastMessage({
  status,
  message,
  linkURL,
}: {
  status: Status;
  message: string;
  linkURL?: string;
}): void {
  toast[status](
    linkURL ? (
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>{message}</div>
        <a style={{ fontSize: '12px' }} href={linkURL} target='_blank' rel='noopener noreferrer'>
          Open VC
        </a>
      </div>
    ) : (
      message
    ),
    {
      position: 'top-right',
      hideProgressBar: true,
      pauseOnHover: true,
      draggable: true,
      autoClose: 4000,
    },
  );
}

// ToastMessage component for displaying a ToastContainer
export const ToastMessage = () => {
  return <ToastContainer />;
};
