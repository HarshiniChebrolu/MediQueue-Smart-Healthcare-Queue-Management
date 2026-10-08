import React, { useState } from 'react';
import { QrCode, Copy, Check, X, Smartphone, ArrowRight } from 'lucide-react';

export const QRCodeModal = ({ isOpen, onClose, doctorId = '', departmentId = '', doctorName = 'Doctor', roomNumber = 'Room 101' }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const joinUrl = `${window.location.origin}/signin?action=join_queue&doc=${doctorId}&dept=${departmentId}`;
  
  // High quality QR code API fallback URL for reliable mobile scanning
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(joinUrl)}&margin=10`;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 text-center relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto shadow-sm">
          <QrCode className="w-6 h-6" />
        </div>

        <div>
          <span className="px-3 py-1 bg-teal-50 text-teal-800 font-extrabold text-[11px] rounded-full uppercase tracking-wider border border-teal-200">
            Contactless Queue Entry
          </span>
          <h3 className="text-xl font-black text-slate-900 mt-1">
            Scan QR Code to Join Queue
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {doctorName} • {roomNumber}
          </p>
        </div>

        {/* QR Code Frame */}
        <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 inline-block shadow-inner">
          <img
            src={qrCodeApiUrl}
            alt="Scan QR Code to Join Queue"
            className="w-56 h-56 rounded-xl mx-auto shadow-sm bg-white p-2"
          />
        </div>

        <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-3 text-xs text-teal-900 text-left space-y-1">
          <div className="flex items-center gap-2 font-bold text-teal-950">
            <Smartphone className="w-4 h-4 text-teal-700" />
            <span>How it works:</span>
          </div>
          <p className="text-[11px] text-teal-800">
            1. Open camera on smartphone • 2. Point at QR code • 3. Open link to get digital token instantly without app install.
          </p>
        </div>

        <div className="pt-2 flex gap-2">
          <button
            onClick={handleCopy}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-300 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Direct Join URL'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
