import makeWASocket, { downloadMediaMessage, proto } from '@whiskeysockets/baileys';
import * as baileys from '../../providers/baileys/manager.js';
import { Story, StoryContact } from './stories.types.js';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

class StoriesService {
  private storiesCache: Map<string, StoryContact[]> = new Map();
  private viewedStories: Set<string> = new Set();

  async fetchStoriesFromWhatsApp(sessionId: string): Promise<StoryContact[]> {
    const sock = baileys.get(sessionId);
    if (!sock) {
      throw new Error('Sessão não encontrada ou não conectada');
    }

    try {
      // Buscar todos os contatos com stories
      const contacts = await this.getContactsWithStories(sock);

      const storyContacts: StoryContact[] = [];

      for (const contact of contacts) {
        try {
          // Buscar stories do contato
          const stories = await this.fetchContactStories(sock, sessionId, contact.jid);

          if (stories.length > 0) {
            const hasUnviewed = stories.some(s => !this.viewedStories.has(s.id));

            storyContacts.push({
              jid: contact.jid,
              name: contact.name || contact.phone || 'Desconhecido',
              phone: contact.phone || '',
              avatar: contact.avatar,
              stories,
              hasUnviewed,
            });
          }
        } catch (err) {
          console.error(`Erro ao buscar stories de ${contact.jid}:`, err);
        }
      }

      // Ordenar: não visualizados primeiro
      storyContacts.sort((a, b) => {
        if (a.hasUnviewed && !b.hasUnviewed) return -1;
        if (!a.hasUnviewed && b.hasUnviewed) return 1;
        return 0;
      });

      this.storiesCache.set(sessionId, storyContacts);
      return storyContacts;
    } catch (error: any) {
      console.error('Erro ao buscar stories:', error);
      throw new Error(`Falha ao buscar stories: ${error.message}`);
    }
  }

  private async getContactsWithStories(sock: ReturnType<typeof makeWASocket>): Promise<Array<{ jid: string; name?: string; phone?: string; avatar?: string }>> {
    try {
      console.log('[getContactsWithStories] Buscando stories ativos do WhatsApp');

      const statusJid = 'status@broadcast';
      const contactsMap = new Map<string, { jid: string; name?: string; phone?: string; avatar?: string }>();

      // Buscar do cache local de mensagens
      const store = (sock as any).store;

      if (store?.messages && store.messages[statusJid]) {
        const statusMessages = store.messages[statusJid];
        console.log(`[getContactsWithStories] ${Object.keys(statusMessages).length} mensagens de status no cache`);

        for (const msg of Object.values(statusMessages)) {
          const message = msg as any;
          const participantJid = message.key?.participant;

          if (participantJid && !contactsMap.has(participantJid)) {
            const phone = participantJid.split('@')[0];
            const name = message.pushName || phone;

            // Verificar se a mensagem é das últimas 24 horas
            const timestamp = (message.messageTimestamp as number) * 1000;
            const now = Date.now();
            const oneDayAgo = now - (24 * 60 * 60 * 1000);

            if (timestamp > oneDayAgo) {
              contactsMap.set(participantJid, {
                jid: participantJid,
                name,
                phone,
              });
            }
          }
        }
      } else {
        console.log('[getContactsWithStories] Nenhuma mensagem de status no cache');
      }

      const contacts = Array.from(contactsMap.values());
      console.log(`[getContactsWithStories] ${contacts.length} contatos com stories ativos`);

      return contacts;
    } catch (error) {
      console.error('Erro ao buscar contatos com stories:', error);
      return [];
    }
  }

  private async fetchContactStories(
    sock: ReturnType<typeof makeWASocket>,
    sessionId: string,
    contactJid: string
  ): Promise<Story[]> {
    try {
      const stories: Story[] = [];

      // Buscar mensagens de status do contato
      // Stories no WhatsApp são mensagens enviadas para o JID de status
      const statusMessages = await this.getStatusMessages(sock, contactJid);

      for (const msg of statusMessages) {
        const story = await this.parseStoryMessage(sock, sessionId, contactJid, msg);
        if (story) {
          stories.push(story);
        }
      }

      return stories;
    } catch (error) {
      console.error(`Erro ao buscar stories de ${contactJid}:`, error);
      return [];
    }
  }

  private async getStatusMessages(sock: ReturnType<typeof makeWASocket>, contactJid: string): Promise<any[]> {
    try {
      console.log(`[getStatusMessages] Buscando stories de ${contactJid}`);

      const statusJid = 'status@broadcast';
      const messages: any[] = [];

      // Buscar do cache local de mensagens
      const store = (sock as any).store;

      if (store?.messages && store.messages[statusJid]) {
        const statusMessages = store.messages[statusJid];

        for (const msg of Object.values(statusMessages)) {
          const message = msg as any;
          if (message.key?.participant === contactJid) {
            // Verificar se é das últimas 24 horas
            const timestamp = (message.messageTimestamp as number) * 1000;
            const now = Date.now();
            const oneDayAgo = now - (24 * 60 * 60 * 1000);

            if (timestamp > oneDayAgo) {
              messages.push(message);
            }
          }
        }
      }

      console.log(`[getStatusMessages] ${messages.length} stories de ${contactJid} no cache`);
      return messages;
    } catch (error) {
      console.error('Erro ao buscar mensagens de status:', error);
      return [];
    }
  }

  private async parseStoryMessage(
    sock: ReturnType<typeof makeWASocket>,
    sessionId: string,
    contactJid: string,
    message: any
  ): Promise<Story | null> {
    try {
      const msg = message.message;
      if (!msg) return null;

      const storyId = message.key.id;
      const timestamp = new Date((message.messageTimestamp as number) * 1000);

      // Extrair informações do contato
      const contactName = message.pushName || contactJid.split('@')[0];
      const contactPhone = contactJid.split('@')[0];

      // Determinar tipo de story
      if (msg.imageMessage) {
        const mediaPath = await this.downloadStoryMedia(sock, sessionId, message, 'image');
        return {
          id: storyId,
          sessionId,
          contactJid,
          contactName,
          contactPhone,
          timestamp,
          type: 'image',
          mediaPath,
          mediaUrl: mediaPath ? `/api/stories/${sessionId}/${storyId}/media` : undefined,
          isViewed: this.viewedStories.has(storyId),
        };
      } else if (msg.videoMessage) {
        const mediaPath = await this.downloadStoryMedia(sock, sessionId, message, 'video');
        return {
          id: storyId,
          sessionId,
          contactJid,
          contactName,
          contactPhone,
          timestamp,
          type: 'video',
          mediaPath,
          mediaUrl: mediaPath ? `/api/stories/${sessionId}/${storyId}/media` : undefined,
          isViewed: this.viewedStories.has(storyId),
        };
      } else if (msg.extendedTextMessage || msg.conversation) {
        const text = msg.extendedTextMessage?.text || msg.conversation;
        return {
          id: storyId,
          sessionId,
          contactJid,
          contactName,
          contactPhone,
          timestamp,
          type: 'text',
          text,
          backgroundColor: '#1a1a1a',
          isViewed: this.viewedStories.has(storyId),
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao parsear mensagem de story:', error);
      return null;
    }
  }

  private async downloadStoryMedia(
    sock: ReturnType<typeof makeWASocket>,
    sessionId: string,
    message: any,
    type: 'image' | 'video'
  ): Promise<string | undefined> {
    try {
      const buffer = await downloadMediaMessage(
        message,
        'buffer',
        {},
        {
          logger: console as any,
          reuploadRequest: sock.updateMediaMessage,
        }
      );

      if (!buffer) return undefined;

      // Criar diretório para stories se não existir
      const storiesDir = path.join(process.cwd(), 'uploads', 'stories', sessionId);
      if (!existsSync(storiesDir)) {
        await fs.mkdir(storiesDir, { recursive: true });
      }

      const ext = type === 'video' ? 'mp4' : 'jpg';
      const filename = `${message.key.id}.${ext}`;
      const filepath = path.join(storiesDir, filename);

      await fs.writeFile(filepath, buffer);
      return filepath;
    } catch (error) {
      console.error('Erro ao baixar mídia de story:', error);
      return undefined;
    }
  }

  async getStoryMedia(sessionId: string, storyId: string): Promise<string | null> {
    try {
      const storiesDir = path.join(process.cwd(), 'uploads', 'stories', sessionId);

      // Tentar encontrar o arquivo (pode ser jpg ou mp4)
      const extensions = ['jpg', 'jpeg', 'png', 'mp4', 'webp'];

      for (const ext of extensions) {
        const filepath = path.join(storiesDir, `${storyId}.${ext}`);
        if (existsSync(filepath)) {
          return filepath;
        }
      }

      return null;
    } catch (error) {
      console.error('Erro ao buscar mídia:', error);
      return null;
    }
  }

  async markStoryAsViewed(sessionId: string, storyId: string): Promise<void> {
    this.viewedStories.add(storyId);

    // Atualizar cache
    const cached = this.storiesCache.get(sessionId);
    if (cached) {
      for (const contact of cached) {
        for (const story of contact.stories) {
          if (story.id === storyId) {
            story.isViewed = true;
            story.viewedAt = new Date();
          }
        }
        contact.hasUnviewed = contact.stories.some(s => !s.isViewed);
      }
    }
  }

  async sendStoryReply(
    sessionId: string,
    storyId: string,
    contactJid: string,
    message: string
  ): Promise<void> {
    const sock = baileys.get(sessionId);
    if (!sock) {
      throw new Error('Sessão não encontrada ou não conectada');
    }

    try {
      // Enviar mensagem direta para o contato (resposta ao story)
      await sock.sendMessage(contactJid, {
        text: message,
      });
    } catch (error: any) {
      console.error('Erro ao enviar resposta:', error);
      throw new Error(`Falha ao enviar resposta: ${error.message}`);
    }
  }

  clearCache(sessionId?: string): void {
    if (sessionId) {
      this.storiesCache.delete(sessionId);
    } else {
      this.storiesCache.clear();
    }
  }
}

export const storiesService = new StoriesService();
