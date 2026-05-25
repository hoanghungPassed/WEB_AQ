"use client";

import React from"react";
import QRCode from"qrcode.react";

interface QRCodeDisplayProps {
 value: string;
 accountNumber: string;
 accountHolder: string;
 bankName: string;
}

export default function QRCodeDisplay({
 value,
 accountNumber,
 accountHolder,
 bankName,
}: QRCodeDisplayProps) {
 const handleDownload = () => {
 const element = document.getElementById("qr-code-element") as HTMLElement;
 if (element) {
 const canvas = element.querySelector("canvas");
 if (canvas) {
 const url = canvas.toDataURL("image/png");
 const link = document.createElement("a");
 link.href = url;
 link.download = `qr-code-${accountNumber}-${new Date().toISOString().split("T")[0]}.png`;
 link.click();
 }
 }
 };

 return (
 <div className="flex flex-col items-center gap-4">
 <div id="qr-code-element" className="bg-zinc-900 p-4 rounded-2xl">
 <QRCode
 value={value}
 size={200}
 level="H"
 includeMargin={true}
 bgColor="#ffffff"
 fgColor="#000000"
 />
 </div>
 <div className="w-full space-y-2 text-center">
 <div className="bg-white/10 border border-white/10 rounded-xl p-3 hover:bg-white/12 transition-colors">
 <p className="text-[9px] text-gray-500 font-bold mb-1 hover:text-gold transition-colors hoverable">STK</p>
 <p className="text-base font-black text-gold">{accountNumber}</p>
 </div>
 <div className="bg-white/10 border border-white/10 rounded-xl p-3 hover:bg-white/12 transition-colors">
 <p className="text-[9px] text-gray-500 font-bold mb-1 hover:text-gold transition-colors hoverable">Chủ TK</p>
 <p className="text-base font-black text-white">{accountHolder}</p>
 </div>
 <div className="bg-white/10 border border-white/10 rounded-xl p-3 hover:bg-white/12 transition-colors">
 <p className="text-[9px] text-gray-500 font-bold mb-1 hover:text-gold transition-colors hoverable">Ngân Hàng</p>
 <p className="text-base font-black text-white">{bankName}</p>
 </div>
 </div>
 <button
 onClick={handleDownload}
 className="w-full h-10 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase text-sm tracking-widest transition-all shadow-lg"
 >
 Tải QR Code
 </button>
 </div>
 );
}
