import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  MoreHorizontal,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { contactService } from '../services/contactService';
import { Contact, ContactImport } from '../types';
import { formatDate } from '../lib/utils';
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

  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactTags, setContactTags] = useState('');
  const [isCreatingContact, setIsCreatingContact] = useState(false);

  useEffect(() => {
    loadContacts();
    loadImports();
  }, []);

  useEffect(() => {
    const hasPending = imports.some((item) => item.status === 'pending' || item.status === 'processing');
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
    const file = files[0];
    if (!file) return;

    await contactService.importList(file, name);
    await Promise.all([loadImports(), loadContacts()]);
    toast.success('Importacao concluida com contatos reais do arquivo.');
  };

  const handleAddContact = async () => {
    const normalizedPhone = contactPhone.replace(/\D/g, '');
    if (!contactName.trim() || normalizedPhone.length < 8) {
      toast.error('Informe nome e telefone valido para continuar.');
      return;
    }

    setIsCreatingContact(true);
    try {
      const created = await contactService.create({
        name: contactName.trim(),
        phone: normalizedPhone,
        origin: 'manual',
        status: 'active',
        optIn: 'unknown',
        tags: contactTags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      });

      setContacts((prev) => [created, ...prev]);
      setIsAddContactModalOpen(false);
      setContactName('');
      setContactPhone('');
      setContactTags('');
      toast.success('Contato adicionado com sucesso.');
    } catch (error: any) {
      toast.error(error?.message ?? 'Nao foi possivel criar o contato.');
    } finally {
      setIsCreatingContact(false);
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const query = search.toLowerCase();
    return (
      contact.name.toLowerCase().includes(query) ||
      contact.phone.includes(query) ||
      contact.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contatos</h1>
          <p className="text-muted-foreground">Gerencie sua base de leads e clientes.</p>
          <p className="text-xs text-muted-foreground mt-1">
            {loading ? 'Sincronizando contatos...' : `${contacts.length} contatos ativos carregados`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsAddContactModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar manualmente
          </Button>
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
              <LayoutGrid className="w-4 h-4" /> Importacoes (Kanban)
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
                    placeholder="Buscar contatos..."
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
                      <th className="px-6 py-3 font-medium border-b">Nome</th>
                      <th className="px-6 py-3 font-medium border-b">Telefone</th>
                      <th className="px-6 py-3 font-medium border-b">Origem</th>
                      <th className="px-6 py-3 font-medium border-b text-center">Tags</th>
                      <th className="px-6 py-3 font-medium border-b">Status</th>
                      <th className="px-6 py-3 font-medium border-b">Atualizado em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredContacts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <FileSpreadsheet className="w-12 h-12 text-muted-foreground/50" />
                            <p className="font-medium">Nenhum contato encontrado</p>
                            <p className="text-sm text-muted-foreground">Adicione manualmente ou importe uma lista para começar.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredContacts.map((contact) => (
                        <tr key={contact.id} className="hover:bg-accent/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center">
                                <Plus className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-medium">{contact.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">{contact.phone}</td>
                          <td className="px-6 py-4 text-xs uppercase">{contact.origin}</td>
                          <td className="px-6 py-4 text-center">
                            <Badge variant="secondary" className="font-mono text-[10px]">
                              {contact.tags.length}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              variant={
                                contact.status === 'active'
                                  ? 'default'
                                  : contact.status === 'pending'
                                    ? 'secondary'
                                    : 'outline'
                              }
                              className="text-[10px]"
                            >
                              {contact.status === 'active' ? 'Ativo' : contact.status === 'pending' ? 'Pendente' : 'Inativo'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3" />
                              {formatDate(contact.updatedAt)}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Mostrando <span className="font-medium">{filteredContacts.length}</span> contatos no total
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
          <ImportKanban
            imports={imports}
            onImportClick={(imp) => {
              setSelectedImport(imp);
              setIsDetailsModalOpen(true);
            }}
          />
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
        onContactsChanged={loadContacts}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        imports={imports}
      />

      <Dialog open={isAddContactModalOpen} onOpenChange={setIsAddContactModalOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Adicionar contato individual
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome do contato</Label>
              <Input
                placeholder="Ex: Joao Silva"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                disabled={isCreatingContact}
              />
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                placeholder="Ex: 5511999999999"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                disabled={isCreatingContact}
              />
            </div>

            <div className="space-y-2">
              <Label>Tags (opcional)</Label>
              <Input
                placeholder="Ex: Lead quente, VIP"
                value={contactTags}
                onChange={(e) => setContactTags(e.target.value)}
                disabled={isCreatingContact}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddContactModalOpen(false)} disabled={isCreatingContact}>
              Cancelar
            </Button>
            <Button onClick={handleAddContact} disabled={isCreatingContact}>
              {isCreatingContact ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
                </>
              ) : (
                'Salvar contato'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
