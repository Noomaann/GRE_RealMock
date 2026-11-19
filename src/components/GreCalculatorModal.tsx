import React, { useState } from 'react';
import { X, Delete, ArrowDownToLine } from 'lucide-react';

interface GreCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransferDisplay?: (value: string) => void;
}

export const GreCalculatorModal: React.FC<GreCalculatorModalProps> = ({
  isOpen,
  onClose,
  onTransferDisplay,
}) => {
  const [display, setDisplay] = useState<string>('0');
  const [memory, setMemory] = useState<number>(0);
  const [pendingOp, setPendingOp] = useState<string | null>(null);
  const [storedVal, setStoredVal] = useState<number | null>(null);
  const [resetNext, setResetNext] = useState<boolean>(false);

  if (!isOpen) return null;

  const inputDigit = (d: string) => {
    if (display === 'Error') {
      setDisplay(d === '.' ? '0.' : d);
      setResetNext(false);
      return;
    }
    if (resetNext) {
      setDisplay(d === '.' ? '0.' : d);
      setResetNext(false);
    } else {
      if (d === '.' && display.includes('.')) return;
      if (display === '0' && d !== '.') {
        setDisplay(d);
      } else if (display.replace('-', '').length < 10) {
        setDisplay(display + d);
      }
    }
  };

  const compute = (a: number, b: number, op: string): number | 'Error' => {
    switch (op) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '×':
        return a * b;
      case '÷':
        return b === 0 ? 'Error' : a / b;
      default:
        return b;
    }
  };

  const formatResult = (val: number | 'Error'): string => {
    if (val === 'Error' || !Number.isFinite(val)) return 'Error';
    const rounded = Number(Math.round(Number(val + 'e8')) + 'e-8');
    return String(rounded);
  };

  const handleOperator = (op: string) => {
    const current = parseFloat(display);
    if (Number.isNaN(current)) return;

    if (storedVal !== null && pendingOp && !resetNext) {
      const res = compute(storedVal, current, pendingOp);
      const formatted = formatResult(res);
      setDisplay(formatted);
      setStoredVal(res === 'Error' ? null : res);
    } else {
      setStoredVal(current);
    }
    setPendingOp(op);
    setResetNext(true);
  };

  const handleEquals = () => {
    if (storedVal === null || !pendingOp) return;
    const current = parseFloat(display);
    if (Number.isNaN(current)) return;
    const res = compute(storedVal, current, pendingOp);
    setDisplay(formatResult(res));
    setStoredVal(null);
    setPendingOp(null);
    setResetNext(true);
  };

  const handleSqrt = () => {
    const current = parseFloat(display);
    if (Number.isNaN(current) || current < 0) {
      setDisplay('Error');
      setResetNext(true);
      return;
    }
    setDisplay(formatResult(Math.sqrt(current)));
    setResetNext(true);
  };

  const handleSignToggle = () => {
    if (display === '0' || display === 'Error') return;
    setDisplay(display.startsWith('-') ? display.slice(1) : '-' + display);
  };

  const handleClearEntry = () => {
    setDisplay('0');
  };

  const handleClearAll = () => {
    setDisplay('0');
    setStoredVal(null);
    setPendingOp(null);
    setResetNext(false);
  };

  const handleBackspace = () => {
    if (resetNext || display === 'Error') {
      setDisplay('0');
      return;
    }
    if (display.length <= 1 || (display.length === 2 && display.startsWith('-'))) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  return (
    <div
      className="fixed bottom-20 right-6 z-40 w-72 bg-slate-900 text-slate-100 rounded-xl border border-slate-700 shadow-2xl select-none"
      role="dialog"
      aria-label="GRE On-Screen Calculator"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-800/90 border-b border-slate-700 rounded-t-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-tight text-slate-100">
            ETS GRE Calculator
          </span>
          {memory !== 0 && (
            <span className="text-[11px] font-mono-tabular text-amber-400">
              M={memory}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
          aria-label="Close calculator"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Display */}
      <div className="p-3 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-400 h-4">
          <span>{storedVal !== null && pendingOp ? `${storedVal} ${pendingOp}` : ''}</span>
          <button
            type="button"
            onClick={handleBackspace}
            className="text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"
            title="Backspace"
          >
            <Delete className="w-3.5 h-3.5" />
          </button>
        </div>
        <div
          className="text-right text-2xl font-mono-tabular font-semibold tracking-tight text-white py-1 overflow-x-auto"
          data-testid="calculator-display"
        >
          {display}
        </div>
      </div>

      {/* Keypad */}
      <div className="p-3 grid grid-cols-5 gap-1.5 text-xs font-medium">
        {/* Row 1: Memory + Clear */}
        <button
          type="button"
          onClick={() => setMemory(0)}
          className="py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
        >
          MC
        </button>
        <button
          type="button"
          onClick={() => {
            setDisplay(formatResult(memory));
            setResetNext(true);
          }}
          className="py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
        >
          MR
        </button>
        <button
          type="button"
          onClick={() => {
            const val = parseFloat(display);
            if (!Number.isNaN(val)) setMemory((m) => m + val);
            setResetNext(true);
          }}
          className="py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
        >
          M+
        </button>
        <button
          type="button"
          onClick={handleClearEntry}
          className="py-2 rounded bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 border border-amber-800/40"
        >
          CE
        </button>
        <button
          type="button"
          onClick={handleClearAll}
          className="py-2 rounded bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-800/40"
        >
          C
        </button>

        {/* Row 2 */}
        <button
          type="button"
          onClick={() => inputDigit('7')}
          className="py-2.5 rounded bg-slate-800/80 hover:bg-slate-700 text-white font-mono-tabular text-sm"
        >
          7
        </button>
        <button
          type="button"
          onClick={() => inputDigit('8')}
          className="py-2.5 rounded bg-slate-800/80 hover:bg-slate-700 text-white font-mono-tabular text-sm"
        >
          8
        </button>
        <button
          type="button"
          onClick={() => inputDigit('9')}
          className="py-2.5 rounded bg-slate-800/80 hover:bg-slate-700 text-white font-mono-tabular text-sm"
        >
          9
        </button>
        <button
          type="button"
          onClick={() => handleOperator('÷')}
          className="py-2.5 rounded bg-sky-950/80 hover:bg-sky-900 text-sky-300 font-semibold text-sm"
        >
          ÷
        </button>
        <button
          type="button"
          onClick={handleSqrt}
          className="py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
        >
          √
        </button>

        {/* Row 3 */}
        <button
          type="button"
          onClick={() => inputDigit('4')}
          className="py-2.5 rounded bg-slate-800/80 hover:bg-slate-700 text-white font-mono-tabular text-sm"
        >
          4
        </button>
        <button
          type="button"
          onClick={() => inputDigit('5')}
          className="py-2.5 rounded bg-slate-800/80 hover:bg-slate-700 text-white font-mono-tabular text-sm"
        >
          5
        </button>
        <button
          type="button"
          onClick={() => inputDigit('6')}
          className="py-2.5 rounded bg-slate-800/80 hover:bg-slate-700 text-white font-mono-tabular text-sm"
        >
          6
        </button>
        <button
          type="button"
          onClick={() => handleOperator('×')}
          className="py-2.5 rounded bg-sky-950/80 hover:bg-sky-900 text-sky-300 font-semibold text-sm"
        >
          ×
        </button>
        <button
          type="button"
          onClick={handleSignToggle}
          className="py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
        >
          ±
        </button>

        {/* Row 4 */}
        <button
          type="button"
          onClick={() => inputDigit('1')}
          className="py-2.5 rounded bg-slate-800/80 hover:bg-slate-700 text-white font-mono-tabular text-sm"
        >
          1
        </button>
        <button
          type="button"
          onClick={() => inputDigit('2')}
          className="py-2.5 rounded bg-slate-800/80 hover:bg-slate-700 text-white font-mono-tabular text-sm"
        >
          2
        </button>
        <button
          type="button"
          onClick={() => inputDigit('3')}
          className="py-2.5 rounded bg-slate-800/80 hover:bg-slate-700 text-white font-mono-tabular text-sm"
        >
          3
        </button>
        <button
          type="button"
          onClick={() => handleOperator('-')}
          className="py-2.5 rounded bg-sky-950/80 hover:bg-sky-900 text-sky-300 font-semibold text-sm"
        >
          −
        </button>
        <button
          type="button"
          onClick={handleEquals}
          className="row-span-2 py-2.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-base"
        >
          =
        </button>

        {/* Row 5 */}
        <button
          type="button"
          onClick={() => inputDigit('0')}
          className="col-span-2 py-2.5 rounded bg-slate-800/80 hover:bg-slate-700 text-white font-mono-tabular text-sm"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => inputDigit('.')}
          className="py-2.5 rounded bg-slate-800/80 hover:bg-slate-700 text-white font-mono-tabular text-sm"
        >
          .
        </button>
        <button
          type="button"
          onClick={() => handleOperator('+')}
          className="py-2.5 rounded bg-sky-950/80 hover:bg-sky-900 text-sky-300 font-semibold text-sm"
        >
          +
        </button>
      </div>

      {onTransferDisplay && (
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => {
              if (display !== 'Error') onTransferDisplay(display);
            }}
            className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-sky-300 flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            Transfer Display to Answer Box
          </button>
        </div>
      )}
    </div>
  );
};
