import React, { useState, useMemo } from 'react';
import { Search, Trash2, CheckCircle2, Loader2, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Contact, ContactImport } from '../../types';
import { cn } from '../../lib/utils';
import { contactService } from '../../services/contactService';
import { toast } from 'sonner';

interface ImportDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  importBatch: ContactImport | null;
  onContactsChanged?: () => void;
}

interface ValidationResult {
  isValid: boolean;
  phoneError: boolean;
}

export const ImportDetailsModal: React.FC<ImportDetailsModalProps> = ({
  isOpen,
  onClose,
  importBatch,
  onContactsChanged,
}) => {
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  React.useEffect(() => {
    if (!isOpen || !importBatch) {
      setContacts([]);
      setValidated(false);
      return;
    }

    const loadImportContacts = async () => {
      setLoading(true);
      try {
        const importedContacts = await contactService.listImportContacts(importBatch.id);
        setContacts(importedContacts);
      } catch {
        setContacts([]);
      } finally {
        setLoading(false);
      }
    };

    loadImportContacts().catch(() => {
      setContacts([]);
      setLoading(false);
    });
  }, [isOpen, importBatch]);

  const handleValidate = async () => {
    setIsValidating(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setValidated(true);
    setIsValidating(false);
  };

  const validateContact = (contact: Contact): ValidationResult => {
    const phoneValid = contact.phone.replace(/\D/g, '').length >= 10;
    return {
      isValid: phoneValid,
      phoneError: !phoneValid,
    };
  };

  const removeInvalids = async () => {
    const invalids = contacts.filter((contact) => !validateContact(contact).isValid);
    if (invalids.length === 0) return;
    setIsValidating(true);
    try {
      await Promise.all(invalids.map((c) => contactService.delete(c.id)));
      setContacts((prev) => prev.filter((contact) => validateContact(contact).isValid));
      onContactsChanged?.();
      toast.success(`${invalids.length} contato(s) inválido(s) removido(s).`);
    } catch {
      toast.error('Erro ao remover contatos inválidos.');
    } finally {
      setIsValidating(false);
    }
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(search.toLowerCase()) || contact.phone.includes(search),
    );
  }, [contacts, search]);

  const invalidCount = useMemo(() => {
    return contacts.filter((contact) => !validateContact(contact).isValid).length;
  }, [contacts]);

  const handleDeleteContact = async (contactId: string) => {
    const confirmed = confirm('Deseja realmente excluir este contato?');
    if (!confirmed) return;

    setDeletingIds((prev) => [...prev, contactId]);
    try {
      await contactService.delete(contactId);
      setContacts((prev) => prev.filter((contact) => contact.id !== contactId));
      onContactsChanged?.();
      toast.success('Contato excluido com sucesso.');
    } catch (error: any) {
      toast.error(error?.message ?? 'Falha ao excluir contato.');
    } finally {
      setDeletingIds((prev) => prev.filter((id) => id !== contactId));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 border-b">
          <div className="flex justify-between items-start w-full">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                {importBatch?.name || 'Detalhes da Importacao'}
                <Badge variant="outline" className="font-normal">
                  {importBatch?.filename}
                </Badge>
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {contacts.length} contatos reais carregados desta importacao.
              </p>
            </div>
            <div className="flex gap-2 pr-8">
              {!validated ? (
                <Button size="sm" onClick={handleValidate} disabled={isValidating || loading || contacts.length === 0}>
                  {isValidating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Validando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Validar Contatos
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="text-emerald-500 font-medium">{contacts.length - invalidCount} Validos</span>
                    {invalidCount > 0 && (
                      <span className="text-destructive font-medium ml-3">{invalidCount} Invalidos</span>
                    )}
                  </div>
                  {invalidCount > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={removeInvalids}
                      disabled={isValidating}
                    >
                      {isValidating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Removendo...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" /> Remover Invalidos
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 bg-muted/20 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar contatos nesta importacao..."
              className="w-full bg-background border rounded-md py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto min-h-[400px]">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium text-lg">Carregando dados reais da importacao</p>
                <p className="text-sm text-muted-foreground">Isso pode levar um momento para arquivos grandes.</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="sticky top-0 bg-background z-10 border-b shadow-sm">
                <tr className="bg-muted/50 text-muted-foreground text-[10px] uppercase tracking-wider">
                  <th className="px-6 py-3 font-semibold w-[40%]">Nome</th>
                  <th className="px-6 py-3 font-semibold w-[35%]">Telefone</th>
                  <th className="px-6 py-3 font-semibold text-right w-[13%]">Status</th>
                  <th className="px-6 py-3 font-semibold text-right w-[12%]">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 opacity-20" />
                        <p>Nenhum contato encontrado nesta importacao.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((contact) => {
                    const validation = validated
                      ? validateContact(contact)
                      : { isValid: true, phoneError: false };
                    return (
                      <tr key={contact.id} className="hover:bg-accent/30 transition-colors group">
                        <td className="px-6 py-3 text-sm font-medium truncate">{contact.name}</td>
                        <td className="px-6 py-3 text-sm">
                          <div
                            className={cn(
                              'flex items-center gap-1.5',
                              validated && validation.phoneError
                                ? 'text-destructive font-medium'
                                : 'text-muted-foreground',
                            )}
                          >
                            <Phone className="w-3 h-3 shrink-0" />
                            {contact.phone}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right">
                          {validated && (
                            <Badge
                              variant={validation.isValid ? 'outline' : 'destructive'}
                              className={cn(
                                'text-[9px] uppercase tracking-tight',
                                validation.isValid ? 'border-emerald-500 text-emerald-500' : '',
                              )}
                            >
                              {validation.isValid ? 'Valido' : 'Invalido'}
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-destructive/30 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteContact(contact.id)}
                            disabled={deletingIds.includes(contact.id)}
                          >
                            {deletingIds.includes(contact.id) ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-muted/10">
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-muted-foreground">
              Mostrando <span className="font-semibold">{filteredContacts.length}</span> de{' '}
              <span className="font-semibold">{contacts.length}</span> contatos
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
