import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Ban, CheckCircle2, Download, X } from 'lucide-react';
import { Button } from '../ui/shared';
import { cn } from '@/lib/utils';

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  actions: Array<{
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    variant?: 'default' | 'danger' | 'warning' | 'success';
  }>;
}

const variantStyles = {
  default: 'bg-primary hover:bg-primary/90 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
  success: 'bg-green-600 hover:bg-green-700 text-white',
};

export function BulkActionsBar({
  selectedCount,
  totalCount,
  onClearSelection,
  actions,
}: BulkActionsBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 px-6 py-4">
            <div className="flex items-center gap-6">
              {/* Selection Info */}
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring' }}
                  className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
                >
                  <span className="text-sm font-bold text-primary">
                    {selectedCount}
                  </span>
                </motion.div>
                <div>
                  <p className="text-sm font-semibold">
                    {selectedCount} selecionado{selectedCount > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    de {totalCount} {totalCount === 1 ? 'item' : 'itens'}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="w-px h-10 bg-gray-200 dark:bg-gray-800" />

              {/* Actions */}
              <div className="flex items-center gap-2">
                {actions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <motion.div
                      key={action.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                    >
                      <Button
                        size="sm"
                        onClick={action.onClick}
                        className={cn(
                          'gap-2',
                          variantStyles[action.variant || 'default']
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {action.label}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>

              {/* Close */}
              <motion.button
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ delay: 0.2 }}
                onClick={onClearSelection}
                className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
