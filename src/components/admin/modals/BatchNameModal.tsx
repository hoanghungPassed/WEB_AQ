"use client";

import React, { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

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
    if (!importBatchName.trim()) return;
    onConfirm(importBatchName);
    setImportBatchName("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Đặt Tên Lô Dữ Liệu"
      subtitle="Nhóm dữ liệu để phân bổ và quản lý"
      icon={<FolderOpen size={24} />}
      maxWidth="max-w-md"
      footer={
        <>
          <button
            onClick={onClose}
            className="h-10 px-4 bg-background-tertiary hover:bg-background-tertiary/80 text-foreground-secondary hover:text-foreground border border-border rounded-sm font-bold uppercase text-xs tracking-widest transition-all"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleConfirm}
            disabled={!importBatchName.trim()}
            className="h-10 px-4 bg-gold hover:bg-gold-dark text-background disabled:opacity-50 disabled:cursor-not-allowed rounded-sm font-bold uppercase text-xs tracking-widest transition-all shadow-md shadow-gold/10"
          >
            Xác nhận nạp
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-foreground-secondary font-medium leading-relaxed">
          Lô mail mới nhập sẽ được nhóm lại để thuận tiện quản lý công việc, theo dõi tiến độ và phân bổ cho nhân viên.
        </p>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-foreground-secondary uppercase tracking-widest block">Tên Lô Import</label>
          <input
            type="text"
            placeholder="VD: Lô 1 ngày 15/10"
            value={importBatchName}
            onChange={(e) => setImportBatchName(e.target.value)}
            className="w-full bg-background-secondary border border-border rounded-md px-4 py-3 text-sm text-foreground placeholder:text-foreground-secondary/40 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
            autoFocus
          />
        </div>
      </div>
    </Modal>
  );
};

export default BatchNameModal;
