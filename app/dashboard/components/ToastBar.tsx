"use client";

interface ToastBarProps {
  message: string | null;
}

export default function ToastBar({ message }: ToastBarProps) {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-success text-white px-4 py-2 text-sm font-medium shadow-popover">
      {message}
    </div>
  );
}
