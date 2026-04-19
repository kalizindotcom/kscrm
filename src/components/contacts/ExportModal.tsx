import React, { useState } from 'react';
import { 
  X, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  FileText,
  Search,
  CheckSquare,
  Square
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '../ui/dialog';
import { Button } from '../ui/button';
import { ContactImport } from '../../types';
import { cn, formatDate } from '../../lib/utils';
import { Badge } from '../ui/badge';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  imports: ContactImport[];
}

export const ExportModal: React.FC<ExportModalProps> = ({ 
  isOpen, 
  onClose, 
  imports 
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const filteredImports = imports.filter(imp => 
    imp.name.toLowerCase().includes(search.toLowerCase()) || 
    imp.filename.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredImports.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredImports.map(imp => imp.id));
    }
  };

  const handleExport = () => {
    if (selectedIds.length === 0) return;
    
    setIsExporting(true);
    
    // Simulating export process
    setTimeout(() => {
      setIsExporting(false);
      onClose();
      // In a real app, this would trigger a download
      alert(`Exportando ${selectedIds.length} importação(ões) no formato ${exportFormat.toUpperCase()}`);
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Exportar Contatos
          </DialogTitle>
          <DialogDescription>
            Selecione as importações que deseja exportar e escolha o formato.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-0 flex-1 overflow-hidden flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar importações..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background border rounded-md py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <button 
              onClick={toggleSelectAll}
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1.5"
            >
              {selectedIds.length === filteredImports.length && filteredImports.length > 0 ? (
                <>Desmarcar todos</>
              ) : (
                <>Selecionar todos</>
              )}
            </button>
            <span className="text-xs text-muted-foreground">
              {selectedIds.length} selecionado(s)
            </span>
          </div>

          <div className="flex-1 overflow-y-auto border rounded-md divide-y max-h-[300px]">
            {filteredImports.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhuma importação encontrada.
              </div>
            ) : (
              filteredImports.map(imp => (
                <div 
                  key={imp.id}
                  onClick={() => toggleSelect(imp.id)}
                  className={cn(
                    "p-3 flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors",
                    selectedIds.includes(imp.id) && "bg-accent"
                  )}
                >
                  {selectedIds.includes(imp.id) ? (
                    <CheckSquare className="w-5 h-5 text-primary" />
                  ) : (
                    <Square className="w-5 h-5 text-muted-foreground" />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{imp.name}</p>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {imp.contactCount} contatos
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {imp.filename} • {formatDate(imp.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium">Formato de Exportação</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setExportFormat('csv')}
                className={cn(
                  "flex items-center gap-3 p-3 border rounded-md transition-all text-left",
                  exportFormat === 'csv' 
                    ? "border-primary bg-primary/5 ring-1 ring-primary" 
                    : "hover:border-primary/50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  exportFormat === 'csv' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">CSV</p>
                  <p className="text-[10px] text-muted-foreground">Valores separados por vírgula</p>
                </div>
              </button>

              <button
                onClick={() => setExportFormat('xlsx')}
                className={cn(
                  "flex items-center gap-3 p-3 border rounded-md transition-all text-left",
                  exportFormat === 'xlsx' 
                    ? "border-primary bg-primary/5 ring-1 ring-primary" 
                    : "hover:border-primary/50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  exportFormat === 'xlsx' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Excel</p>
                  <p className="text-[10px] text-muted-foreground">Microsoft Excel Open XML</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={selectedIds.length === 0 || isExporting}
            className="min-w-[120px]"
          >
            {isExporting ? (
              <>Exportando...</>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Exportar ({selectedIds.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};