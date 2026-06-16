export interface PasswordResetMessage {
  recipient: string;
  resetToken: string;
  expiresAt: Date;
}

export interface IEmailService {
  sendPasswordReset(message: PasswordResetMessage): Promise<void>;
}

export class ConsoleEmailService implements IEmailService {
  async sendPasswordReset(message: PasswordResetMessage): Promise<void> {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[StudyConnect] Password reset for ${message.recipient}: token=${message.resetToken}, expires=${message.expiresAt.toISOString()}`
      );
    }
  }
}

export const emailService = new ConsoleEmailService();
