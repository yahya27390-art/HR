import React, { createContext, useContext, useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FinancialPrivacyContext = createContext({
  isPrivacyMasked: true,
  togglePrivacyMask: () => {},
  setPrivacyMask: () => {},
  formatMasked: (val) => val
});

export function FinancialPrivacyProvider({ children }) {
  const [isPrivacyMasked, setIsPrivacyMasked] = useState(() => {
    try {
      const saved = localStorage.getItem('hr_flow_financial_privacy_mask');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('hr_flow_financial_privacy_mask', String(isPrivacyMasked));
    } catch (e) {
      console.error(e);
    }
  }, [isPrivacyMasked]);

  const togglePrivacyMask = () => setIsPrivacyMasked(prev => !prev);
  const setPrivacyMask = (val) => setIsPrivacyMasked(val);

  const formatMasked = (value, currency = 'ر.س') => {
    if (isPrivacyMasked) {
      return '••••••' + (currency ? ` ${currency}` : '');
    }
    const num = typeof value === 'number' ? value : Number(value || 0);
    return num.toLocaleString('en-US') + (currency ? ` ${currency}` : '');
  };

  return (
    <FinancialPrivacyContext.Provider
      value={{
        isPrivacyMasked,
        togglePrivacyMask,
        setPrivacyMask,
        formatMasked
      }}
    >
      {children}
    </FinancialPrivacyContext.Provider>
  );
}

export function useFinancialPrivacy() {
  return useContext(FinancialPrivacyContext);
}

/**
 * MaskedSalary Component: Automatically masks or reveals salary values
 */
export function MaskedSalary({
  value,
  currency = 'ر.س',
  className = '',
  showInlineToggle = true,
  customPrefix = '',
  customSuffix = ''
}) {
  const { isPrivacyMasked } = useFinancialPrivacy();
  const [localReveal, setLocalReveal] = useState(false);

  const isMasked = isPrivacyMasked && !localReveal;
  const num = typeof value === 'number' ? value : Number(value || 0);
  const formattedNumber = isNaN(num) ? '0' : num.toLocaleString('en-US');

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono ${className}`}>
      {customPrefix}
      {isMasked ? (
        <span className="tracking-widest font-black text-muted-foreground select-none opacity-80">
          ••••••
        </span>
      ) : (
        <span>{formattedNumber}</span>
      )}
      {currency && <span className="font-sans text-[10px] font-normal">{currency}</span>}
      {customSuffix}

      {showInlineToggle && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setLocalReveal(prev => !prev);
          }}
          className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isMasked ? 'إظهار المبلغ' : 'إخفاء المبلغ'}
        >
          {isMasked ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-emerald-600" />}
        </button>
      )}
    </span>
  );
}

/**
 * Top Bar / Header Toggle Button with Eye/EyeOff Icon
 */
export function PrivacyMaskToggle({ className = '', variant = 'ghost', size = 'icon' }) {
  const { isPrivacyMasked, togglePrivacyMask } = useFinancialPrivacy();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={togglePrivacyMask}
      className={`relative rounded-full transition-all ${
        isPrivacyMasked
          ? 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
          : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100'
      } ${className}`}
      title={isPrivacyMasked ? 'الوضع المالي السري مفعّل (اضغط لإظهار الرواتب) 👁️' : 'الرواتب ظاهرة (اضغط لتشفير وإخفاء الرواتب للخصوصية) 👁️‍🗨️'}
    >
      {isPrivacyMasked ? (
        <EyeOff className="w-4 h-4 text-slate-500" />
      ) : (
        <Eye className="w-4 h-4 text-emerald-600 animate-pulse" />
      )}
    </Button>
  );
}
