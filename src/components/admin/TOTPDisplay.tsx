"use client";

import React, { useState, useEffect, useCallback } from "react";

/**
 * TOTP (Time-based One-Time Password) component
 * Implements RFC 6238 - computes 6-digit code from a Base32 secret key
 * Updates in real-time, same code as Google Authenticator / 2FA apps
 */

function base32ToBytes(base32: string): Uint8Array {
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = base32.toUpperCase().replace(/\s/g, "").replace(/=/g, "");
  const bits: number[] = [];
  for (const char of clean) {
    const idx = ALPHABET.indexOf(char);
    if (idx === -1) continue;
    for (let i = 4; i >= 0; i--) bits.push((idx >> i) & 1);
  }
  const bytes = new Uint8Array(Math.floor((bits || []).length / 8));
  for (let i = 0; i < (bytes || []).length; i++) {
    for (let j = 0; j < 8; j++) {
      bytes[i] = (bytes[i] << 1) | bits[i * 8 + j];
    }
  }
  return bytes;
}

async function hmacSha1(keyBytes: Uint8Array, msgBytes: Uint8Array): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey("raw", keyBytes.buffer as ArrayBuffer, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", key, msgBytes.buffer as ArrayBuffer);
}

async function computeTOTP(secret: string, timeStep = 30): Promise<{ code: string; remaining: number }> {
  const now = Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / timeStep);
  const remaining = timeStep - (now % timeStep);

  const keyBytes = base32ToBytes(secret);
  const msgBytes = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) { msgBytes[i] = c & 0xff; c >>= 8; }

  const sig = await hmacSha1(keyBytes, msgBytes);
  const arr = new Uint8Array(sig);
  const offset = arr[(arr || []).length - 1] & 0x0f;
  const code = ((arr[offset] & 0x7f) << 24 | arr[offset + 1] << 16 | arr[offset + 2] << 8 | arr[offset + 3]) % 1_000_000;

  return { code: String(code).padStart(6, "0"), remaining };
}

interface TOTPDisplayProps {
  secret: string;
  compact?: boolean;
  onCopy?: (text: string, label: string) => void;
}

export default function TOTPDisplay({ secret, compact = false, onCopy }: TOTPDisplayProps) {
  const [code, setCode] = useState<string>("------");
  const [remaining, setRemaining] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!secret || secret.trim() === "") {
      setCode("------");
      setLoading(false);
      return;
    }

    let mounted = true;
    const update = async () => {
      try {
        const result = await computeTOTP(secret);
        if (mounted) {
          setCode(result.code);
          setRemaining(result.remaining);
          setLoading(false);
        }
      } catch {
        if (mounted) { setCode("ERROR"); setLoading(false); }
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => { mounted = false; clearInterval(interval); };
  }, [secret]);

  const handleCopy = useCallback(() => {
    if (code === "------" || code === "ERROR") return;
    if (onCopy) {
      onCopy(code, "Mã 2FA");
    } else {
      navigator.clipboard.writeText(code);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [code, onCopy]);

  const urgency = remaining <= 5 ? "text-red-400" : remaining <= 10 ? "text-yellow-400" : "text-emerald-400";
  const secondsColor = remaining <= 5 ? "text-red-500" : remaining <= 10 ? "text-yellow-500" : "text-emerald-500";

  if (compact) {
    return (
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 group/totp cursor-pointer"
        title="Bấm để sao chép mã 2FA"
      >
        <span className={`font-mono font-black text-base tracking-[0.15em] ${loading ? "text-gray-600" : copied ? "text-gold" : urgency} transition-colors`}>
          {loading ? "···" : copied ? "Copied!" : code}
        </span>
        <span className={`text-[10px] font-black ${secondsColor} min-w-[22px] text-right`}>
          {remaining}s
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleCopy}
        className="w-full cursor-pointer group/totp"
        title="Bấm để sao chép mã 2FA"
      >
        <div className={`text-4xl font-black tracking-[0.3em] text-center ${loading ? "text-gray-600" : copied ? "text-gold" : urgency} transition-colors`}>
          {loading ? "------" : copied ? "Copied!" : `${code.slice(0, 3)} ${code.slice(3)}`}
        </div>
      </button>
      <p className="text-center text-sm text-gray-500">
        Mã mới sau <span className={`font-black ${secondsColor}`}>{remaining}s</span> · Bấm mã để sao chép
      </p>
    </div>
  );
}
