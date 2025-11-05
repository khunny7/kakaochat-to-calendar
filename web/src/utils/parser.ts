export interface ParsedMessage {
  timestamp: Date;
  sender: string;
  message: string;
  uid: string;
  sourcePath: string;
  diaryDate?: string;
}

export interface GroupedEvent {
  sender: string;
  dateKey: string;
  displayDate: string;
  messages: ParsedMessage[];
  uid: string;
}

function isDayHeader(line: string): boolean {
  return /^[A-Za-z]+, [A-Za-z]+ \d{1,2}, \d{4}$/.test(line);
}

function parseMessageLine(line: string) {
  const regex = /^([A-Za-z]{3} \d{1,2}, \d{4}) at ([0-9]{1,2}:[0-9]{2})(?:[ \u202f]?)(AM|PM)(?:,\s*([^:]+?))?\s*:\s*(.*)$/iu;
  const match = line.match(regex);
  if (!match) {
    return null;
  }
  const [, datePart, timePartRaw, ampmRaw, senderRaw, messageRaw] = match;
  const timePart = timePartRaw.replace(/\u202f/g, ' ').trim();
  const ampm = ampmRaw.toUpperCase();
  const sender = senderRaw ? senderRaw.trim() : null;
  const message = messageRaw.trim();
  return { datePart, timePart, ampm, sender, message };
}

function toDate(datePart: string, timePart: string, ampm: string): Date | null {
  const date = new Date(`${datePart} ${timePart} ${ampm}`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

async function hashUid(data: { sourcePath: string; timestamp: string; sender: string; message: string }): Promise<string> {
  const text = `${data.sourcePath}|${data.timestamp}|${data.sender}|${data.message}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-1', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashGroupUids(messages: ParsedMessage[]): Promise<string> {
  const text = messages.map(m => m.uid).join('|');
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-1', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function parseChatFile(content: string, sourcePath: string): Promise<ParsedMessage[]> {
  const lines = content.split(/\r?\n/);
  const messages: ParsedMessage[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    if (line.startsWith('Talk_') || line.startsWith('Date Saved')) {
      continue;
    }
    if (isDayHeader(line)) {
      continue;
    }

    const parsed = parseMessageLine(line);
    if (!parsed) {
      continue;
    }

    const { datePart, timePart, ampm, sender, message } = parsed;
    const timestamp = toDate(datePart, timePart, ampm);
    if (!timestamp) {
      continue;
    }

    const normalizedSender = sender ?? 'Unknown';
    const uid = await hashUid({
      sourcePath,
      timestamp: timestamp.toISOString(),
      sender: normalizedSender,
      message,
    });

    messages.push({
      sourcePath,
      timestamp,
      sender: normalizedSender,
      message,
      uid,
    });
  }

  return messages;
}

export function formatDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const year = `${date.getFullYear()}`;
  return `${month}/${day}/${year}`;
}

export function computeDiaryDate(dateObj: Date, cutoffHour: number): string {
  const copy = new Date(dateObj.getTime());
  const hour = copy.getHours();
  if (hour < cutoffHour) {
    copy.setDate(copy.getDate() - 1);
  }
  return formatDate(copy);
}

export async function groupMessages(messages: ParsedMessage[]): Promise<GroupedEvent[]> {
  if (messages.length === 0) {
    return [];
  }

  const groupsByKey = new Map<string, GroupedEvent>();
  const orderedKeys: string[] = [];

  for (const message of messages) {
    const dateKey = message.diaryDate || formatDate(message.timestamp);
    const groupKey = `${message.sender}||${dateKey}`;
    let group = groupsByKey.get(groupKey);
    if (!group) {
      group = {
        sender: message.sender,
        dateKey,
        messages: [],
        displayDate: dateKey,
        uid: '',
      };
      groupsByKey.set(groupKey, group);
      orderedKeys.push(groupKey);
    }
    group.messages.push(message);
  }

  const grouped: GroupedEvent[] = [];
  for (const key of orderedKeys) {
    const group = groupsByKey.get(key)!;
    group.messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime() || a.uid.localeCompare(b.uid));
    group.uid = await hashGroupUids(group.messages);
    grouped.push(group);
  }

  grouped.sort((a, b) => {
    const aTime = a.messages[0].timestamp.getTime();
    const bTime = b.messages[0].timestamp.getTime();
    if (aTime !== bTime) {
      return aTime - bTime;
    }
    if (a.sender !== b.sender) {
      return a.sender.localeCompare(b.sender);
    }
    return a.uid.localeCompare(b.uid);
  });

  return grouped;
}
