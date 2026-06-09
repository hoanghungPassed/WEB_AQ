import React from 'react';
import { MailData } from '@/types/admin';
import { Search, Mail, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

interface MailSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mails: MailData[];
  selectedMailIds: number[];
  setSelectedMailIds: (ids: number[] | ((prev: number[]) => number[])) => void;
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
      m.recovery?.toLowerCase().includes(modalSearchQuery.toLowerCase()))
  );

  const allSelected = availableMails.length > 0 && availableMails.every((m) => selectedMailIds.includes(m.id));
  const someSelected = availableMails.some((m) => selectedMailIds.includes(m.id)) && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedMailIds(prev => (prev || []).filter(id => !availableMails.some((m) => m.id === id)));
    } else {
      const newIds = [...selectedMailIds];
      availableMails.forEach((m) => {
        if (!newIds.includes(m.id)) newIds.push(m.id);
      });
      setSelectedMailIds(newIds);
    }
  };

  const handleToggleRow = (id: number) => {
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
            <span className="text-base font-black text-gold uppercase tracking-wider">
              Đã chọn: {selectedMailIds.length} mail
            </span>
          </div>
          <div className="flex gap-4 justify-end">
            <button
              onClick={() => {
                setSelectedMailIds([]);
                onClose();
              }}
              className="h-12 px-6 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-sm tracking-widest transition-all"
            >
              Hủy
            </button>
            <button
              onClick={onClose}
              className="h-12 px-6 bg-gold hover:bg-gold-hover text-sidebar rounded-2xl font-black uppercase text-sm tracking-widest transition-all shadow-xl shadow-gold/20"
            >
              Xác nhận
            </button>
          </div>
        </>
      }
    >
      <div className="mb-6 relative z-10">
        <div className="flex items-center gap-2 bg-black/20 border border-white/0 rounded-2xl px-4 h-12 w-full focus-within:border-gold transition-all">
          <Search size={16} className="text-gray-500 shrink-0" />
          <input
            type="text"
            placeholder="Tìm kiếm Email hoặc Mail KP..."
            value={modalSearchQuery}
            onChange={(e) => setModalSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-white w-full"
          />
        </div>
      </div>

      <div className="min-h-[250px]">
        <table className="w-full text-left text-base whitespace-nowrap">
          <thead className="bg-[#0a0a0a] text-gray-500 border-b border-white/0 sticky top-0 z-20">
            <tr>
              <th className="py-4 px-6 text-center w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={handleSelectAll}
                  className="rounded border-white/0 bg-white/5 text-gold focus:ring-0 cursor-pointer h-4 w-4"
                />
              </th>
              <th className="py-4 px-6 font-black uppercase tracking-widest text-[9px]">STT</th>
              <th className="py-4 px-6 font-black uppercase tracking-widest text-[9px]">STT Gốc</th>
              <th className="py-4 px-6 font-black uppercase tracking-widest text-[9px]">Email</th>
              <th className="py-4 px-6 font-black uppercase tracking-widest text-[9px]">Mail KP</th>
              <th className="py-4 px-6 font-black uppercase tracking-widest text-[9px] text-center">Xác Minh</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-gray-300">
            {availableMails.length > 0 ? (
              availableMails.map((mail, index) => (
                <tr key={mail.id} className="hover:bg-zinc-800/50 bg-zinc-900/[0.02] transition-colors group">
                  <td className="py-3 px-6 text-center">
                    <input
                      type="checkbox"
                      checked={selectedMailIds.includes(mail.id)}
                      onChange={() => handleToggleRow(mail.id)}
                      className="rounded border-white/0 bg-white/5 text-gold focus:ring-0 cursor-pointer h-4 w-4"
                    />
                  </td>
                  <td className="py-3 px-6 text-[10px] font-black text-gray-500">{index + 1}</td>
                  <td className="py-3 px-6 text-[10px] font-black text-gold/80">
                    {mail.id}
                  </td>
                  <td className="py-3 px-6 font-bold text-white cursor-pointer" onClick={() => handleToggleRow(mail.id)}>{mail.email}</td>
                  <td className="py-3 px-6 text-sm text-gray-400 font-mono">{mail.recovery}</td>
                  <td className="py-3 px-6 text-center">
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-green-500/10 text-green-500 border border-green-500/20">
                      {mail.verificationStatus}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center font-bold uppercase tracking-widest text-sm">
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
