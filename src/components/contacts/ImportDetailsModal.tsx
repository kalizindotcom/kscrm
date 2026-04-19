import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Phone,
  Filter
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Contact, ContactImport } from '../../types';
import { cn } from '../../lib/utils';

interface ImportDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  importBatch: ContactImport | null;
}

interface ValidationResult {
  isValid: boolean;
  phoneError: boolean;
}

// Mock data generator for many contacts
const generateMockContacts = (count: number): Contact[] => {
  return Array.from({ length: Math.min(count, 500) }).map((_, i) => ({
    id: `c-${i}`,
    name: `Contato ${i + 1}`,
    phone: i % 15 === 0 ? `123` : `+55 11 9${Math.floor(Math.random() * 89999999 + 10000000)}`,
    origin: 'Importação',
    status: 'active',
    tags: ['Importado'],
    optIn: 'granted',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
};

export const ImportDetailsModal: React.FC<ImportDetailsModalProps> = ({ isOpen, onClose, importBatch }) => {
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load contacts when modal opens
  React.useEffect(() => {
    if (isOpen && importBatch) {
      setLoading(true);
      // Simulating loading large batch (capped for UI demo)
      setTimeout(() => {
        setContacts(generateMockContacts(importBatch.contactCount));
        setLoading(false);
      }, 500);
    } else {
      setContacts([]);
      setValidated(false);
    }
  }, [isOpen, importBatch]);

  const handleValidate = async () => {
    setIsValidating(true);
    // Simular validação
    await new Promise(resolve => setTimeout(resolve, 2000));
    setValidated(true);
    setIsValidating(false);
  };

  const removeInvalids = () => {
    const validOnes = contacts.filter(c => validateContact(c).isValid);
    setContacts(validOnes);
  };

  const validateContact = (c: Contact): ValidationResult => {
    const phoneValid = c.phone.replace(/\D/g, '').length >= 10;
    return {
      isValid: phoneValid,
      phoneError: !phoneValid
    };
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.phone.includes(search)
    );
  }, [contacts, search]);

  const invalidCount = useMemo(() => {
    return contacts.filter(c => !validateContact(c).isValid).length;
  }, [contacts]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 border-b">
          <div className="flex justify-between items-start w-full">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                {importBatch?.name || 'Detalhes da Importação'}
                <Badge variant="outline" className="font-normal">{importBatch?.filename}</Badge>
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {contacts.length} contatos carregados para visualização.
              </p>
            </div>
            <div className="flex gap-2 pr-8">
              {!validated ? (
                <Button size="sm" onClick={handleValidate} disabled={isValidating || loading}>
                  {isValidating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Validando...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Validar Contatos</>
                  )}
                </Button>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="text-emerald-500 font-medium">{contacts.length - invalidCount} Válidos</span>
                    {invalidCount > 0 && (
                      <span className="text-destructive font-medium ml-3">{invalidCount} Inválidos</span>
                    )}
                  </div>
                  {invalidCount > 0 && (
                    <Button variant="destructive" size="sm" onClick={removeInvalids}>
                      <Trash2 className="w-4 h-4 mr-2" /> Remover Inválidos
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
              placeholder="Buscar contatos nesta importação..."
              className="w-full bg-background border rounded-md py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" /> Filtros
          </Button>
        </div>

        <div className="flex-1 overflow-auto min-h-[400px]">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium text-lg">Carregando dados</p>
                <p className="text-sm text-muted-foreground">Isso pode levar um momento para arquivos grandes.</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="sticky top-0 bg-background z-10 border-b shadow-sm">
                <tr className="bg-muted/50 text-muted-foreground text-[10px] uppercase tracking-wider">
                  <th className="px-6 py-3 font-semibold w-1/2">Nome</th>
                  <th className="px-6 py-3 font-semibold w-1/2">Telefone</th>
                  <th className="px-6 py-3 font-semibold text-right w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 opacity-20" />
                        <p>Nenhum contato encontrado nesta importação.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((contact) => {
                    const validation = validated ? validateContact(contact) : { isValid: true, phoneError: false };
                    return (
                      <tr key={contact.id} className="hover:bg-accent/30 transition-colors group">
                        <td className="px-6 py-3 text-sm font-medium truncate">{contact.name}</td>
                        <td className="px-6 py-3 text-sm">
                          <div className={cn(
                            "flex items-center gap-1.5",
                            validated && validation.phoneError ? "text-destructive font-medium" : "text-muted-foreground"
                          )}>
                            <Phone className="w-3 h-3 shrink-0" />
                            {contact.phone}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right">
                          {validated && (
                            <Badge 
                              variant={validation.isValid ? "outline" : "destructive"} 
                              className={cn("text-[9px] uppercase tracking-tight", validation.isValid ? "border-emerald-500 text-emerald-500" : "")}
                            >
                              {validation.isValid ? "Válido" : "Inválido"}
                            </Badge>
                          )}
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
              Mostrando <span className="font-semibold">{filteredContacts.length}</span> de <span className="font-semibold">{contacts.length}</span> contatos
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Fechar
              </Button>
              <Button size="sm">
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};