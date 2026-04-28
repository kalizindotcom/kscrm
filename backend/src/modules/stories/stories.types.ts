export interface Story {
  id: string;
  sessionId: string;
  contactJid: string;
  contactName: string;
  contactPhone: string;
  contactAvatar?: string;
  timestamp: Date;
  type: 'image' | 'video' | 'text';
  mediaUrl?: string;
  mediaPath?: string;
  text?: string;
  backgroundColor?: string;
  isViewed: boolean;
  viewedAt?: Date;
}

export interface StoryContact {
  jid: string;
  name: string;
  phone: string;
  avatar?: string;
  stories: Story[];
  hasUnviewed: boolean;
}

export interface FetchStoriesParams {
  sessionId: string;
}

export interface StoryReplyParams {
  sessionId: string;
  storyId: string;
  contactJid: string;
  message: string;
}
