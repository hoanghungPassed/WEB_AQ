import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Trash2, Calendar, User as UserIcon } from 'lucide-react';

export type ImportHistoryItem = {
  id: string;
  type: string;
  fileName: string;
  quantity: number;
  importedAt: string;
  importedBy: string;
};

interface ImportHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  importHistory: ImportHistoryItem[];
  onDeleteRow: (id: string) => void;
  onClearAll: () => void;
}

export const ImportHistoryModal = ({
  isOpen,
  onClose,
  importHistory,
  onDeleteRow,
  onClearAll,
}: ImportHistoryModalProps) => {
  const [historyTab, setHistoryTab] = useState<string>("ALL");

  const filteredHistory = useMemo(() => {
    if (historyTab === "ALL") return importHistory;
    return (importHistory || []).filter((item) => item.type === historyTab);
  }, [importHistory, historyTab]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#18181b] border border-white/0 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col shadow-xl overflow-hidden relative p-6"
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700/50">
                  <FileText className="text-[#a07800]" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-100 uppercase tracking-tight">LỊCH SỬ IMPORT HỆ THỐNG</h3>
                  <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">Nhật ký danh sách nhập dữ liệu</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {(importHistory || []).length > 0 && (
                  <button
                    onClick={onClearAll}
                    className="h-9 px-3.5 bg-red-950/20 border border-red-900/30 hover:bg-red-600 hover:text-white rounded-xl text-red-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                  >
                    <Trash2 size={13} /> Xóa tất cả
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="h-9 w-9 flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-700/50 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-6 bg-zinc-950/40 border border-white/0 p-1 rounded-xl w-fit">
              {(["ALL", "MAIL", "SĐT"] as Array<"ALL" | "MAIL" | "SĐT">).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setHistoryTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    historyTab === tab
                      ? "bg-[#a07800] text-white shadow-sm"
                      : " text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {tab === "ALL" ? "Tất cả" : tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
              {(filteredHistory || []).length === 0 ? (
                <div className="py-12 text-center border border-dashed border-white/0 rounded-xl bg-zinc-950/20">
                  <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3 border border-zinc-700/50">
                    <FileText className="text-zinc-500" size={24} />
                  </div>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Không có lịch sử nhập dữ liệu</p>
                  <p className="text-[9px] text-zinc-600 mt-1 uppercase tracking-widest font-semibold">Các lượt import mới sẽ tự động được ghi nhận tại đây.</p>
                </div>
              ) : (
                (filteredHistory || []).map((item) => (
                  <div
                    key={item.id}
                    className="bg-zinc-950/35 border border-white/0 rounded-xl p-4 flex items-center justify-between hover:border-zinc-700 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-9 w-9 rounded-lg flex items-center justify-center border font-mono text-[9px] font-bold tracking-widest ${
                          item.type === "MAIL"
                            ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                            : "bg-[#a07800]/10 text-[#a07800] border-[#a07800]/20"
                        }`}
                      >
                        {item.type}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-zinc-200 font-mono break-all">{item.fileName}</span>
                          <span className="text-[9px] bg-green-950/30 text-green-400 border border-green-900/30 px-2 py-0.5 rounded-lg font-bold">
                            +{item.quantity} {item.type === "MAIL" ? "mail" : "số"}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {item.importedAt}
                          </span>
                          <span className="flex items-center gap-1">
                            <UserIcon size={12} />
                            Người nhập: <strong className="text-zinc-400">{item.importedBy}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteRow(item.id)}
                      className="h-8 w-8 rounded-lg bg-zinc-800 hover:bg-red-950/30 text-zinc-500 hover:text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-zinc-700/50"
                      title="Xóa dòng lịch sử này"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
