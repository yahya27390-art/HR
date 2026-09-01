import React from 'react';
import AdvanceVoucherA4Modal from '@/components/AdvanceVoucherA4Modal';

export default function AdvancePrintModal({ open, onOpenChange, advance, employee }) {
  return (
    <AdvanceVoucherA4Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      advance={advance}
      employee={employee}
    />
  );
}
