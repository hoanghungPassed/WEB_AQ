"use client";

import React, { useState, useEffect } from "react";
import { Users, Database, ArrowLeft, PlusCircle, CheckCircle, X, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function BatchesManagementPage() {
  const [user, setUser] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [staffBatches, setStaffBatches] = useState<string[]>([]);
  const [newBatchName, setNewBatchName] = useState("");
  
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedBatchForAlloc, setSelectedBatchForAlloc] = useState("");
  const [allocateCount, setAllocateCount] = useState(17);

  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      if (parsedUser.role !== "01" && parsedUser.role !== "02" && parsedUser.role !== "ADMIN" && parsedUser.role !== "QUẢN LÝ CÔNG VIỆC") {
        window.location.href = "/admin";
      }
    }

    const loadStaff = () => {
      const savedStaff = localStorage.getItem("global_users");
      if (savedStaff) {
        const parsed = JSON.parse(savedStaff);
        const eligible = parsed.filter((s: any) => 
          s.isOnline === true && 
          (s.role === "03" || s.role === "04" || s.role === "NHÂN VIÊN" || s.role === "QL NHÂN SỰ")
        );
        setStaffList(eligible);
      }
    };

    loadStaff();
    window.addEventListener("storage", loadStaff);
    return () => window.removeEventListener("storage", loadStaff);
  }, []);

  useEffect(() => {
    if (selectedStaff) {
      const defaultBatches = ["Lô 1", "Lô 2", "Lô 3", "Lô 4", "Lô 5", "Lô 6"];
      const savedCustom = localStorage.getItem(`custom_batches_${selectedStaff.id}`);
      if (savedCustom) {
        const custom = JSON.parse(savedCustom);
        setStaffBatches(Array.from(new Set([...defaultBatches, ...custom])));
      } else {
        setStaffBatches(defaultBatches);
      }
    }
  }, [selectedStaff]);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2500);
  };

  const handleAddCustomBatch = () => {
    if (!newBatchName.trim()) return;
    const finalName = newBatchName.trim();
    if (!staffBatches.includes(finalName)) {
      const newBatches = [...staffBatches, finalName];
      setStaffBatches(newBatches);
      localStorage.setItem(`custom_batches_${selectedStaff.id}`, JSON.stringify(newBatches));
      triggerToast(`Đã thêm ${finalName} thành công!`);
    }
    setNewBatchName("");
  };

  const handleAllocate = () => {
    const savedMails = localStorage.getItem("global_mails_data");
    if (!savedMails) return;

    let allMails = JSON.parse(savedMails);
    let emptySatellites = allMails.filter((m: any) => m.type === "SATELLITE" && !m.assigneeId);

    if (emptySatellites.length < allocateCount) {
      alert(`Kho vệ tinh trống chỉ còn ${emptySatellites.length} mail. Không đủ ${allocateCount} mail để gán!`);
      return;
    }

    const mailsToAssign = emptySatellites.slice(0, allocateCount).map((m: any) => m.id);

    allMails = allMails.map((m: any) => {
      if (mailsToAssign.includes(m.id)) {
        return {
          ...m,
          assigneeId: selectedStaff.id,
          batchName: selectedBatchForAlloc
        };
      }
      return m;
    });

    localStorage.setItem("global_mails_data", JSON.stringify(allMails));
    window.dispatchEvent(new Event("storage"));

    setShowAllocateModal(false);
    triggerToast(`Đã gán thành công ${allocateCount} mail vào ${selectedBatchForAlloc}!`);
  };

  return (
    <div className="h-full flex flex-col space-y-6 pb-6 relative">
      <AnimatePresence>
        {toastMsg && (
          <motion.div initial={{ opacity: 0, y: -20, x: "-50%" }} animate={{ opacity: 1, y: 30, x: "-50%" }} exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-0 left-1/2 z-[200] bg-gold px-6 py-2 rounded-full text-sidebar font-black text-sm shadow-2xl flex items-center gap-2"
          >
            <CheckCircle size={18} /> {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAllocateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-sidebar border border-white/10 rounded-[40px] p-10 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                  <Database className="text-gold" size={32} /> Gán Lô
                </h3>
                <button onClick={() => setShowAllocateModal(false)} className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-gray-500 hover:text-white transition-colors"><X /></button>
              </div>
              
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-gold/5 border border-gold/20 flex flex-col items-center justify-center text-center">
                  <span className="text-gold font-black uppercase text-xl">{selectedBatchForAlloc}</span>
                  <span className="text-xs text-gray-400 mt-1 font-bold">Nhân viên: {selectedStaff?.name}</span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Số lượng mail cần cắt từ Kho</label>
                  <input
                    type="number"
                    value={allocateCount}
                    onChange={(e) => setAllocateCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-gold/50 transition-all text-center font-bold text-lg"
                  />
                  <p className="text-[10px] text-gray-500 mt-2 ml-1">Hệ thống sẽ lấy tự động từ trên xuống dưới trong kho vệ tinh trống (Chưa có assigneeId).</p>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button onClick={() => setShowAllocateModal(false)} className="flex-1 h-14 rounded-2xl border border-white/10 text-white font-bold uppercase text-xs tracking-widest hover:bg-white/5 transition-all">Hủy bỏ</button>
                <button onClick={handleAllocate} className="flex-1 h-14 rounded-2xl bg-gold text-sidebar font-black uppercase text-xs tracking-widest hover:bg-gold/80 transition-all shadow-xl shadow-gold/20">Xác nhận Gán</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
          <Database className="text-gold" size={28} />
          Quản Lý Lô Mail Vệ Tinh
        </h2>
      </div>

      {!selectedStaff ? (
        <div className="bg-sidebar border border-border-custom rounded-[32px] overflow-hidden shadow-2xl p-8">
          <div className="mb-8">
            <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
              <Users size={20} className="text-gold" /> Chọn Nhân Viên
            </h3>
            <p className="text-xs text-gray-500 mt-2 font-medium">Danh sách hiển thị các nhân viên đang <span className="text-green-500 font-black">ONLINE</span>.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {staffList.length > 0 ? staffList.map(staff => (
              <button
                key={staff.id}
                onClick={() => setSelectedStaff(staff)}
                className="bg-white/5 border border-white/10 hover:border-gold/50 rounded-3xl p-6 text-left transition-all group shadow-xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 h-32 w-32 bg-gold/5 blur-[50px] rounded-full -mr-16 -mt-16 group-hover:bg-gold/10 transition-colors" />
                <div className="flex items-center gap-4 mb-4 relative z-10">
                  <div className="relative">
                    <div className="h-14 w-14 rounded-2xl bg-gold/10 text-gold flex items-center justify-center border border-gold/20 overflow-hidden shadow-lg">
                      {staff.avatar ? <img src={staff.avatar} className="h-full w-full object-cover" /> : <Users size={24} />}
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-sidebar rounded-full shadow-lg" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white">{staff.name}</h4>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{staff.role === "03" ? "QL NHÂN SỰ" : "NHÂN VIÊN"}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 relative z-10">Bấm vào để cấu hình các lô mail vệ tinh cho nhân viên này.</p>
              </button>
            )) : (
              <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                <Users size={48} className="text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 font-bold uppercase tracking-widest">Không có nhân viên nào đang Online</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-sidebar border border-border-custom rounded-[32px] overflow-hidden shadow-2xl flex flex-col">
          <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button onClick={() => setSelectedStaff(null)} className="h-12 w-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Cấu hình Lô: {selectedStaff.name}</h3>
                <p className="text-xs text-gray-500 mt-1 font-bold uppercase tracking-widest">Chọn Lô để gán mail vệ tinh mới</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {staffBatches.map(batchName => (
                <button
                  key={batchName}
                  onClick={() => {
                    setSelectedBatchForAlloc(batchName);
                    setShowAllocateModal(true);
                  }}
                  className="bg-white/5 border border-white/10 hover:border-gold/50 p-6 rounded-3xl text-left transition-all group shadow-xl hover:shadow-gold/10 flex flex-col"
                >
                  <div className="h-14 w-14 rounded-2xl bg-gold/10 text-gold flex items-center justify-center border border-gold/20 group-hover:scale-110 transition-transform mb-6">
                    <Database size={24} />
                  </div>
                  <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-2 group-hover:text-gold transition-colors">{batchName}</h4>
                  <p className="text-xs text-gray-500 font-medium">Cắt mail từ kho vệ tinh gán vào lô này</p>
                </button>
              ))}

              <div className="bg-white/[0.02] border border-dashed border-white/10 p-6 rounded-3xl flex flex-col justify-between">
                <div className="h-14 w-14 rounded-2xl bg-white/5 text-gray-500 flex items-center justify-center border border-white/10 mb-6">
                  <PlusCircle size={24} />
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-black text-white uppercase tracking-tighter">Tạo thêm Lô</h4>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Tên lô mới..." 
                      value={newBatchName}
                      onChange={(e) => setNewBatchName(e.target.value)}
                      className="flex-1 h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs text-white outline-none focus:border-gold/50 transition-all"
                    />
                    <button 
                      onClick={handleAddCustomBatch}
                      className="h-10 px-4 bg-gold/10 text-gold hover:bg-gold hover:text-sidebar border border-gold/30 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                      Thêm
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
