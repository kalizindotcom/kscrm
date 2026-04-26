import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  indeterminate?: boolean;
  disabled?: boolean;
}

export function AnimatedCheckbox({
  checked,
  onChange,
  indeterminate = false,
  disabled = false,
}: CheckboxProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        'relative w-5 h-5 rounded border-2 transition-colors',
        checked || indeterminate
          ? 'bg-primary border-primary'
          : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'hover:border-primary cursor-pointer'
      )}
    >
      <AnimatePresence mode="wait">
        {checked && !indeterminate && (
          <motion.div
            key="check"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ duration: 0.2, type: 'spring' }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </motion.div>
        )}
        {indeterminate && (
          <motion.div
            key="indeterminate"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-2 h-0.5 bg-white rounded" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

import { AnimatePresence } from 'framer-motion';
