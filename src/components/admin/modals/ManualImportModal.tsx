import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PlusCircle } from 'lucide-react';

interface ManualImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: string) => void;
}

export const ManualImportModal = ({
  isOpen,
  onClose,
  onConfirm,
}: ManualImportModalProps) => {
  const [manualData, setManualData] = useState("");

  const handleConfirm = () => {
    onConfirm(manualData);
    setManualData("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#18181b] border border-white/0 rounded-xl p-6 w-full max-w-2xl shadow-xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-zinc-50 uppercase tracking-tight flex items-center gap-3">
                <PlusCircle className="text-[#a07800]" size={24} /> Import Thủ Công
              </h3>
              <button
                onClick={onClose}
                className="h-9 w-9 flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors border border-zinc-700/50"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 mb-4 font-semibold uppercase tracking-wider leading-relaxed">
              Định dạng: Email [Tab/Cách] Pass [Tab/Cách] Mail KP [Tab/Cách] 2FA [Tab/Cách] SĐT [Tab/Cách] Link OTP
            </p>
            <textarea
              value={manualData}
              onChange={(e) => setManualData(e.target.value)}
              className="w-full h-64 bg-zinc-950/60 border border-white/0 rounded-xl p-4 text-sm text-zinc-100 focus:border-[#a07800] outline-none transition-all resize-none font-mono"
              placeholder="Dán dữ liệu của bạn vào đây..."
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 h-10 rounded-xl border border-zinc-700 text-zinc-300 font-semibold uppercase text-xs tracking-wider hover:bg-zinc-800 bg-transparent transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 h-10 rounded-xl bg-[#a07800] text-white font-bold uppercase text-xs tracking-wider hover:bg-[#b88c00] transition-all shadow-sm"
              >
                Xác nhận Thêm
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
