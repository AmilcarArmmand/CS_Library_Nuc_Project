import { addDays } from 'date-fns';
import { and, eq, gt, inArray, isNull, lt, lte } from 'drizzle-orm';
import { config } from '../config/env.js';
import { connectDatabase, db, pool } from '../db/database.js';
import { books, loans, users } from '../db/schema/schema.js';
import { sendDueReminderEmail, sendOverdueNoticeEmail } from '../utils/emailService.js';

type ReminderRow = {
  loanId: number;
  userId: number;
  name: string;
  email: string;
  dueDate: Date;
  title: string;
  author: string;
};

type GroupedReminder = {
  userId: number;
  name: string;
  email: string;
  loanIds: number[];
  loans: Array<{ title: string; author: string; dueDate: Date }>;
};

function groupReminderRows(rows: ReminderRow[]): GroupedReminder[] {
  const groups = new Map<number, GroupedReminder>();

  for (const row of rows) {
    const existing = groups.get(row.userId);
    if (existing) {
      existing.loanIds.push(row.loanId);
      existing.loans.push({
        title: row.title,
        author: row.author,
        dueDate: row.dueDate,
      });
      continue;
    }

    groups.set(row.userId, {
      userId: row.userId,
      name: row.name,
      email: row.email,
      loanIds: [row.loanId],
      loans: [{
        title: row.title,
        author: row.author,
        dueDate: row.dueDate,
      }],
    });
  }

  return Array.from(groups.values());
}

async function markDueReminderSent(loanIds: number[]) {
  if (loanIds.length === 0) return;
  await db
    .update(loans)
    .set({ dueReminderSentAt: new Date() })
    .where(inArray(loans.id, loanIds));
}

async function markOverdueNoticeSent(loanIds: number[]) {
  if (loanIds.length === 0) return;
  await db
    .update(loans)
    .set({ overdueNoticeSentAt: new Date() })
    .where(inArray(loans.id, loanIds));
}

async function loadDueSoonRows(now: Date): Promise<ReminderRow[]> {
  if (config.email.dueReminderDays <= 0) {
    return [];
  }

  const cutoff = addDays(now, config.email.dueReminderDays);
  return await db
    .select({
      loanId: loans.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      dueDate: loans.dueDate,
      title: books.title,
      author: books.author,
    })
    .from(loans)
    .innerJoin(users, eq(loans.userId, users.id))
    .innerJoin(books, eq(loans.isbn, books.isbn))
    .where(
      and(
        eq(loans.returned, false),
        isNull(loans.dueReminderSentAt),
        gt(loans.dueDate, now),
        lte(loans.dueDate, cutoff),
      ),
    );
}

async function loadOverdueRows(now: Date): Promise<ReminderRow[]> {
  return await db
    .select({
      loanId: loans.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      dueDate: loans.dueDate,
      title: books.title,
      author: books.author,
    })
    .from(loans)
    .innerJoin(users, eq(loans.userId, users.id))
    .innerJoin(books, eq(loans.isbn, books.isbn))
    .where(
      and(
        eq(loans.returned, false),
        isNull(loans.overdueNoticeSentAt),
        lt(loans.dueDate, now),
      ),
    );
}

async function sendDueSoonReminders(now: Date) {
  const groups = groupReminderRows(await loadDueSoonRows(now));
  let sentUsers = 0;
  let sentLoans = 0;

  for (const group of groups) {
    const result = await sendDueReminderEmail({
      to: group.email,
      name: group.name,
      loans: group.loans,
    });

    if (!result.success) {
      console.warn(`[Email] Due reminder not delivered for ${group.email}.`);
      continue;
    }

    await markDueReminderSent(group.loanIds);
    sentUsers++;
    sentLoans += group.loanIds.length;
  }

  return { sentUsers, sentLoans, totalUsers: groups.length, totalLoans: groups.reduce((sum, group) => sum + group.loanIds.length, 0) };
}

async function sendOverdueNotices(now: Date) {
  const groups = groupReminderRows(await loadOverdueRows(now));
  let sentUsers = 0;
  let sentLoans = 0;

  for (const group of groups) {
    const result = await sendOverdueNoticeEmail({
      to: group.email,
      name: group.name,
      loans: group.loans,
    });

    if (!result.success) {
      console.warn(`[Email] Overdue notice not delivered for ${group.email}.`);
      continue;
    }

    await markOverdueNoticeSent(group.loanIds);
    sentUsers++;
    sentLoans += group.loanIds.length;
  }

  return { sentUsers, sentLoans, totalUsers: groups.length, totalLoans: groups.reduce((sum, group) => sum + group.loanIds.length, 0) };
}

async function run() {
  await connectDatabase();

  const now = new Date();
  const dueSummary = await sendDueSoonReminders(now);
  const overdueSummary = await sendOverdueNotices(now);

  console.log(
    `[Email] Due reminders: ${dueSummary.sentUsers}/${dueSummary.totalUsers} users, ${dueSummary.sentLoans}/${dueSummary.totalLoans} loans.`,
  );
  console.log(
    `[Email] Overdue notices: ${overdueSummary.sentUsers}/${overdueSummary.totalUsers} users, ${overdueSummary.sentLoans}/${overdueSummary.totalLoans} loans.`,
  );
}

run()
  .catch((error) => {
    console.error('[Email] Reminder run failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
