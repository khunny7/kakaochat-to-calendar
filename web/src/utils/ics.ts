import type { GroupedEvent } from './parser';

function parseDiaryDate(displayDate: string): Date {
  const parts = displayDate.split('/');
  if (parts.length === 3) {
    const [monthStr, dayStr, yearStr] = parts;
    const month = Number(monthStr);
    const day = Number(dayStr);
    const year = Number(yearStr);
    if (!Number.isNaN(month) && !Number.isNaN(day) && !Number.isNaN(year)) {
      return new Date(year, month - 1, day);
    }
  }

  const fallback = new Date(displayDate);
  if (!Number.isNaN(fallback.getTime())) {
    return new Date(
      fallback.getFullYear(),
      fallback.getMonth(),
      fallback.getDate(),
    );
  }

  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + amount);
  return result;
}

function formatIcsDate(date: Date): string {
  const year = `${date.getFullYear()}`.padStart(4, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}${month}${day}`;
}

function formatIcsDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcsText(value: string): string {
  const str = value == null ? '' : String(value);
  const normalized = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return normalized
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(line);
  if (bytes.length <= 75) {
    return line;
  }

  const segments: string[] = [];
  let current = '';
  let currentLength = 0;
  for (const char of line) {
    const charLength = encoder.encode(char).length;
    if (currentLength + charLength > 75) {
      segments.push(current);
      current = ` ${char}`;
      currentLength = encoder.encode(current).length;
    } else {
      current += char;
      currentLength += charLength;
    }
  }
  if (current) {
    segments.push(current);
  }

  return segments.join('\r\n');
}

function buildSubject(event: GroupedEvent): string {
  const prefix = event.sender ? `${event.sender}` : 'Diary';
  const firstMessage = event.messages[0]?.message ?? '';
  const snippet = firstMessage.length > 60 ? `${firstMessage.slice(0, 57)}...` : firstMessage;
  if (!snippet) {
    return `${prefix} entry`;
  }
  const extraCount = event.messages.length - 1;
  if (extraCount > 0) {
    return `${prefix} - ${snippet} (+${extraCount} more)`;
  }
  return `${prefix} - ${snippet}`;
}

function buildDescription(event: GroupedEvent): string {
  const entries = event.messages.map((m) => m.message).join('\n\n');
  const lines = [
    `Original Sender: ${event.sender}`,
    `Message Count: ${event.messages.length}`,
    `Entry Date: ${event.displayDate}`,
    `Entry ID: ${event.uid}`,
    '',
    entries,
  ];
  return lines.join('\n');
}

export function buildIcsCalendar(events: GroupedEvent[], durationMinutes: number): string {
  const now = new Date();
  const dtstamp = formatIcsDateTime(now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//kakao-chat-to-ics//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const event of events) {
    const subject = buildSubject(event);
    const description = buildDescription(event);
    const startDate = parseDiaryDate(event.displayDate);
    const endDate = addDays(startDate, 1);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${escapeIcsText(`${event.uid}@kakao-chat`)}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(startDate)}`);
    lines.push(`DTEND;VALUE=DATE:${formatIcsDate(endDate)}`);
    lines.push(`SUMMARY:${escapeIcsText(subject)}`);
    lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
    lines.push('TRANSP:OPAQUE');
    lines.push('CLASS:PRIVATE');
    lines.push('STATUS:CONFIRMED');
    lines.push('CATEGORIES:Kakao Diary');
    lines.push('X-MICROSOFT-CDO-ALLDAYEVENT:TRUE');
    lines.push(`X-KAKAO-DURATION-MINUTES:${durationMinutes}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return lines.map(foldLine).join('\r\n') + '\r\n';
}

export function downloadIcsFile(content: string, filename: string = 'kakao-calendar.ics'): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
