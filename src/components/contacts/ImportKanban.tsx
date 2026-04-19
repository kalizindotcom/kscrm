import React from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  MoreVertical, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ContactImport } from '../../types';
import { cn, formatDate } from '../../lib/utils';

interface ImportKanbanProps {
  imports: ContactImport[];
  onImportClick: (imp: ContactImport) => void;
}

export const ImportKanban: React.FC<ImportKanbanProps> = ({ imports, onImportClick }) => {
  const columns = [
    { id: 'pending', label: 'Pendentes', icon: Clock, color: 'text-amber-500' },
    { id: 'processing', label: 'Processando', icon: Loader2, color: 'text-blue-500' },
    { id: 'completed', label: 'Concluídos', icon: CheckCircle2, color: 'text-emerald-500' },
    { id: 'failed', label: 'Falhas', icon: AlertCircle, color: 'text-destructive' },
  ];

  const getImportsByStatus = (status: string) => {
    return imports.filter(imp => imp.status === status);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div key={column.id} className="min-w-[280px] space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <column.icon className={column.color + (column.id === 'processing' ? ' animate-spin' : '') + " w-4 h-4"} />
              <h3 className="font-semibold text-sm">{column.label}</h3>
              <Badge variant="outline" className="ml-1 text-[10px] h-5 px-1.5">
                {getImportsByStatus(column.id).length}
              </Badge>
            </div>
            <button className="text-muted-foreground hover:text-foreground">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 p-2 bg-muted/30 rounded-lg min-h-[500px]">
            {getImportsByStatus(column.id).map((imp) => (
              <Card 
                key={imp.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onImportClick(imp)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      {imp.filename.endsWith('.csv') ? (
                        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                      <p className="font-medium text-xs truncate max-w-[120px]">{imp.name}</p>
                    </div>
                    <Badge variant={imp.status === 'failed' ? 'destructive' : imp.status === 'completed' ? 'secondary' : 'outline'} className="text-[9px] px-1.5 py-0">
                      {imp.status}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Progresso</span>
                      <span>{imp.processedCount} / {imp.contactCount}</span>
                    </div>
                    <div className="w-full bg-primary/10 rounded-full h-1 overflow-hidden">
                      <div 
                        className={cn(
                          "bg-primary h-full transition-all duration-500",
                          imp.status === 'processing' && "animate-kamehameha"
                        )}
                        style={{ width: `${(imp.processedCount / imp.contactCount) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(imp.createdAt)}</span>
                    </div>
                    <div className="flex -space-x-1.5 overflow-hidden">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold border border-background">
                        +
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {getImportsByStatus(column.id).length === 0 && (
              <div className="h-20 flex items-center justify-center text-[10px] text-muted-foreground border-2 border-dashed border-muted rounded-lg m-1">
                Sem itens
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};