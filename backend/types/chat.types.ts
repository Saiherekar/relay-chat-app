export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: number;
  text: string;
  timestamp: string;
  editedAt: string | null;
  deletedAt: string | null;
  clientId?: string;
}

export interface MessagePage {
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor: string | null;
}
