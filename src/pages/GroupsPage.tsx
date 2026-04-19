import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Users, 
  MessageSquare,
  Shield,
  RefreshCw,
  FileSpreadsheet,
  Download,
  Info,
  Save,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, Button, Badge } from '../components/ui/shared';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { mockGroups } from '../mock/data';
import { cn, formatDate } from '../lib/utils';
import { WhatsAppGroup } from '../types';

export const GroupsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<WhatsAppGroup | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaveAgendaModalOpen, setIsSaveAgendaModalOpen] = useState(false);
  const [agendaName, setAgendaName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleGlobalSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      alert('Grupos sincronizados com sucesso da sessão atual!');
    }, 2000);
  };

  const filteredGroups = mockGroups.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const handleSync = (group: WhatsAppGroup) => {
    setSelectedGroup(group);
    setIsModalOpen(true);
  };

  const getMemberData = (group: WhatsAppGroup) => {
    return [...group.admins, ...group.members].map((member, idx) => {
      // Gerando números limpos (apenas dígitos) para formato interno
      const ddd = Math.floor(Math.random() * 89 + 10);
      const prefix = 9;
      const part1 = Math.floor(Math.random() * 8999 + 1000);
      const part2 = Math.floor(Math.random() * 8999 + 1000);
      const cleanPhone = `55${ddd}${prefix}${part1}${part2}`;
      
      // Formato visual para a UI
      const displayPhone = `+55 ${ddd} ${prefix}${part1}-${part2}`;
      
      return {
        name: member,
        cleanPhone,
        displayPhone,
        isAdmin: group.admins.includes(member),
        joinDate: new Date().toLocaleDateString('pt-BR')
      };
    });
  };

  const handleExport = (type: 'csv' | 'excel') => {
    if (!selectedGroup) return;
    
    const membersData = getMemberData(selectedGroup);
    const headers = ['Nome', 'Telefone', 'Data de Entrada'];
    const rows = membersData.map(m => [m.name, m.cleanPhone, m.joinDate]);

    let content = '';
    if (type === 'csv') {
      content = [headers, ...rows].map(row => row.join(',')).join('\n');
    } else {
      // Formato TSV (Tab-Separated Values) que abre nativamente no Excel
      content = [headers, ...rows].map(row => row.join('\t')).join('\n');
    }

    const blob = new Blob([content], { 
      type: type === 'csv' ? 'text/csv;charset=utf-8;' : 'application/vnd.ms-excel;charset=utf-8;' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `contatos_${selectedGroup.name.replace(/\s+/g, '_').toLowerCase()}_${type === 'csv' ? 'export' : 'planilha'}.${type === 'csv' ? 'csv' : 'xls'}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert(`Exportação concluída! Os números foram exportados no formato internacional limpo conforme solicitado.`);
  };

  const handleSaveToAgenda = () => {
    if (!agendaName.trim()) {
      alert('Por favor, informe um nome para a lista de contatos.');
      return;
    }
    
    setIsSaving(true);
    // Simular salvamento em massa
    setTimeout(() => {
      setIsSaving(false);
      setIsSaveAgendaModalOpen(false);
      setAgendaName('');
      alert(`Lista "${agendaName}" criada com sucesso! ${selectedGroup?.memberCount} contatos foram importados para sua agenda.`);
    }, 2000);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neon-gradient">Grupos de WhatsApp</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Gerencie seus grupos e comunidades do WhatsApp.</p>
        </div>
        <Button 
          onClick={handleGlobalSync}
          disabled={isSyncing}
          className="w-full sm:w-auto bg-primary/20 hover:bg-primary/30 text-primary border-primary/30 neon-border min-w-[140px]"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")} />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card/40 border border-primary/20 rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/40 focus:bg-primary/10 transition-all outline-none"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" className="flex-1 md:flex-none border-primary/20 hover:bg-primary/10">
            <Filter className="w-4 h-4 mr-2" /> Filtros
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {filteredGroups.map((group) => {
          return (
            <Card 
              key={group.id} 
              onClick={() => handleSync(group)}
              className={cn(
                "cursor-pointer hover:border-primary/50 transition-all bg-card/40 backdrop-blur-md border-primary/20 overflow-hidden group",
                group.isAdmin && "border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
              )}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={cn(
                      "w-12 h-12 rounded-full overflow-hidden border bg-primary/10 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                      group.isAdmin ? "border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]" : "border-primary/30"
                    )}>
                      {group.photo ? (
                        <img src={group.photo} alt={group.name} className="w-full h-full object-cover" />
                      ) : (
                        <Users className={cn("w-6 h-6", group.isAdmin ? "text-amber-500" : "text-primary")} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg truncate">{group.name}</h3>
                        {group.isAdmin && (
                          <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px] h-5 px-1.5 uppercase font-bold tracking-wider">
                            <Shield className="w-3 h-3 mr-1" /> Admin
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {group.memberCount} membros
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {group.messageCount} mensagens
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="w-full sm:w-auto text-primary hover:bg-primary/10"
                    >
                      <Info className="w-4 h-4 mr-2" /> Ver Detalhes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {filteredGroups.length === 0 && (
        <div className="text-center py-20 bg-card/20 rounded-2xl border border-dashed border-primary/20">
          <MessageSquare className="w-12 h-12 text-primary/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">Nenhum grupo encontrado</h3>
          <p className="text-sm text-muted-foreground/60">Tente ajustar seus filtros de busca.</p>
        </div>
      )}

      {/* Modal de Sincronização Detalhada */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-xl border-primary/20 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <RefreshCw className="w-6 h-6 text-primary animate-spin-slow" />
              Detalhes do Grupo
            </DialogTitle>
            <DialogDescription>
              Informações completas e opções de sincronização.
            </DialogDescription>
          </DialogHeader>

          {selectedGroup && (
            <div className="space-y-6 py-4">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-lg shrink-0 mx-auto md:mx-0">
                  {selectedGroup.photo ? (
                    <img src={selectedGroup.photo} alt={selectedGroup.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-12 h-12 text-primary" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 space-y-4 text-center md:text-left">
                  <div>
                    <h2 className="text-2xl font-bold text-primary">{selectedGroup.name}</h2>
                    <p className="text-muted-foreground mt-1">{selectedGroup.description || 'Sem descrição.'}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Membros</p>
                      <p className="text-xl font-bold">{selectedGroup.memberCount}</p>
                    </div>
                    <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Mensagens</p>
                      <p className="text-xl font-bold">{selectedGroup.messageCount}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-bold flex items-center gap-2 text-primary/80">
                    <Shield className="w-4 h-4" /> Admins
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedGroup.admins.map((admin, idx) => (
                      <Badge key={idx} variant="outline" className="bg-primary/5 border-primary/20">
                        {admin}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold flex items-center gap-2 text-primary/80">
                      <Users className="w-4 h-4" /> Membros
                    </h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs text-primary h-auto p-0 hover:bg-transparent underline underline-offset-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMembersModalOpen(true);
                      }}
                    >
                      Ver Tudo
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedGroup.members.slice(0, 5).map((member, idx) => (
                      <Badge key={idx} variant="outline" className="bg-muted/20 border-muted/30">
                        {member}
                      </Badge>
                    ))}
                    {selectedGroup.memberCount > 5 && (
                      <Badge variant="outline" className="bg-muted/20 border-muted/30 text-muted-foreground">
                        +{selectedGroup.memberCount - 5} outros
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-primary/10">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold flex items-center gap-2">
                    <Download className="w-4 h-4 text-primary" /> Opções de Contatos
                  </h4>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => setIsSaveAgendaModalOpen(true)}
                    className="bg-primary/20 hover:bg-primary/30 text-primary border-primary/30 neon-border flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Salvar contatos para agenda
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => handleExport('csv')}
                    className="border-primary/20 hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-center gap-2 h-12"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-green-500" />
                    Exportar para CSV (Interno)
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleExport('excel')}
                    className="border-primary/20 hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-center gap-2 h-12"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                    Exportar para EXCEL (Interno)
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-3 flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 shrink-0" />
                  Os arquivos serão gerados com os números em formato internacional limpo (apenas dígitos), prontos para serem processados internamente.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Fechar
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(34,211,238,0.4)]">
              Sincronizar Agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Todos os Membros */}
      <Dialog open={isMembersModalOpen} onOpenChange={setIsMembersModalOpen}>
        <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-xl border-primary/20 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Todos os Membros
            </DialogTitle>
            <DialogDescription>
              Lista completa de participantes do grupo {selectedGroup?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[500px] overflow-y-auto pr-2 space-y-1 mt-4">
            {selectedGroup && getMemberData(selectedGroup).map((member, idx) => {
              return (
                <div key={idx} className="flex items-center justify-between py-1.5 px-4 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors">
                  <div className="flex items-center gap-8 min-w-0">
                    <p className="text-sm font-semibold truncate w-40">{member.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{member.displayPhone}</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {member.isAdmin ? (
                      <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[10px] h-5 px-2 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> ADMIN
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Participante</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsMembersModalOpen(false)}>
              Voltar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Salvar para Agenda */}
      <Dialog open={isSaveAgendaModalOpen} onOpenChange={setIsSaveAgendaModalOpen}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-primary/20 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Save className="w-5 h-5 text-primary" />
              Importação em Massa
            </DialogTitle>
            <DialogDescription>
              Crie uma nova lista de contatos a partir dos membros deste grupo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Nome da Lista</label>
              <Input 
                placeholder="Ex: Leads VIP - Grupo Vendas SP" 
                value={agendaName}
                onChange={(e) => setAgendaName(e.target.value)}
                className="bg-card border-primary/20 focus:ring-primary/40"
              />
              <p className="text-[10px] text-muted-foreground italic">
                * Todos os {selectedGroup?.memberCount} contatos serão salvos com a tag do grupo.
              </p>
            </div>

            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
              <h5 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> O que será feito:
              </h5>
              <ul className="text-xs space-y-1.5 text-muted-foreground">
                <li>• Identificação de números válidos</li>
                <li>• Formatação para padrão internacional (55...)</li>
                <li>• Atribuição automática de Tags</li>
                <li>• Sincronização com o Kanban de Contatos</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="sm:justify-between items-center gap-4">
            <p className="text-[10px] text-muted-foreground hidden sm:block">
              Tempo estimado: &lt; 30 segundos
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setIsSaveAgendaModalOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveToAgenda}
                disabled={isSaving || !agendaName.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[140px]"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Agora
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};