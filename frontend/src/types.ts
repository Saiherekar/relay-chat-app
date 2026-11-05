export interface User {
  id: number;
  name: string;
  email: string;
  profile_image?: string | null;
}

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

export interface ChatItem {
  chatId: string;
  chatType: string;
  otherUserId: number;
  otherUserName: string;
  profileImage: string | null;
  isOnline: number;
  lastSeen: string | null;
  latestMessage: ChatMessage | null;
  unreadCount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: unknown[] | null;
}
