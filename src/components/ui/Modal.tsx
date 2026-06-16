"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  icon?: React.ReactNode;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-4xl',
  icon,
}: ModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[400] bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className={`bg-background-secondary border border-border w-full ${maxWidth} rounded-lg p-6 md:p-8 shadow-premium relative overflow-hidden flex flex-col max-h-[90vh]`}
          >
            <div className="absolute top-0 right-0 h-96 w-96 bg-gold/5 blur-[120px] -mr-48 -mt-48" />

            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-4">
                {icon && (
                  <div className="h-12 w-12 rounded-md bg-gold/10 text-gold flex items-center justify-center border border-gold/20 shadow-lg font-bold">
                    {icon}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-foreground uppercase tracking-tight">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-[10px] text-foreground-secondary font-bold uppercase tracking-[0.2em]">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 hover:bg-background-tertiary text-foreground-secondary hover:text-foreground rounded-sm flex items-center justify-center transition-all border border-transparent focus:outline-none"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
              {children}
            </div>

            {footer && (
              <div className="grid grid-cols-2 gap-4 mt-6 relative z-10 pt-4 border-t border-border">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
