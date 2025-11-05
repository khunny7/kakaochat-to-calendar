# Kakao Chat to Calendar

Convert KakaoTalk chat export text files into calendar events (ICS format) for Outlook, Google Calendar, Apple Calendar, and more.

## 🆕 New: Web App (PWA)

We now have a **Progressive Web App** version with a user-friendly interface! Perfect for non-technical users and can be published to the Windows Store.

### Web App Features

✅ **No Command Line** - Simple drag-and-drop interface
✅ **Browser-Based** - Works on any device
✅ **Privacy First** - All processing happens locally, no uploads
✅ **Windows Store Ready** - Can be packaged and published
✅ **Offline Support** - Works without internet

**👉 [Go to Web App Instructions](web/README.md)**

---

## Command Line Tool

The original Node.js CLI tool is still available for advanced users and automation.

### Prerequisites

- Node.js 18 or newer

### Quick start

```powershell
npm install
node src/index.js Talk_*.txt
```

By default the script:

- Writes an ICS file to `out/outlook-import.ics`
- Stores processed entry hashes in `.kakao-dedup.json`
- Creates all-day diary entries grouped by sender and diary date

You can adjust the behaviour with flags:

| Option | Description |
| --- | --- |
| `--output`, `-o` | Change the output ICS path |
| `--state` | Change the deduplication store path |
| `--duration` | Set the value recorded in `X-KAKAO-DURATION-MINUTES` |
| `--cutoff` | Diary day boundary hour (0-23), default 4 |
| `--dry-run` | Print the ICS calendar to stdout instead of writing to disk |

Example:

```powershell
node src/index.js --output diary.ics --duration 15 Talk_2025.10.13*.txt
```

## Deduplication

Every message is hashed using its source file, timestamp, sender, and body text. The hash is stored in the JSON state file so re-running the script only appends genuinely new entries. The hash also appears in the exported ICS event (`UID` and within the description) so you can spot duplicates manually inside Outlook if necessary.

If you ever need to rebuild the ICS from scratch, delete `.kakao-dedup.json` and rerun the command.

## Importing into Outlook

1. Open Outlook (desktop, Web, or new Outlook) and switch to **Calendar**.
2. Choose **Add calendar > Upload from file** (new Outlook / Outlook on the web) or **File > Open & Export > Import/Export > Import an iCalendar (.ics)** (classic Outlook for Windows).
3. Browse to the generated ICS file and select the destination calendar (a dedicated diary calendar is recommended).

Outlook does not guarantee automatic deduplication when you re-import the *same* ICS file. For repeated imports, either clear the target calendar first or keep a dedicated calendar that you overwrite by deleting its contents before each import.

## Project Structure

```
├── src/           # Command-line tool (Node.js)
├── web/           # Progressive Web App (React + Vite)
├── out/           # Generated ICS files (CLI)
└── DEPLOYMENT-GUIDE.md  # Guide for publishing to Windows Store
```

## Deployment Options

- **CLI Tool**: Use directly via Node.js
- **Web App (Local)**: Run `cd web && npm run dev`
- **Web App (Hosted)**: Deploy to Vercel/Netlify - [See Deployment Guide](DEPLOYMENT-GUIDE.md)
- **Windows Store**: Package and publish PWA - [See Deployment Guide](DEPLOYMENT-GUIDE.md)

## Notes

- Non-chat lines (headers, date banners, etc.) are ignored.
- Messages that lack a sender are tagged as `Unknown`.
- Each event is categorised as `Kakao Diary`, marked private, and generated as an all-day entry spanning the diary date.
- Default cutoff hour is 4 AM (messages between 00:00-03:59 belong to previous day)

## License

MIT
