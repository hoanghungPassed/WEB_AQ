"use client";

import React from "react";
import { ExternalLink } from "lucide-react";

interface PhoneCellProps {
  value: string | undefined | null;
  className?: string;
  onCopy?: (text: string, label: string) => void;
}

/**
 * Hiển thị SĐT hoặc link:
 * - Nếu value là URL (bắt đầu http/https) → render <a> mở tab mới
 * - Ngược lại → giữ nguyên click để copy
 */
export function PhoneCell({ value, className = "", onCopy }: PhoneCellProps) {
  if (!value) return <span className={`text-gray-700 ${className}`}>---</span>;

  const isUrl = value.startsWith("http://") || value.startsWith("https://");

  if (isUrl) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold transition-colors ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink size={12} />
        Mở link
      </a>
    );
  }

  return (
    <span
      className={`cursor-pointer hover:text-gold transition-colors ${className}`}
      onClick={() => onCopy?.(value, "SĐT")}
    >
      {value}
    </span>
  );
}
