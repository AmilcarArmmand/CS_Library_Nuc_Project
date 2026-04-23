import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { config } from '../config/env.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAddress(address, name) {
  if (!address) return '';
  if (!name) return address;
  return `"${String(name).replace(/"/g, '\\"')}" <${address}>`;
}

function buildMessage({ to, subject, text, html }) {
  const from = formatAddress(config.email.from, config.email.fromName);
  const toHeader = Array.isArray(to) ? to.join(', ') : to;
  const headers = [
    `From: ${from}`,
    `To: ${toHeader}`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
  ];

  if (!html) {
    return `${headers.join('\r\n')}\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\n${text}\r\n`;
  }

  const boundary = `----=_CSLIB_${randomUUID()}`;
  return [
    ...headers,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    text,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    html,
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

async function sendEmail({ to, subject, text, html }) {
  if (!config.email.from) {
    console.warn('[Email] Skipping send: EMAIL_FROM is not configured.');
    return { success: false, skipped: true, reason: 'missing_from' };
  }

  const message = buildMessage({ to, subject, text, html });

  return await new Promise((resolve) => {
    const child = spawn(config.email.sendmailPath, ['-t', '-i']);
    let stderr = '';

    child.on('error', (error) => {
      console.error('[Email] Failed to start sendmail:', error);
      resolve({ success: false, error: error.message });
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      const errorOutput = stderr.trim();

      // Postfix/sendmail can emit submission warnings to stderr even when it exits 0.
      // Treat that as a failed send so password reset tokens and notices aren't left dangling.
      if (code === 0 && !errorOutput) {
        resolve({ success: true });
        return;
      }

      const error = errorOutput || `sendmail exited with code ${code}`;
      console.error('[Email] Send failed:', error);
      resolve({ success: false, error });
    });

    child.stdin.write(message);
    child.stdin.end();
  });
}

export async function sendPasswordResetEmail({ to, name, resetUrl, expiresInMinutes }) {
  const safeName = escapeHtml(name || 'there');
  const safeUrl = escapeHtml(resetUrl);
  const subject = 'Reset your CS Library password';
  const text = [
    `Hi ${name || 'there'},`,
    '',
    'We received a request to reset your CS Library password.',
    `Use this link within ${expiresInMinutes} minutes:`,
    resetUrl,
    '',
    'If you did not request this, you can ignore this email.',
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;">
      <h2 style="margin-bottom:12px;">Reset your CS Library password</h2>
      <p>Hi ${safeName},</p>
      <p>We received a request to reset your CS Library password.</p>
      <p>
        <a href="${safeUrl}" style="display:inline-block;padding:10px 16px;border-radius:9999px;background:#2563eb;color:#fff;text-decoration:none;font-weight:700;">
          Reset Password
        </a>
      </p>
      <p style="font-size:14px;color:#475569;">This link expires in ${expiresInMinutes} minutes.</p>
      <p style="font-size:14px;color:#475569;">If you did not request this, you can safely ignore this email.</p>
    </div>
  `;

  return await sendEmail({ to, subject, text, html });
}

export async function sendCheckoutConfirmationEmail({ to, name, books, dueDate }) {
  const due = new Date(dueDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const bookLines = books.map((book) => `- ${book.title} by ${book.author}`).join('\n');
  const bookItems = books.map((book) => `<li>${escapeHtml(book.title)} by ${escapeHtml(book.author)}</li>`).join('');
  const subject = 'Your CS Library checkout confirmation';
  const text = [
    `Hi ${name || 'there'},`,
    '',
    'Your checkout has been recorded for the following books:',
    bookLines,
    '',
    `Return date: ${due}`,
    '',
    'Thank you for using the CS Library.',
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;">
      <h2 style="margin-bottom:12px;">Checkout confirmed</h2>
      <p>Hi ${escapeHtml(name || 'there')},</p>
      <p>Your checkout has been recorded for the following books:</p>
      <ul>${bookItems}</ul>
      <p><strong>Return date:</strong> ${escapeHtml(due)}</p>
      <p>Thank you for using the CS Library.</p>
    </div>
  `;

  return await sendEmail({ to, subject, text, html });
}

function buildReminderEmail({ heading, intro, name, loans }) {
  const lines = loans.map((loan) => {
    const due = new Date(loan.dueDate).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    return `- ${loan.title} by ${loan.author} (due ${due})`;
  });
  const items = loans.map((loan) => {
    const due = new Date(loan.dueDate).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    return `<li>${escapeHtml(loan.title)} by ${escapeHtml(loan.author)} (due ${escapeHtml(due)})</li>`;
  }).join('');

  return {
    text: [
      `Hi ${name || 'there'},`,
      '',
      intro,
      ...lines,
      '',
      'Please return or renew your books through the CS Library system.',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;">
        <h2 style="margin-bottom:12px;">${escapeHtml(heading)}</h2>
        <p>Hi ${escapeHtml(name || 'there')},</p>
        <p>${escapeHtml(intro)}</p>
        <ul>${items}</ul>
        <p>Please return or renew your books through the CS Library system.</p>
      </div>
    `,
  };
}

export async function sendDueReminderEmail({ to, name, loans }) {
  const subject = 'Upcoming CS Library due date reminder';
  const content = buildReminderEmail({
    heading: 'Upcoming due date reminder',
    intro: 'The following CS Library books are due soon:',
    name,
    loans,
  });
  return await sendEmail({ to, subject, ...content });
}

export async function sendOverdueNoticeEmail({ to, name, loans }) {
  const subject = 'CS Library overdue notice';
  const content = buildReminderEmail({
    heading: 'Overdue notice',
    intro: 'The following CS Library books are overdue:',
    name,
    loans,
  });
  return await sendEmail({ to, subject, ...content });
}

export async function sendHoldAvailableEmail({ to, name, book, pickupDate }) {
  const pickupBy = new Date(pickupDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const safeName = escapeHtml(name || 'there');
  const safeTitle = escapeHtml(book.title);
  const safeAuthor = escapeHtml(book.author);
  const safePickupBy = escapeHtml(pickupBy);
  const subject = 'Your CS Library hold is ready for pickup';
  const text = [
    `Hi ${name || 'there'},`,
    '',
    `"${book.title}" by ${book.author} is now ready for pickup.`,
    `Please pick it up by ${pickupBy}.`,
    '',
    'If you no longer need the book, please contact the CS Library team.',
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;">
      <h2 style="margin-bottom:12px;">Your hold is ready</h2>
      <p>Hi ${safeName},</p>
      <p><strong>${safeTitle}</strong> by ${safeAuthor} is now ready for pickup.</p>
      <p><strong>Pickup by:</strong> ${safePickupBy}</p>
      <p>If you no longer need the book, please contact the CS Library team.</p>
    </div>
  `;

  return await sendEmail({ to, subject, text, html });
}

export async function sendSuggestionStatusEmail({ to, name, title, author, status }) {
  const safeName = escapeHtml(name || 'there');
  const safeTitle = escapeHtml(title);
  const safeAuthor = escapeHtml(author || 'Unknown Author');
  const verdict = status === 'approved' ? 'approved' : 'not approved';
  const subject = `Your CS Library suggestion was ${status}`;
  const text = [
    `Hi ${name || 'there'},`,
    '',
    `Your suggestion for "${title}" by ${author || 'Unknown Author'} was ${verdict}.`,
    status === 'approved'
      ? 'Thank you for helping us improve the CS Library catalog.'
      : 'Thank you for the suggestion. The library team reviewed it and cannot add it at this time.',
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;">
      <h2 style="margin-bottom:12px;">Suggestion update</h2>
      <p>Hi ${safeName},</p>
      <p>Your suggestion for <strong>${safeTitle}</strong> by ${safeAuthor} was <strong>${escapeHtml(verdict)}</strong>.</p>
      <p>${status === 'approved'
        ? 'Thank you for helping us improve the CS Library catalog.'
        : 'Thank you for the suggestion. The library team reviewed it and cannot add it at this time.'}</p>
    </div>
  `;

  return await sendEmail({ to, subject, text, html });
}

export async function sendDonationReceiptEmail({ to, name, title, author }) {
  const safeName = escapeHtml(name || 'there');
  const safeTitle = escapeHtml(title);
  const safeAuthor = escapeHtml(author || 'Unknown Author');
  const subject = 'We received your CS Library donation';
  const text = [
    `Hi ${name || 'there'},`,
    '',
    `We received your donation submission for "${title}" by ${author || 'Unknown Author'}.`,
    'The library team will review it and email you again once a decision is made.',
    '',
    'Thank you for supporting the CS Library.',
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;">
      <h2 style="margin-bottom:12px;">Donation received</h2>
      <p>Hi ${safeName},</p>
      <p>We received your donation submission for <strong>${safeTitle}</strong> by ${safeAuthor}.</p>
      <p>The library team will review it and email you again once a decision is made.</p>
      <p>Thank you for supporting the CS Library.</p>
    </div>
  `;

  return await sendEmail({ to, subject, text, html });
}

export async function sendDonationStatusEmail({ to, name, title, author, status }) {
  const safeName = escapeHtml(name || 'there');
  const safeTitle = escapeHtml(title);
  const safeAuthor = escapeHtml(author || 'Unknown Author');
  const subject = `Your CS Library donation was ${status}`;
  const approved = status === 'approved';
  const text = [
    `Hi ${name || 'there'},`,
    '',
    approved
      ? `Your donation of "${title}" by ${author || 'Unknown Author'} was accepted into the CS Library.`
      : `Your donation of "${title}" by ${author || 'Unknown Author'} was not accepted into the CS Library at this time.`,
    'Thank you for thinking of the CS Library.',
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;">
      <h2 style="margin-bottom:12px;">Donation update</h2>
      <p>Hi ${safeName},</p>
      <p>${approved
        ? `Your donation of <strong>${safeTitle}</strong> by ${safeAuthor} was accepted into the CS Library.`
        : `Your donation of <strong>${safeTitle}</strong> by ${safeAuthor} was not accepted into the CS Library at this time.`}</p>
      <p>Thank you for thinking of the CS Library.</p>
    </div>
  `;

  return await sendEmail({ to, subject, text, html });
}

export async function sendRenewalRequestReceivedEmail({ to, name, title, author, dueDate }) {
  const due = new Date(dueDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const safeName = escapeHtml(name || 'there');
  const safeTitle = escapeHtml(title);
  const safeAuthor = escapeHtml(author || 'Unknown Author');
  const safeDue = escapeHtml(due);
  const subject = 'We received your CS Library extension request';
  const text = [
    `Hi ${name || 'there'},`,
    '',
    `We received your extension request for "${title}" by ${author || 'Unknown Author'}.`,
    `Current due date: ${due}`,
    'The library team will review your request and email you with a decision.',
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;">
      <h2 style="margin-bottom:12px;">Extension request received</h2>
      <p>Hi ${safeName},</p>
      <p>We received your extension request for <strong>${safeTitle}</strong> by ${safeAuthor}.</p>
      <p><strong>Current due date:</strong> ${safeDue}</p>
      <p>The library team will review your request and email you with a decision.</p>
    </div>
  `;

  return await sendEmail({ to, subject, text, html });
}

export async function sendRenewalRequestStatusEmail({ to, name, title, author, status, dueDate }) {
  const due = dueDate
    ? new Date(dueDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;
  const approved = status === 'approved';
  const safeName = escapeHtml(name || 'there');
  const safeTitle = escapeHtml(title);
  const safeAuthor = escapeHtml(author || 'Unknown Author');
  const subject = `Your CS Library extension request was ${status}`;
  const decisionLine = approved
    ? `Your extension request for "${title}" by ${author || 'Unknown Author'} was approved.${due ? ` New due date: ${due}.` : ''}`
    : `Your extension request for "${title}" by ${author || 'Unknown Author'} was not approved.`;
  const htmlDecisionLine = approved
    ? `Your extension request for <strong>${safeTitle}</strong> by ${safeAuthor} was approved.${due ? ` <strong>New due date:</strong> ${escapeHtml(due)}.` : ''}`
    : `Your extension request for <strong>${safeTitle}</strong> by ${safeAuthor} was not approved.`;
  const text = [
    `Hi ${name || 'there'},`,
    '',
    decisionLine,
    'Thank you for using the CS Library.',
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;">
      <h2 style="margin-bottom:12px;">Extension request update</h2>
      <p>Hi ${safeName},</p>
      <p>${htmlDecisionLine}</p>
      <p>Thank you for using the CS Library.</p>
    </div>
  `;

  return await sendEmail({ to, subject, text, html });
}

export { sendEmail };
