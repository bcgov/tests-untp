import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// An enumeration for different toast statuses
export enum Status {
  success = 'success',
  error = 'error',
  warning = 'warning',
  info = 'info',
}

export type ToastMessageParams = {
  status: Status;
  message: string;
  /** When set, toast shows an "Open VC" link (e.g. verify URL after issuance). */
  linkURL?: string;
};

// The function for displaying toast messages
export function toastMessage({ status, message, linkURL = '' }: ToastMessageParams): void {
  toast[status](
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div>{message}</div>
      {linkURL ? (
        <a style={{ fontSize: '12px' }} href={linkURL} target="_blank" rel="noreferrer">
          Open VC
        </a>
      ) : null}
    </div>,
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
