import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'error' | 'success' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    error: 'bg-red-500',
    success: 'bg-green-500',
    info: 'bg-blue-500'
  }[type];

  return (
    <div className="absolute left-1/2 bottom-24 -translate-x-1/2 transform z-50">
      <div className={`${bgColor} text-white px-6 py-3 rounded-lg shadow-lg text-center min-w-[200px]`}>
        {message}
      </div>
    </div>
  );
};

export default Toast;
