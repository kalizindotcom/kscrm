import { Download } from 'lucide-react';
import { Button } from '../ui/shared';
import { toast } from 'sonner';

interface ExportButtonProps {
  data: any[];
  filename: string;
  headers: string[];
  mapRow: (item: any) => any[];
}

export function ExportButton({ data, filename, headers, mapRow }: ExportButtonProps) {
  const handleExport = () => {
    if (!data.length) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    try {
      const csv = [
        headers.join(','),
        ...data.map((item) =>
          mapRow(item)
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(',')
        ),
      ].join('\n');

      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Dados exportados com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar dados');
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
      <Download className="w-4 h-4" />
      Exportar CSV
    </Button>
  );
}
