export type NotifyChannel = "EMAIL" | "SMS" | "WHATSAPP";

export type OutboundMessage = {
  channel: NotifyChannel;
  to: string;
  subject?: string;
  body: string;
  meta?: Record<string, unknown>;
};

export interface EmailPort {
  send(msg: { to: string; subject: string; body: string }): Promise<{ id: string }>;
}

export interface SmsPort {
  send(msg: { to: string; body: string }): Promise<{ id: string }>;
}

export interface WhatsAppPort {
  send(msg: { to: string; body: string }): Promise<{ id: string }>;
}

export class ConsoleEmailPort implements EmailPort {
  async send(msg: { to: string; subject: string; body: string }) {
    const id = `email_${Date.now()}`;
    console.log("[email:console]", { id, ...msg });
    return { id };
  }
}

export class ConsoleSmsPort implements SmsPort {
  async send(msg: { to: string; body: string }) {
    const id = `sms_${Date.now()}`;
    console.log("[sms:console]", { id, ...msg });
    return { id };
  }
}

export class ResendEmailPort implements EmailPort {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(msg: { to: string; subject: string; body: string }) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [msg.to],
        subject: msg.subject,
        text: msg.body,
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { id: string };
    return { id: data.id };
  }
}

export class TwilioSmsPort implements SmsPort {
  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly from: string,
  ) {}

  async send(msg: { to: string; body: string }) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const body = new URLSearchParams({
      To: msg.to,
      From: this.from,
      Body: msg.body,
    });
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!res.ok) {
      throw new Error(`Twilio failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { sid: string };
    return { id: data.sid };
  }
}

export function renderTemplate(
  template: string,
  vars: Record<string, string | number | undefined | null>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

export class NotificationDispatcher {
  constructor(
    private readonly email: EmailPort,
    private readonly sms: SmsPort,
    private readonly whatsapp?: WhatsAppPort,
  ) {}

  async dispatch(msg: OutboundMessage): Promise<{ id: string }> {
    switch (msg.channel) {
      case "EMAIL":
        if (!msg.subject) throw new Error("Email subject required");
        return this.email.send({ to: msg.to, subject: msg.subject, body: msg.body });
      case "SMS":
        return this.sms.send({ to: msg.to, body: msg.body });
      case "WHATSAPP":
        if (!this.whatsapp) throw new Error("WhatsApp port not configured");
        return this.whatsapp.send({ to: msg.to, body: msg.body });
      default:
        throw new Error(`Unsupported channel: ${msg.channel}`);
    }
  }
}

export function createNotificationDispatcher(opts: {
  emailProvider: "console" | "resend";
  smsProvider: "console" | "twilio";
  emailFrom: string;
  resendApiKey?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFrom?: string;
}): NotificationDispatcher {
  const email =
    opts.emailProvider === "resend" && opts.resendApiKey
      ? new ResendEmailPort(opts.resendApiKey, opts.emailFrom)
      : new ConsoleEmailPort();

  const sms =
    opts.smsProvider === "twilio" &&
    opts.twilioAccountSid &&
    opts.twilioAuthToken &&
    opts.twilioFrom
      ? new TwilioSmsPort(opts.twilioAccountSid, opts.twilioAuthToken, opts.twilioFrom)
      : new ConsoleSmsPort();

  return new NotificationDispatcher(email, sms);
}
