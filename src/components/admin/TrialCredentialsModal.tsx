import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, X, Sparkles, Clock, Key, Mail, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/shared';

interface TrialCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: {
    name: string;
    email: string;
    password: string;
    expiresAt: string;
  };
  systemUrl?: string;
}

export function TrialCredentialsModal({
  isOpen,
  onClose,
  credentials,
  systemUrl = 'https://app.ksleads.com',
}: TrialCredentialsModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const expiresDate = new Date(credentials.expiresAt);
  const expiresFormatted = expiresDate.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const whatsappMessage = `🎉 *Bem-vindo ao KS Leads - Acesso Trial*

Olá *${credentials.name}*! 👋

Seu acesso trial foi criado com sucesso! Agora você pode testar todas as funcionalidades da nossa plataforma.

📋 *Seus Dados de Acesso:*

🔗 *Link:* ${systemUrl}
📧 *Email:* ${credentials.email}
🔑 *Senha:* ${credentials.password}

⏰ *Validade:* ${expiresFormatted}

💡 *Dicas para começar:*
1️⃣ Faça login com suas credenciais
2️⃣ Conecte seu WhatsApp
3️⃣ Importe seus contatos
4️⃣ Crie sua primeira campanha

⚠️ *Importante:*
• Seu acesso é temporário e expira automaticamente
• Aproveite para testar todas as funcionalidades
• Entre em contato se tiver dúvidas

🚀 Bons testes e sucesso nas suas campanhas!

---
_Equipe KS Leads_`;

  const handleCopy = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(whatsappMessage);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-card border border-primary/20 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header com gradiente animado */}
        <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 bg-[length:200%_100%] p-6">
          <motion.div
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute inset-0 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 opacity-50"
          />

          <div className="relative flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Trial Criado com Sucesso!</h2>
                <p className="text-white/90 text-sm">
                  Copie a mensagem abaixo e envie para o cliente
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Credenciais em Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-semibold text-muted-foreground">EMAIL</span>
              </div>
              <p className="font-mono text-sm font-semibold break-all">{credentials.email}</p>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-green-500" />
                <span className="text-xs font-semibold text-muted-foreground">SENHA</span>
              </div>
              <p className="font-mono text-sm font-semibold">{credentials.password}</p>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-semibold text-muted-foreground">EXPIRA EM</span>
              </div>
              <p className="text-sm font-semibold">{expiresFormatted}</p>
            </div>
          </div>

          {/* Link de Acesso */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-semibold text-muted-foreground">LINK DE ACESSO</span>
              </div>
              <a
                href={systemUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-500 hover:underline"
              >
                Abrir
              </a>
            </div>
            <p className="font-mono text-sm font-semibold mt-2">{systemUrl}</p>
          </div>

          {/* Mensagem para WhatsApp */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Mensagem para WhatsApp</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={handleOpenWhatsApp}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Enviar
                </Button>
              </div>
            </div>

            <div className="relative">
              <pre className="bg-muted/50 border border-primary/20 rounded-xl p-4 text-sm whitespace-pre-wrap font-sans overflow-x-auto">
                {whatsappMessage}
              </pre>
            </div>
          </div>

          {/* Dica */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-sm">
                <p className="font-semibold mb-1">Dica Profissional</p>
                <p className="text-muted-foreground">
                  Você pode clicar em "Enviar" para abrir o WhatsApp Web com a mensagem já formatada,
                  ou copiar e colar manualmente no aplicativo.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-primary/20 p-6 bg-muted/20">
          <Button onClick={onClose} className="w-full">
            Fechar
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <label className={`text-sm font-medium ${className}`}>{children}</label>;
}
