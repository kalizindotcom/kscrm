import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  FileSpreadsheet,
  Loader2,
  Trash2,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { contactService } from '../services/contactService';
import { Contact, ContactImport } from '../types';
import { formatDate } from '../lib/utils';
import { ImportModal } from '../components/contacts/ImportModal';
import { ImportKanban } from '../components/contacts/ImportKanban';
import { ImportDetailsModal } from '../components/contacts/ImportDetailsModal';
import { ExportModal } from '../components/contacts/ExportModal';

const PAGE_SIZE = 50;

const formatOrigin = (origin: string): string => {
  if (origin === 'manual') return 'Manual';
  if (origin.startsWith('import:')) return 'Importado';
  return origin;
};

export const ContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
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
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [isDeletingContacts, setIsDeletingContacts] = useState(false);

  // Edit modal state
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTags, setEditTags] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // AlertDialog confirmation state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const askConfirm = (title: string, description: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, description, onConfirm });
  };

  // Initial load
  useEffect(() => {
    loadContacts(1, '');
    loadImports();
  }, []);

  // Auto-poll for pending imports
  useEffect(() => {
    const hasPending = imports.some((item) => item.status === 'pending' || item.status === 'processing');
    if (!hasPending) return;
    const interval = setInterval(loadImports, 5000);
    return () => clearInterval(interval);
  }, [imports]);

  // Debounced search — resets to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadContacts(1, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Page changes
  useEffect(() => {
    loadContacts(page, search);
  }, [page]);

  const loadContacts = async (p = 1, q = '') => {
    setLoading(true);
    try {
      const result = await contactService.list({ search: q || undefined, page: p, pageSize: PAGE_SIZE });
      setContacts(result.items);
      setTotal(result.total);
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

  const handleImport = async (files: File[], name: string, tags: string) => {
    const file = files[0];
    if (!file) return;
    await contactService.importList(file, name, tags);
    await Promise.all([loadImports(), loadContacts(1, search)]);
    toast.success('Importação concluída com sucesso.');
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
      setTotal((prev) => prev + 1);
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

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setEditName(contact.name);
    setEditPhone(contact.phone);
    setEditTags(contact.tags.join(', '));
  };

  const handleSaveEdit = async () => {
    if (!editingContact) return;
    const normalizedPhone = editPhone.replace(/\D/g, '');
    if (!editName.trim() || normalizedPhone.length < 8) {
      toast.error('Informe nome e telefone válido.');
      return;
    }
    setIsSavingEdit(true);
    try {
      const updated = await contactService.update(editingContact.id, {
        name: editName.trim(),
        phone: normalizedPhone,
        tags: editTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditingContact(null);
      toast.success('Contato atualizado com sucesso.');
    } catch (error: any) {
      toast.error(error?.message ?? 'Falha ao atualizar contato.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const allSelected =
    contacts.length > 0 && contacts.every((contact) => selectedContactIds.includes(contact.id));

  const toggleContactSelection = (contactId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId],
    );
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      const pageIds = new Set(contacts.map((c) => c.id));
      setSelectedContactIds((prev) => prev.filter((id) => !pageIds.has(id)));
      return;
    }
    const merged = new Set(selectedContactIds);
    contacts.forEach((c) => merged.add(c.id));
    setSelectedContactIds(Array.from(merged));
  };

  const handleDeleteContact = async (contactId: string) => {
    askConfirm('Excluir contato', 'Tem certeza que deseja excluir este contato?', async () => {
      setIsDeletingContacts(true);
      try {
        await contactService.delete(contactId);
        setContacts((prev) => prev.filter((contact) => contact.id !== contactId));
        setSelectedContactIds((prev) => prev.filter((id) => id !== contactId));
        setTotal((prev) => prev - 1);
        toast.success('Contato excluído com sucesso.');
      } catch (error: any) {
        toast.error(error?.message ?? 'Não foi possível excluir o contato.');
      } finally {
        setIsDeletingContacts(false);
      }
    });
  };

  const handleDeleteSelectedContacts = async () => {
    if (selectedContactIds.length === 0) {
      toast.error('Selecione pelo menos um contato.');
      return;
    }
    askConfirm(
      'Excluir selecionados',
      `Deseja excluir ${selectedContactIds.length} contato(s) selecionado(s)?`,
      async () => {
        setIsDeletingContacts(true);
        try {
          await contactService.bulkDelete(selectedContactIds);
          const selectedSet = new Set(selectedContactIds);
          setContacts((prev) => prev.filter((contact) => !selectedSet.has(contact.id)));
          setTotal((prev) => prev - selectedContactIds.length);
          setSelectedContactIds([]);
          toast.success('Contatos selecionados excluídos com sucesso.');
        } catch (error: any) {
          toast.error(error?.message ?? 'Falha ao excluir contatos selecionados.');
        } finally {
          setIsDeletingContacts(false);
        }
      },
    );
  };

  const handleDeleteAllContacts = async () => {
    if (contacts.length === 0) {
      toast.error('Não há contatos para excluir.');
      return;
    }
    askConfirm(
      'Excluir todos os contatos',
      `Deseja excluir TODOS os ${total} contatos da lista? Esta ação não pode ser desfeita.`,
      async () => {
        setIsDeletingContacts(true);
        try {
          await contactService.bulkDelete(contacts.map((c) => c.id));
          setContacts([]);
          setTotal(0);
          setSelectedContactIds([]);
          toast.success('Todos os contatos foram excluídos.');
        } catch (error: any) {
          toast.error(error?.message ?? 'Falha ao excluir todos os contatos.');
        } finally {
          setIsDeletingContacts(false);
        }
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contatos</h1>
          <p className="text-muted-foreground">Gerencie sua base de leads e clientes.</p>
          <p className="text-xs text-muted-foreground mt-1">
            {loading ? 'Sincronizando contatos...' : `${total} contatos ativos carregados`}
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
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1 lg:flex-none"
                    onClick={handleDeleteAllContacts}
                    disabled={isDeletingContacts || contacts.length === 0}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Excluir tudo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 lg:flex-none border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={handleDeleteSelectedContacts}
                    disabled={isDeletingContacts || selectedContactIds.length === 0}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Excluir selecionados
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 lg:flex-none">
                    <Filter className="w-4 h-4 mr-2" /> Filtros
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 font-medium border-b w-[44px]">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 accent-primary"
                          aria-label="Selecionar todos os contatos da página"
                        />
                      </th>
                      <th className="px-6 py-3 font-medium border-b">Nome</th>
                      <th className="px-6 py-3 font-medium border-b">Telefone</th>
                      <th className="px-6 py-3 font-medium border-b">Origem</th>
                      <th className="px-6 py-3 font-medium border-b">Tags</th>
                      <th className="px-6 py-3 font-medium border-b">Status</th>
                      <th className="px-6 py-3 font-medium border-b">Atualizado em</th>
                      <th className="px-6 py-3 font-medium border-b text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Carregando contatos...</p>
                          </div>
                        </td>
                      </tr>
                    ) : contacts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <FileSpreadsheet className="w-12 h-12 text-muted-foreground/50" />
                            <p className="font-medium">Nenhum contato encontrado</p>
                            <p className="text-sm text-muted-foreground">
                              Adicione manualmente ou importe uma lista para começar.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      contacts.map((contact) => (
                        <tr key={contact.id} className="hover:bg-accent/50 transition-colors">
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedContactIds.includes(contact.id)}
                              onChange={() => toggleContactSelection(contact.id)}
                              className="w-4 h-4 accent-primary"
                              aria-label={`Selecionar contato ${contact.name}`}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                                {contact.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium">{contact.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">{contact.phone}</td>
                          <td className="px-6 py-4 text-xs">{formatOrigin(contact.origin)}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {contact.tags.length === 0 ? (
                                <span className="text-xs text-muted-foreground">—</span>
                              ) : (
                                contact.tags.slice(0, 3).map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {tag}
                                  </Badge>
                                ))
                              )}
                              {contact.tags.length > 3 && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  +{contact.tags.length - 3}
                                </Badge>
                              )}
                            </div>
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
                              {contact.status === 'active'
                                ? 'Ativo'
                                : contact.status === 'pending'
                                  ? 'Pendente'
                                  : 'Inativo'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3" />
                              {formatDate(contact.updatedAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() => openEditModal(contact)}
                                disabled={isDeletingContacts}
                              >
                                <Pencil className="w-4 h-4 mr-1" /> Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteContact(contact.id)}
                                disabled={isDeletingContacts}
                              >
                                <Trash2 className="w-4 h-4 mr-1" /> Excluir
                              </Button>
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
                  Mostrando <span className="font-medium">{contacts.length}</span> de{' '}
                  <span className="font-medium">{total}</span> contatos (página {page})
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * PAGE_SIZE >= total}
                  >
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

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
      />

      {/* Import Details Modal */}
      <ImportDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        importBatch={selectedImport}
        onContactsChanged={() => loadContacts(page, search)}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        imports={imports}
      />

      {/* Add Contact Modal */}
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

      {/* Edit Contact Modal */}
      <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" /> Editar contato
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome do contato</Label>
              <Input
                placeholder="Ex: Joao Silva"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={isSavingEdit}
              />
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                placeholder="Ex: 5511999999999"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                disabled={isSavingEdit}
              />
            </div>

            <div className="space-y-2">
              <Label>Tags (separadas por vírgula)</Label>
              <Input
                placeholder="Ex: Lead quente, VIP"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                disabled={isSavingEdit}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingContact(null)} disabled={isSavingEdit}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
                </>
              ) : (
                'Salvar alterações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation AlertDialog */}
      {confirmDialog && (
        <AlertDialog
          open={confirmDialog.open}
          onOpenChange={(open) => !open && setConfirmDialog(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmDialog(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};
