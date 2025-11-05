import { useState } from 'react'
import './App.css'
import { parseChatFile, groupMessages, computeDiaryDate, formatDate, type ParsedMessage, type GroupedEvent } from './utils/parser'
import { buildIcsCalendar, downloadIcsFile } from './utils/ics'

interface FileInfo {
  name: string;
  content: string;
}

function App() {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [processing, setProcessing] = useState(false)
  const [cutoffHour, setCutoffHour] = useState(4)
  const [events, setEvents] = useState<GroupedEvent[]>([])
  const [stats, setStats] = useState<{ count: number; dateRange: string } | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles) return

    const fileInfos: FileInfo[] = []
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      const content = await file.text()
      fileInfos.push({ name: file.name, content })
    }

    setFiles(prev => [...prev, ...fileInfos])
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const processFiles = async () => {
    if (files.length === 0) return

    setProcessing(true)
    try {
      const allMessages: ParsedMessage[] = []

      for (const file of files) {
        const messages = await parseChatFile(file.content, file.name)
        allMessages.push(...messages)
      }

      // Sort messages
      allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime() || a.uid.localeCompare(b.uid))

      // Assign diary dates
      for (const m of allMessages) {
        m.diaryDate = computeDiaryDate(m.timestamp, cutoffHour)
      }

      // Group messages
      const groupedEvents = await groupMessages(allMessages)
      setEvents(groupedEvents)

      // Calculate stats
      if (groupedEvents.length > 0) {
        const firstDate = groupedEvents[0].messages[0].timestamp
        const lastDate = groupedEvents[groupedEvents.length - 1].messages[0].timestamp
        setStats({
          count: groupedEvents.length,
          dateRange: `${formatDate(firstDate)} - ${formatDate(lastDate)}`
        })
      }
    } catch (error) {
      console.error('Error processing files:', error)
      alert('Error processing files. Please check the console for details.')
    } finally {
      setProcessing(false)
    }
  }

  const exportToIcs = () => {
    if (events.length === 0) return

    const icsContent = buildIcsCalendar(events, 30)
    downloadIcsFile(icsContent, 'kakao-calendar.ics')
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🗓️ Kakao Chat to Calendar</h1>
        <p>Convert KakaoTalk chat exports into calendar events</p>
      </header>

      <main className="app-main">
        <section className="upload-section">
          <h2>1. Upload Chat Files</h2>
          <div className="file-upload">
            <input
              type="file"
              id="file-input"
              accept=".txt"
              multiple
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <label htmlFor="file-input" className="upload-button">
              📁 Choose Files
            </label>
            <p className="upload-hint">Select KakaoTalk export .txt files</p>
          </div>

          {files.length > 0 && (
            <div className="file-list">
              <h3>Selected Files ({files.length})</h3>
              {files.map((file, index) => (
                <div key={index} className="file-item">
                  <span>{file.name}</span>
                  <button onClick={() => removeFile(index)} className="remove-button">✕</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="settings-section">
          <h2>2. Settings</h2>
          <div className="settings-grid">
            <div className="setting-item">
              <label htmlFor="cutoff">
                Cutoff Hour (messages before this hour belong to previous day)
              </label>
              <input
                type="number"
                id="cutoff"
                min="0"
                max="23"
                value={cutoffHour}
                onChange={(e) => setCutoffHour(Number(e.target.value))}
              />
              <span className="setting-hint">Default: 4 AM - Messages between midnight and this hour are assigned to the previous day</span>
            </div>
          </div>
        </section>

        <section className="actions-section">
          <h2>3. Process & Export</h2>
          <div className="actions">
            <button
              onClick={processFiles}
              disabled={files.length === 0 || processing}
              className="process-button"
            >
              {processing ? '⏳ Processing...' : '🔄 Process Files'}
            </button>

            {stats && (
              <div className="stats">
                <p><strong>{stats.count}</strong> events created</p>
                <p className="date-range">{stats.dateRange}</p>
              </div>
            )}

            {events.length > 0 && (
              <button onClick={exportToIcs} className="export-button">
                💾 Download Calendar (ICS)
              </button>
            )}
          </div>
        </section>

        {events.length > 0 && (
          <section className="preview-section">
            <h2>4. Preview</h2>
            <p className="preview-description">
              Each entry combines all messages from the same sender on the same day into one calendar event.
            </p>
            <div className="event-list">
              {events.slice(0, 50).map((event, index) => (
                <div key={index} className="event-item">
                  <div className="event-header">
                    <strong>{event.sender}</strong>
                    <span className="event-date">{event.displayDate}</span>
                  </div>
                  <div className="event-preview">
                    {event.messages.slice(0, 3).map((msg, idx) => (
                      <div key={idx} className="message-line">
                        • {msg.message.slice(0, 80)}{msg.message.length > 80 ? '...' : ''}
                      </div>
                    ))}
                    {event.messages.length > 3 && (
                      <div className="message-line more">
                        ... and {event.messages.length - 3} more messages
                      </div>
                    )}
                  </div>
                  <div className="event-meta">
                    Total: {event.messages.length} message{event.messages.length > 1 ? 's' : ''} combined
                  </div>
                </div>
              ))}
              {events.length > 50 && (
                <p className="preview-more">...and {events.length - 50} more events</p>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>
          After downloading, import the ICS file into Outlook, Google Calendar, or Apple Calendar
        </p>
      </footer>
    </div>
  )
}

export default App

