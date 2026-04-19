import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  MoreHorizontal, 
  Phone,
  Tag,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  LayoutGrid,
  List,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { contactService } from '../services/contactService';
import { Contact, ContactImport } from '../types';
import { cn, formatDate } from '../lib/utils';
import { ImportModal } from '../components/contacts/ImportModal';
import { ImportKanban } from '../components/contacts/ImportKanban';
import { ImportDetailsModal } from '../components/contacts/ImportDetailsModal';
import { ExportModal } from '../components/contacts/ExportModal';

export const ContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedImport, setSelectedImport] = useState<ContactImport | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  const [imports, setImports] = useState<ContactImport[]>([]);

  useEffect(() => {
    loadContacts();
    loadImports();
  }, []);

  useEffect(() => {
    const hasPending = imports.some(i => i.status === 'pending' || i.status === 'processing');
    if (!hasPending) return;
    const interval = setInterval(loadImports, 5000);
    return () => clearInterval(interval);
  }, [imports]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const data = await contactService.list();
      setContacts(data);
    } catch (error) {
      console.error('Failed to load contacts', error);
    } finally {
      setLoading(false);
    }
  };

  const loadImports = async () => {
    try {
      const data = await contactService.listImports();
      setImports(data);
    } catch (error) {
      console.error('Failed to load imports', error);
    }
  };

  const handleImport = async (files: File[], name: string) => {
    try {
      const newImport = await contactService.importList(files[0], name);
      setImports(prev => [newImport, ...prev]);
    } catch (error) {
      console.error('Failed to import contacts', error);
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contatos</h1>
          <p className="text-muted-foreground">Gerencie sua base de leads e clientes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)}>
            <Upload className="w-4 h-4 mr-2" /> Importar em massa
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsExportModalOpen(true)}>
            <Download className="w-4 h-4 mr-2" /> Exportar
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <List className="w-4 h-4" /> Todos os Contatos
            </TabsTrigger>
            <TabsTrigger value="imports" className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" /> Importações (Kanban)
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="relative w-full lg:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar importações..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-background border rounded-md py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div className="flex gap-2 w-full lg:w-auto">
                  <Button variant="outline" size="sm" className="flex-1 lg:flex-none">
                    <Filter className="w-4 h-4 mr-2" /> Filtros
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="px-6 py-3 font-medium border-b">Nome da Importação</th>
                      <th className="px-6 py-3 font-medium border-b">Arquivo</th>
                      <th className="px-6 py-3 font-medium border-b">Data</th>
                      <th className="px-6 py-3 font-medium border-b text-center">Contatos</th>
                      <th className="px-6 py-3 font-medium border-b">Status</th>
                      <th className="px-6 py-3 font-medium border-b text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {imports.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <FileSpreadsheet className="w-12 h-12 text-muted-foreground/50" />
                            <p className="font-medium">Nenhuma importação encontrada</p>
                            <p className="text-sm text-muted-foreground">Importe sua lista de contatos para começar.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      imports
                        .filter(imp => imp.name.toLowerCase().includes(search.toLowerCase()) || imp.filename.toLowerCase().includes(search.toLowerCase()))
                        .map((imp) => (
                        <tr 
                          key={imp.id} 
                          className="hover:bg-accent/50 transition-colors cursor-pointer group"
                          onClick={() => {
                            setSelectedImport(imp);
                            setIsDetailsModalOpen(true);
                          }}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center">
                                <FileSpreadsheet className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-medium">{imp.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-muted-foreground">{imp.filename}</span>
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3" />
                              {formatDate(imp.createdAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge variant="secondary" className="font-mono text-[10px]">
                              {imp.contactCount}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Badge 
                              variant={
                                imp.status === 'completed' ? 'default' : 
                                imp.status === 'processing' ? 'secondary' : 
                                imp.status === 'failed' ? 'destructive' : 'outline'
                              }
                              className="text-[10px]"
                            >
                              {imp.status === 'completed' ? 'Finalizado' : 
                               imp.status === 'processing' ? 'Processando' : 
                               imp.status === 'failed' ? 'Falhou' : 'Pendente'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="p-2 rounded-md hover:bg-accent text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Mostrando <span className="font-medium">{imports.length}</span> importações no total
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="imports">
          <ImportKanban imports={imports} onImportClick={(imp) => {
            setSelectedImport(imp);
            setIsDetailsModalOpen(true);
          }} />
        </TabsContent>
      </Tabs>

      <ImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
      />

      <ImportDetailsModal 
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        importBatch={selectedImport}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        imports={imports}
      />
    </div>
  );
};