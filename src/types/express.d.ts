declare global {
  namespace Express {
    interface User {
      id: number;
      name?: string;
      email?: string;
      studentId?: string | null;
      role?: string;
      active?: boolean;
      picture?: string | null;
      googleId?: string | null;
      microsoftId?: string | null;
      passwordHash?: string | null;
      lastLogin?: Date | null;
      borrowingLimit?: number;
      loanPeriodDays?: number;
      createdAt?: Date;
      updatedAt?: Date;
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    returnTo?: string;
  }
}

export {};
