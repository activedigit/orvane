/**
 * Delivery channels. In-app is always on (DB row). Email / WhatsApp / Push
 * are interfaces with logging adapters; plug real providers (Resend, SES,
 * Twilio/WhatsApp Business API, FCM/OneSignal) by implementing `send`.
 */
export interface OutboundNotification {
  userId: string;
  email?: string | null;
  phone?: string | null;
  title: string;
  body?: string | null;
  link?: string | null;
  type: string;
}

export interface NotificationChannel {
  readonly name: 'email' | 'whatsapp' | 'push';
  isEnabled(): boolean;
  send(n: OutboundNotification): Promise<'sent' | 'failed' | 'skipped'>;
}

export const consoleEmailChannel: NotificationChannel = {
  name: 'email',
  isEnabled: () => process.env.EMAIL_ENABLED === 'true',
  async send(n) {
    if (!n.email) return 'skipped';
    console.info(`[email] to=${n.email} subject=${n.title}`);
    return 'sent';
  },
};

export const consoleWhatsappChannel: NotificationChannel = {
  name: 'whatsapp',
  isEnabled: () => process.env.WHATSAPP_ENABLED === 'true',
  async send(n) {
    if (!n.phone) return 'skipped';
    console.info(`[whatsapp] to=${n.phone} text=${n.title}`);
    return 'sent';
  },
};

export const consolePushChannel: NotificationChannel = {
  name: 'push',
  isEnabled: () => process.env.PUSH_ENABLED === 'true',
  async send(n) {
    console.info(`[push] user=${n.userId} title=${n.title}`);
    return 'sent';
  },
};
