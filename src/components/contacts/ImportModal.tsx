import React, { useState, useCallback } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '../ui/dialog';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (files: File[], name: string) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importName, setImportName] = useState('');
  const [tags, setTags] = useState('');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFiles = (selectedFiles: FileList | null): File[] => {
    if (!selectedFiles) return [];
    
    const validFiles: File[] = [];
    const allowedTypes = [
      'text/csv', 
      'application/vnd.ms-excel', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (allowedTypes.includes(file.type) || extension === 'csv' || extension === 'xlsx' || extension === 'xls') {
        validFiles.push(file);
      }
    }
    
    if (validFiles.length < selectedFiles.length) {
      setError('Apenas arquivos CSV e Excel são permitidos.');
    } else {
      setError(null);
    }
    
    return validFiles;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const validFiles = validateFiles(e.dataTransfer.files);
    setFiles(prev => [...prev, ...validFiles]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const validFiles = validateFiles(e.target.files);
    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    
    setIsImporting(true);
    // Simular processo de importação
    await new Promise(resolve => setTimeout(resolve, 3000));
    onImport(files, importName || files[0].name);
    setIsImporting(false);
    onClose();
    setFiles([]);
    setImportName('');
    setTags('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isImporting && !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Importar em Massa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome da Importação</label>
            <input 
              type="text" 
              placeholder="Ex: Leads Evento Tech"
              className="w-full bg-background border rounded-md py-2 px-3 text-sm focus:ring-1 focus:ring-primary outline-none"
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
              disabled={isImporting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tags (separadas por vírgula)</label>
            <input 
              type="text" 
              placeholder="Ex: Evento Tech, Outubro"
              className="w-full bg-background border rounded-md py-2 px-3 text-sm focus:ring-1 focus:ring-primary outline-none"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={isImporting}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Arquivos</label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                isImporting && "opacity-50 pointer-events-none"
              )}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
            <input
              id="file-upload"
              type="file"
              multiple
              accept=".csv, .xlsx, .xls"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-10 h-10 text-muted-foreground" />
              <div className="text-sm">
                <span className="font-semibold text-primary">Clique para selecionar</span> ou arraste os arquivos aqui
            </div>
          </div>
              <p className="text-xs text-muted-foreground">Formatos aceitos: CSV e Excel (.xlsx, .xls)</p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                  <div className="flex items-center gap-2 truncate">
                    {file.name.endsWith('.csv') ? (
                      <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                    <span className="truncate">{file.name}</span>
                    <span className="text-[10px] text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  {!isImporting && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {isImporting && (
            <div className="flex flex-col items-center justify-center py-6 space-y-3">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-bold">...</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Processando arquivos...</p>
                <p className="text-xs text-muted-foreground italic">Isso pode levar alguns segundos dependendo do tamanho.</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isImporting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={files.length === 0 || isImporting}>
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importando...
              </>
            ) : (
              'Confirmar Importação'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};