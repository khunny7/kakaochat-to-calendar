# Kakao Chat to Calendar - PWA

A Progressive Web App that converts KakaoTalk chat exports into calendar events (ICS format) for import into Outlook, Google Calendar, Apple Calendar, and more.

## Features

✅ **No Installation Required** - Run directly in your browser
✅ **Offline Support** - Works without an internet connection
✅ **Privacy First** - All processing happens in your browser, no data uploaded
✅ **Windows Store Ready** - Can be packaged for Microsoft Store distribution
✅ **Cross-Platform** - Works on Windows, Mac, iOS, Android

## Development

### Prerequisites

- Node.js 18 or newer
- npm

### Getting Started

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at `http://localhost:5173`

## Usage

1. **Upload Chat Files**: Select one or more KakaoTalk export `.txt` files
2. **Configure Settings**: Adjust cutoff hour and duration as needed
3. **Process**: Click "Process Files" to parse and group messages
4. **Export**: Download the generated ICS calendar file
5. **Import**: Import the ICS file into your calendar app

### Settings

- **Cutoff Hour**: Messages before this hour are assigned to the previous day (default: 4 AM)
- **Duration**: Metadata value stored in calendar events (default: 30 minutes)

## Publishing to Microsoft Store

### Option 1: Using PWABuilder (Recommended)

1. Build and deploy your app to a public URL (Vercel, Netlify, GitHub Pages, etc.)
2. Visit [PWABuilder.com](https://www.pwabuilder.com/)
3. Enter your deployed URL
4. Click "Generate" to create a Windows MSIX package
5. Download the package and submit to Microsoft Store

### Option 2: Manual Packaging

1. Build the app: `npm run build`
2. Use tools like `@pwabuilder/cli` to create MSIX package
3. Submit to Microsoft Store Partner Center

## Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### Deploy to Netlify

1. Connect your repository to Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`

### Deploy to GitHub Pages

```bash
# Update vite.config.ts with base: '/your-repo-name/'
# Build
npm run build

# Deploy dist folder to gh-pages branch
```

## PWA Features

- ✅ Service Worker for offline support
- ✅ Web App Manifest
- ✅ Installable on desktop and mobile
- ✅ App icons (need to be created - see TODO)
- ✅ Auto-updates

## Technical Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite 7** - Build tool
- **vite-plugin-pwa** - PWA support
- **Workbox** - Service worker management

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## TODO

- [ ] Create proper app icons (192x192, 512x512) - currently using placeholders
- [ ] Add screenshots for PWA manifest
- [ ] Test offline functionality
- [ ] Add deduplication state persistence
- [ ] Add more detailed preview with message content
- [ ] Support for filtering by sender or date range

## License

MIT

