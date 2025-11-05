#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const DEFAULT_OUTPUT = 'out/outlook-import.ics';
const DEFAULT_STATE = '.kakao-dedup.json';
const DEFAULT_DURATION_MINUTES = 30;

async function main() {
  const { inputFiles, outputPath, statePath, durationMinutes, dryRun, cutoffHour } = parseArgs(process.argv.slice(2));

  if (inputFiles.length === 0) {
    console.error('No input files provided.');
    console.error('Usage: node src/index.js [options] <chat-file-1> <chat-file-2> ...');
    process.exit(1);
  }

  const resolvedInputs = await resolveInputs(inputFiles);
  if (resolvedInputs.length === 0) {
    console.error('No chat files matched the provided paths.');
    process.exit(1);
  }

  const dedupStore = await loadState(statePath);
  const messages = [];

  for (const filePath of resolvedInputs) {
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = parseChatFile(content, filePath);
    messages.push(...parsed);
  }

  messages.sort((a, b) => a.timestamp - b.timestamp || a.uid.localeCompare(b.uid));

  const freshMessages = [];
  for (const message of messages) {
    if (dedupStore.has(message.uid)) {
      continue;
    }
    dedupStore.add(message.uid);
    freshMessages.push(message);
  }

  if (freshMessages.length === 0) {
    console.log('No new events found.');
    await saveState(statePath, dedupStore);
    return;
  }

  // assign diaryDate based on cutoff hour and group by diary date + sender
  for (const m of freshMessages) {
    m.diaryDate = computeDiaryDate(m.timestamp, cutoffHour);
  }

  const groupedEvents = groupMessages(freshMessages);

  const calendar = buildIcsCalendar(groupedEvents, durationMinutes);

  if (dryRun) {
    console.log(calendar);
  } else {
    await ensureDirectory(path.dirname(outputPath));
    await fs.writeFile(outputPath, calendar, 'utf8');
    await saveState(statePath, dedupStore);
    console.log(`Wrote ${groupedEvents.length} new events to ${outputPath}`);
  }
}

function groupMessages(messages) {
  if (messages.length === 0) {
    return [];
  }

  const groupsByKey = new Map();
  const orderedKeys = [];

  for (const message of messages) {
  const dateKey = message.diaryDate || formatDate(message.timestamp);
  const groupKey = `${message.sender}||${dateKey}`;
    let group = groupsByKey.get(groupKey);
    if (!group) {
        group = {
          sender: message.sender,
          dateKey,
          messages: [],
        };
      groupsByKey.set(groupKey, group);
      orderedKeys.push(groupKey);
    }
    group.messages.push(message);
  }

  const grouped = [];
  for (const key of orderedKeys) {
    const group = groupsByKey.get(key);
    group.messages.sort((a, b) => a.timestamp - b.timestamp || a.uid.localeCompare(b.uid));
    group.uid = hashGroupUids(group.messages);
    // expose a displayDate (diary date) for output
    group.displayDate = group.dateKey;
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

function parseArgs(argv) {
  const inputFiles = [];
  let outputPath = DEFAULT_OUTPUT;
  let statePath = DEFAULT_STATE;
  let durationMinutes = DEFAULT_DURATION_MINUTES;
  let cutoffHour = 4; // default cutoff at 4AM: entries between 00:00-03:59 belong to previous day
  let dryRun = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--output' || arg === '-o') {
      outputPath = argv[++i] ?? outputPath;
    } else if (arg === '--state') {
      statePath = argv[++i] ?? statePath;
    } else if (arg === '--duration') {
      const value = Number(argv[++i]);
      if (!Number.isNaN(value) && value > 0) {
        durationMinutes = value;
      }
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--cutoff') {
      const value = Number(argv[++i]);
      if (!Number.isNaN(value) && value >= 0 && value <= 23) {
        cutoffHour = value;
      }
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg.startsWith('-')) {
      console.error(`Unknown option: ${arg}`);
      printHelp();
      process.exit(1);
    } else {
      inputFiles.push(arg);
    }
  }

  return {
    inputFiles,
    outputPath: path.resolve(outputPath),
    statePath: path.resolve(statePath),
    durationMinutes,
    dryRun,
    cutoffHour,
  };
}

function printHelp() {
  console.log(`Usage: node src/index.js [options] <chat-files...>

Options:
  --output, -o <path>     Output ICS path (default: ${DEFAULT_OUTPUT})
  --state <path>          Deduplication store (default: ${DEFAULT_STATE})
  --duration <minutes>    Value recorded in X-KAKAO-DURATION-MINUTES (default: ${DEFAULT_DURATION_MINUTES})
  --cutoff <hour>         Diary day boundary hour (0-23), default 4 meaning 00:00-03:59 -> previous day
  --dry-run               Print ICS to stdout instead of writing to disk
  --help, -h              Show this help message
`);
}

async function resolveInputs(inputs) {
  const files = [];
  for (const input of inputs) {
    const absolute = path.resolve(input);
    try {
      const stats = await fs.stat(absolute);
      if (stats.isFile()) {
        files.push(absolute);
      }
    } catch (error) {
      // ignore missing paths, globbing is handled by the shell on most systems
    }
  }
  return files;
}

async function loadState(statePath) {
  try {
    const raw = await fs.readFile(statePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.knownIds)) {
      return new Set(parsed.knownIds);
    }
  } catch (error) {
    // ignore missing or invalid file
  }
  return new Set();
}

async function saveState(statePath, dedupStore) {
  const data = JSON.stringify({ knownIds: Array.from(dedupStore) }, null, 2);
  await fs.writeFile(statePath, data, 'utf8');
}

function parseChatFile(content, sourcePath) {
  const lines = content.split(/\r?\n/);
  const messages = [];

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
    const uid = hashUid({
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

function isDayHeader(line) {
  return /^[A-Za-z]+, [A-Za-z]+ \d{1,2}, \d{4}$/.test(line);
}

function parseMessageLine(line) {
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

function toDate(datePart, timePart, ampm) {
  const date = new Date(`${datePart} ${timePart} ${ampm}`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function hashUid({ sourcePath, timestamp, sender, message }) {
  const hash = crypto.createHash('sha1');
  hash.update(sourcePath);
  hash.update('|');
  hash.update(timestamp);
  hash.update('|');
  hash.update(sender);
  hash.update('|');
  hash.update(message);
  return hash.digest('hex');
}

function hashGroupUids(messages) {
  const hash = crypto.createHash('sha1');
  for (const message of messages) {
    hash.update(message.uid);
    hash.update('|');
  }
  return hash.digest('hex');
}

function computeDiaryDate(dateObj, cutoffHour) {
  // cutoffHour is an integer 0-23. Times from 00:00 until cutoffHour-1 belong to the previous day.
  const copy = new Date(dateObj.getTime());
  const hour = copy.getHours();
  if (hour < cutoffHour) {
    // assign to previous day
    copy.setDate(copy.getDate() - 1);
  }
  return formatDate(copy);
}

function buildIcsCalendar(events, durationMinutes) {
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

function formatDate(date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const year = `${date.getFullYear()}`;
  return `${month}/${day}/${year}`;
}

function parseDiaryDate(displayDate) {
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

function addDays(date, amount) {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + amount);
  return result;
}

function formatIcsDate(date) {
  const year = `${date.getFullYear()}`.padStart(4, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}${month}${day}`;
}

function formatIcsDateTime(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcsText(value) {
  const str = value == null ? '' : String(value);
  const normalized = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return normalized
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function foldLine(line) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) {
    return line;
  }

  const segments = [];
  let current = '';
  let currentLength = 0;
  for (const char of line) {
    const charLength = Buffer.byteLength(char, 'utf8');
    if (currentLength + charLength > 75) {
      segments.push(current);
      current = ` ${char}`;
      currentLength = Buffer.byteLength(current, 'utf8');
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

function buildSubject(event) {
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

function buildDescription(event) {
  // join messages without timestamps or source filenames
  const entries = event.messages.map((m) => m.message).join('\n\n');
  const lines = [
    `Original Sender: ${event.sender}`,
    `Message Count: ${event.messages.length}`,
    `Entry Date: ${event.displayDate || formatDate(event.messages[0].timestamp)}`,
    `Entry ID: ${event.uid}`,
    '',
    entries,
  ];
  return lines.join('\n');
}

function toCsv(rows) {
  return rows
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\r\n');
}

function escapeCsvValue(value) {
  const str = value == null ? '' : String(value);
  const needsQuotes = /[",\n]/.test(str);
  const escaped = str.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

async function ensureDirectory(dirPath) {
  if (!dirPath) {
    return;
  }
  await fs.mkdir(dirPath, { recursive: true });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
