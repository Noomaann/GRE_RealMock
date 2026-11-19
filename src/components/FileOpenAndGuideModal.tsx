import React, { useState } from 'react';
import { GRETest } from '../types/gre';
import { MONTH_CONFIGS } from '../utils/greLogic';
import {
  FolderOpen,
  FileJson,
  CheckCircle2,
  X,
  Download,
  Play,
} from 'lucide-react';

interface FileOpenAndGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTests: (monthId: string, tests: GRETest[], autoLaunchFirst?: boolean) => void;
}

export const FileOpenAndGuideModal: React.FC<FileOpenAndGuideModalProps> = ({
  isOpen,
  onClose,
  onImportTests,
}) => {
  const [selectedMonthId, setSelectedMonthId] = useState<string>('2026-03');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleFilesSelected = (
    e: React.ChangeEvent<HTMLInputElement>,
    autoLaunch: boolean
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const raw = String(reader.result || '');
          const parsed = JSON.parse(raw);
          const testArray: GRETest[] = Array.isArray(parsed)
            ? parsed
            : parsed && Array.isArray(parsed.questions)
            ? [parsed]
            : [];

          if (testArray.length === 0) {
            setStatusMessage({
              type: 'error',
              text: `"${file.name}" ফাইলে কোনো GRE টেস্ট পাওয়া যায়নি। অনুগ্রহ করে _all-tests.json বা _month.json ফাইল সিলেক্ট করুন।`,
            });
            return;
          }

          let detectedMonth = selectedMonthId;
          const nameMatch = file.name.match(/2026-(0[3-9]|10)/);
          if (nameMatch) {
            detectedMonth = `2026-${nameMatch[1]}`;
          } else if (testArray[0]?.testDate) {
            const dateMonth = testArray[0].testDate.slice(0, 7);
            if (MONTH_CONFIGS.some((m) => m.id === dateMonth)) {
              detectedMonth = dateMonth;
            }
          }

          onImportTests(detectedMonth, testArray, autoLaunch);
          setStatusMessage({
            type: 'success',
            text: `সফলভাবে "${file.name}" থেকে ${testArray.length}টি টেস্ট (${detectedMonth}) লোড করা হয়েছে!`,
          });
        } catch {
          setStatusMessage({
            type: 'error',
            text: `"${file.name}" ফাইলটি পড়া যায়নি। অনুগ্রহ করে সঠিক .json ফাইল (_all-tests.json বা _month.json) ওপেন করুন।`,
          });
        }
      };
      reader.readAsText(file);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Download Single HTML File or Open Local JSON"
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xl space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              সিঙ্গেল HTML ফাইল ডাউনলোড ও লোকাল ফাইল ওপেনার
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              One-Click Standalone HTML File (No Server Needed) · Local JSON Loader
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Option 1: Single Standalone HTML File Download */}
        <div className="p-5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-500/50 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-950 dark:text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>১. একটিমাত্র HTML ফাইল ডাউনলোড করুন (ডাবল-ক্লিক করলেই পিসিতে ওপেন হবে!)</span>
          </div>
          <p className="text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed">
            আপনার জন্য সব ৮ মাসের <strong>৭৮টি টেস্ট ও ৪,২৯১টি প্রশ্নসহ</strong> সম্পূর্ণ ইন্টারফেসটি একটিমাত্র <strong>Single HTML File</strong> হিসেবে তৈরি করে দেওয়া হয়েছে। নিচের বাটনে ক্লিক করে ফাইলটি ডাউনলোড করুন এবং আপনার পিসিতে যেকোনো ব্রাউজারে (Chrome / Edge) ডাবল-ক্লিক করে ওপেন করুন—কোনো কমান্ড বা সার্ভার ছাড়াই পুরো ইন্টারফেস ওপেন হয়ে যাবে!
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href="/GRE-Studio-Full.html"
              download="GRE-Studio-All-78-Tests.html"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Full HTML (সব ৭৮টি টেস্টসহ — GRE-Studio-All-78-Tests.html)
            </a>

            <a
              href="/GRE-Studio-Light.html"
              download="GRE-Studio-Light.html"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-emerald-500/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download Light HTML (শুধু ইন্টারফেস)
            </a>
          </div>
        </div>

        {/* Option 2: Open Any Local JSON File from PC */}
        <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <FolderOpen className="w-4 h-4 text-sky-600 shrink-0" />
            <span>২. আপনার পিসির যেকোনো `_all-tests.json` বা `_month.json` ফাইল ওপেন করুন</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            আপনার পিসিতে ডাউনলোড করা যেকোনো মাসের ফোল্ডার থেকে <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono-tabular">_all-tests.json</code> অথবা <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono-tabular">_month.json</code> ফাইল সরাসরি লোড করতে নিচের বাটনে ক্লিক করুন:
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedMonthId}
              onChange={(e) => setSelectedMonthId(e.target.value)}
              aria-label="Select Month for Local File"
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              {MONTH_CONFIGS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.id})
                </option>
              ))}
            </select>

            <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white cursor-pointer transition-colors">
              <FileJson className="w-3.5 h-3.5" />
              Select JSON File &amp; Open Test
              <input
                type="file"
                accept=".json"
                onChange={(e) => handleFilesSelected(e, true)}
                className="hidden"
              />
            </label>

            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer transition-colors">
              <FolderOpen className="w-3.5 h-3.5" />
              Import Multiple JSON Files
              <input
                type="file"
                accept=".json"
                multiple
                onChange={(e) => handleFilesSelected(e, false)}
                className="hidden"
              />
            </label>
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-lg text-xs font-medium ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-400'
                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border border-rose-400'
              }`}
            >
              {statusMessage.text}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-sky-600 text-white hover:bg-slate-800"
          >
            <Play className="w-3.5 h-3.5" />
            ড্যাশবোর্ডে ফিরে যান
          </button>
        </div>
      </div>
    </div>
  );
};
