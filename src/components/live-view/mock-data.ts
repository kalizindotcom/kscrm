import { LiveConversation, LiveMessage } from './types';

const generateMessages = (count: number): LiveMessage[] => {
  const messages: LiveMessage[] = [];
  const statuses: LiveMessage['status'][] = ['sent', 'delivered', 'read', 'replied'];
  
  for (let i = 0; i < count; i++) {
    const fromMe = Math.random() > 0.5;
    messages.push({
      id: `msg-${i}`,
      content: fromMe 
        ? `Esta é uma mensagem de teste enviada pelo sistema ${i + 1}` 
        : `Olá, esta é uma resposta do cliente ${i + 1}`,
      timestamp: new Date(Date.now() - (count - i) * 1000 * 60 * 15).toISOString(),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      type: 'text',
      fromMe,
      senderName: fromMe ? 'Sistema' : undefined
    });
  }
  return messages;
};

export const mockConversations: LiveConversation[] = [
  {
    id: 'conv-1',
    contactName: 'João Silva',
    phoneNumber: '+55 11 99999-8888',
    avatar: 'https://i.pravatar.cc/150?u=joao',
    lastMessage: 'Olá, gostaria de saber mais sobre o produto.',
    lastMessageTime: new Date().toISOString(),
    unreadCount: 2,
    status: 'active',
    origin: 'campaign',
    tags: ['Interessado', 'Lead Hot'],
    messages: generateMessages(15),
    metrics: {
      totalSent: 12,
      totalReceived: 8,
      avgResponseTime: '5 min',
      responseRate: '90%',
      failureCount: 0
    }
  },
  {
    id: 'conv-2',
    contactName: 'Maria Oliveira',
    phoneNumber: '+55 11 97777-6666',
    avatar: 'https://i.pravatar.cc/150?u=maria',
    lastMessage: 'Pode me enviar o boleto novamente?',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    unreadCount: 0,
    status: 'active',
    origin: 'direct',
    tags: ['Cliente', 'Financeiro'],
    messages: generateMessages(10),
    metrics: {
      totalSent: 25,
      totalReceived: 20,
      avgResponseTime: '12 min',
      responseRate: '100%',
      failureCount: 1
    }
  },
  {
    id: 'conv-3',
    contactName: 'Pedro Santos',
    phoneNumber: '+55 21 98888-7777',
    avatar: 'https://i.pravatar.cc/150?u=pedro',
    lastMessage: 'Erro ao processar o pagamento.',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    unreadCount: 0,
    status: 'error',
    origin: 'api',
    tags: ['Suporte', 'Urgente'],
    messages: [
      ...generateMessages(5),
      {
        id: 'msg-err',
        content: 'Falha ao enviar mensagem automática.',
        timestamp: new Date().toISOString(),
        status: 'failed',
        type: 'text',
        fromMe: true,
        error: 'Sessão desconectada ou token inválido.'
      }
    ],
    metrics: {
      totalSent: 5,
      totalReceived: 3,
      avgResponseTime: '2 min',
      responseRate: '60%',
      failureCount: 3
    }
  }
];
