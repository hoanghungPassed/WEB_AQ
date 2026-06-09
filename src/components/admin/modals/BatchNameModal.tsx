import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface BatchNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (batchName: string) => void;
}

export const BatchNameModal = ({
  isOpen,
  onClose,
  onConfirm,
}: BatchNameModalProps) => {
  const [importBatchName, setImportBatchName] = useState("");

  const handleConfirm = () => {
    onConfirm(importBatchName);
    setImportBatchName("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-gray-900 border border-white/0 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-white/0 bg-white/0 flex items-center justify-between">
              <h3 className="text-lg font-black text-white uppercase tracking-tighter">Đặt Tên Lô Cho Dữ Liệu Import</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-400 font-medium leading-relaxed">
                Lô mail mới nhập sẽ được nhóm lại để thuận tiện quản lý công việc, theo dõi tiến độ và phân bổ cho nhân viên.
              </p>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Tên Lô Import</label>
                <input
                  type="text"
                  placeholder="VD: Lô 1 ngày 15/10"
                  value={importBatchName}
                  onChange={(e) => setImportBatchName(e.target.value)}
                  className="w-full bg-black/40 border border-white/0 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:border-gold transition-all"
                />
              </div>
            </div>
            <div className="p-6 border-t border-white/0 bg-white/0 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-white/0 text-sm font-bold text-gray-400 hover:text-white transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirm}
                className="px-5 py-2.5 rounded-xl bg-gold hover:bg-gold-hover text-[#0a0a0a] text-sm font-black uppercase tracking-wider transition-all"
              >
                Xác nhận nạp
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
