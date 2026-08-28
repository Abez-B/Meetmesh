import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  }, [onCancel]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const variantStyles = {
    danger: {
      border: '1px solid rgba(239, 68, 68, 0.3)',
      confirmBg: '#ef4444',
      confirmText: '#fff',
    },
    warning: {
      border: '1px solid rgba(245, 158, 11, 0.3)',
      confirmBg: '#f59e0b',
      confirmText: '#000',
    },
    info: {
      border: '1px solid rgba(255, 255, 255, 0.1)',
      confirmBg: 'rgba(255,255,255,0.12)',
      confirmText: '#f5f5f5',
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="confirm-dialog-overlay" onClick={onCancel}>
          <motion.div
            className="confirm-dialog"
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            style={variantStyles[variant]}
          >
            <h3 className="confirm-dialog-title">{title}</h3>
            <p className="confirm-dialog-message">{message}</p>
            <div className="confirm-dialog-actions">
              <button className="confirm-dialog-cancel" onClick={onCancel} type="button">
                {cancelText}
              </button>
              <button
                className="confirm-dialog-confirm"
                style={{ backgroundColor: variantStyles[variant].confirmBg, color: variantStyles[variant].confirmText }}
                onClick={onConfirm}
                type="button"
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
