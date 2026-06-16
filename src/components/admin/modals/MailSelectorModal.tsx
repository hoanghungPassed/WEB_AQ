"use client";

import React from 'react';
import { MailData } from '@/types/admin';
import { Search, Mail } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

interface MailSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mails: MailData[];
  selectedMailIds: string[];
  setSelectedMailIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  modalSearchQuery: string;
  setModalSearchQuery: (query: string) => void;
}

export const MailSelectorModal = ({
  isOpen,
  onClose,
  mails,
  selectedMailIds,
  setSelectedMailIds,
  modalSearchQuery,
  setModalSearchQuery,
}: MailSelectorModalProps) => {
  const availableMails = (mails || []).filter((m) => 
    m.type === "ROOT" && 
    m.verificationStatus === "Đã xanh" && 
    (m.workStatus === "Chưa làm" || !m.workStatus) &&
    (!modalSearchQuery || 
      m.email.toLowerCase().includes(modalSearchQuery.toLowerCase()) || 
      (m.recoveryMail || m.recovery || "")?.toLowerCase().includes(modalSearchQuery.toLowerCase()))
  );

  const getMailKey = (m: MailData) => String(m._id || m.id || "");

  const allSelected = availableMails.length > 0 && availableMails.every((m) => selectedMailIds.includes(getMailKey(m)));
  const someSelected = availableMails.some((m) => selectedMailIds.includes(getMailKey(m))) && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedMailIds(prev => (prev || []).filter(id => !availableMails.some((m) => getMailKey(m) === id)));
    } else {
      const newIds = [...selectedMailIds];
      availableMails.forEach((m) => {
        const key = getMailKey(m);
        if (key && !newIds.includes(key)) newIds.push(key);
      });
      setSelectedMailIds(newIds);
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedMailIds(prev => 
      prev.includes(id) ? (prev || []).filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chọn Mail Gốc"
      subtitle='Chỉ hiển thị mail "Đã xanh" & "Chưa làm"'
      icon={<Mail size={24} />}
      footer={
        <>
          <div className="flex items-center">
            <span className="text-sm font-bold text-gold uppercase tracking-wider">
              Đã chọn: {selectedMailIds.length} mail
            </span>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setSelectedMailIds([]);
                onClose();
              }}
              className="h-10 px-4 bg-background-tertiary hover:bg-background-tertiary/80 text-foreground border border-border rounded-sm font-bold uppercase text-xs tracking-widest transition-all"
            >
              Hủy
            </button>
            <button
              onClick={onClose}
              className="h-10 px-4 bg-gold hover:bg-gold-dark text-background rounded-sm font-bold uppercase text-xs tracking-widest transition-all shadow-md shadow-gold/10"
            >
              Xác nhận
            </button>
          </div>
        </>
      }
    >
      <div className="mb-6 relative z-10">
        <div className="relative flex items-center bg-background-secondary border border-border rounded-md h-10 w-full focus-within:border-gold transition-all">
          <Search size={14} className="absolute left-3 text-foreground-secondary shrink-0" />
          <input
            type="text"
            placeholder="Tìm kiếm Email hoặc Mail KP..."
            value={modalSearchQuery}
            onChange={(e) => setModalSearchQuery(e.target.value)}
            className="pl-9 bg-transparent border-none outline-none text-xs text-foreground w-full h-full placeholder:text-foreground-secondary/40"
          />
        </div>
      </div>

      <div className="min-h-[250px] overflow-y-auto max-h-[40vh] custom-scrollbar">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-background-secondary text-foreground-secondary border-b border-border sticky top-0 z-20">
            <tr>
              <th className="py-3 px-6 text-center w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={handleSelectAll}
                  className="rounded border-border bg-background-secondary text-gold focus:ring-0 cursor-pointer h-4 w-4"
                />
              </th>
              <th className="py-3 px-6 font-bold uppercase tracking-wider text-[10px]">STT</th>
              <th className="py-3 px-6 font-bold uppercase tracking-wider text-[10px]">STT Gốc</th>
              <th className="py-3 px-6 font-bold uppercase tracking-wider text-[10px]">Email</th>
              <th className="py-3 px-6 font-bold uppercase tracking-wider text-[10px]">Mail KP</th>
              <th className="py-3 px-6 font-bold uppercase tracking-wider text-[10px] text-center">Xác Minh</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-foreground-secondary">
            {availableMails.length > 0 ? (
              availableMails.map((mail, index) => {
                const key = getMailKey(mail);
                return (
                  <tr key={key} className="hover:bg-background-tertiary/40 bg-transparent transition-colors group">
                    <td className="py-2 px-6 text-center">
                      <input
                        type="checkbox"
                        checked={selectedMailIds.includes(key)}
                        onChange={() => handleToggleRow(key)}
                        className="rounded border-border bg-background-secondary text-gold focus:ring-0 cursor-pointer h-4 w-4"
                      />
                    </td>
                    <td className="py-2 px-6 text-xs text-foreground-secondary/70">{index + 1}</td>
                    <td className="py-2 px-6 text-xs text-gold/90 font-bold">
                      {mail.stt || mail.id}
                    </td>
                    <td className="py-2 px-6 font-medium text-foreground cursor-pointer" onClick={() => handleToggleRow(key)}>{mail.email}</td>
                    <td className="py-2 px-6 text-xs text-foreground-secondary font-mono">{mail.recoveryMail || mail.recovery}</td>
                    <td className="py-2 px-6 text-center">
                      <Badge variant="success">
                        {mail.verificationStatus}
                      </Badge>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center font-bold uppercase tracking-widest text-xs">
                  Không tìm thấy mail gốc khả dụng nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
};
