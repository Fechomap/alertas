export type Platform = 'telegram' | 'whatsapp';

export interface PlatformContext {
  platform: Platform;
  chatId: string;
  userId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface CommandContext extends PlatformContext {
  command: string;
  args: string[];
}

export interface MessageContext extends PlatformContext {
  text: string;
  messageId: string;
}
