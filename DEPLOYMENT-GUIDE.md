# Deployment Guide for Windows Store

This guide will help you deploy the Kakao Chat to Calendar PWA to the Microsoft Store.

## Prerequisites

- Microsoft Developer Account ($19 one-time fee)
- A public URL where your PWA is hosted
- App icons in PNG format (see web/public/ICONS-README.md)

## Step 1: Build the App

```powershell
cd web
npm run build
```

This creates a `dist` folder with your production-ready app.

## Step 2: Deploy to a Public URL

Choose one of these hosting options:

### Option A: Vercel (Recommended - Free)

```powershell
# Install Vercel CLI
npm install -g vercel

# Deploy
cd web
vercel

# Follow prompts and get your URL
```

### Option B: Netlify (Free)

1. Sign up at [netlify.com](https://netlify.com)
2. Connect your GitHub repository
3. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Deploy and get your URL

### Option C: GitHub Pages (Free)

1. Update `vite.config.ts`:
```typescript
export default defineConfig({
  base: '/kakao-chat-to-calendar/', // Your repo name
  plugins: [...]
})
```

2. Build and deploy:
```powershell
npm run build

# Push dist folder to gh-pages branch
# Or use gh-pages package:
npm install -g gh-pages
gh-pages -d dist
```

Your URL will be: `https://yourusername.github.io/kakao-chat-to-calendar/`

## Step 3: Create Proper Icons

Before publishing, replace the SVG placeholders with PNG icons:

1. Create these files in `web/public/`:
   - `pwa-192x192.png`
   - `pwa-512x512.png`
   - `apple-touch-icon.png`
   - `favicon.ico`

2. Update `vite.config.ts` to reference PNG files:
```typescript
icons: [
  {
    src: 'pwa-192x192.png',
    sizes: '192x192',
    type: 'image/png'
  },
  {
    src: 'pwa-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any maskable'
  }
]
```

3. Rebuild and redeploy

## Step 4: Package for Windows Store using PWABuilder

1. Go to [PWABuilder.com](https://www.pwabuilder.com/)

2. Enter your deployed URL (e.g., `https://your-app.vercel.app`)

3. Click **"Start"** to analyze your PWA

4. Review the scores:
   - **Manifest**: Should be green
   - **Service Worker**: Should be green
   - **Security**: Must be HTTPS (automatic with hosting providers)

5. Fix any issues if needed

6. Click **"Package For Stores"**

7. Select **"Windows"** platform

8. Configure Windows package:
   - **Package ID**: com.yourname.kakaocalendar
   - **Publisher Name**: Your name or company
   - **App Name**: Kakao Chat to Calendar
   - **Version**: 1.0.0

9. Click **"Generate"** and download the MSIX package

## Step 5: Submit to Microsoft Store

1. Go to [Microsoft Partner Center](https://partner.microsoft.com/dashboard)

2. Create a new app:
   - Click **"New Product"** > **"App"**
   - Reserve app name: "Kakao Chat to Calendar"

3. Upload your MSIX package:
   - Go to **"Packages"**
   - Upload the MSIX file from PWABuilder

4. Fill in app details:
   - **Description**: Copy from README
   - **Screenshots**: Take screenshots of the app (at least 1)
   - **Category**: Productivity
   - **Age Rating**: Everyone
   - **Privacy Policy**: Required (create a simple one)

5. Submit for certification

6. Wait for review (usually 1-3 days)

## Step 6: Post-Submission

After approval:

- **Updates**: Just redeploy to your URL, PWA auto-updates
- **Analytics**: Add Google Analytics or similar
- **User Feedback**: Monitor Store reviews

## Testing Before Submission

### Test PWA Installation

1. Open your deployed URL in Edge or Chrome
2. Click the install button in the address bar
3. Verify the app installs and works offline
4. Test all functionality

### Test MSIX Package Locally

1. Double-click the MSIX file
2. Install on your Windows machine
3. Test the app thoroughly
4. Uninstall before submitting

## Troubleshooting

### PWABuilder Shows Errors

- **No Service Worker**: Check that `vite-plugin-pwa` is configured
- **No Manifest**: Ensure manifest is generated in build
- **Icons Missing**: Add PNG icons as described above

### App Won't Install

- **Not HTTPS**: Must use secure hosting
- **Manifest Invalid**: Validate with Chrome DevTools > Application > Manifest

### Store Rejection

Common reasons:
- Missing privacy policy
- Inappropriate content (not applicable for this app)
- Technical issues with MSIX

## Privacy Policy Template

Create a simple privacy policy (required by Microsoft Store):

```markdown
# Privacy Policy for Kakao Chat to Calendar

Last updated: [Date]

## Data Collection
This app does not collect, store, or transmit any personal data. All file processing happens locally in your browser.

## Third-Party Services
This app does not use any third-party services or analytics.

## Contact
For questions, contact: [your-email@example.com]
```

Host this at your-url.com/privacy or create a GitHub Gist.

## Additional Resources

- [PWABuilder Documentation](https://docs.pwabuilder.com/)
- [Microsoft Store Policies](https://docs.microsoft.com/en-us/windows/uwp/publish/store-policies)
- [Web App Manifest Spec](https://www.w3.org/TR/appmanifest/)

## Estimated Timeline

- Building & deploying: 30 minutes
- Creating icons: 1-2 hours
- PWABuilder packaging: 15 minutes
- Store submission: 30 minutes
- Microsoft review: 1-3 days

**Total**: 1-3 days from start to published

## Next Steps

1. ✅ You've built the app
2. [ ] Deploy to Vercel/Netlify
3. [ ] Create proper PNG icons
4. [ ] Test PWA installation
5. [ ] Use PWABuilder to create MSIX
6. [ ] Submit to Microsoft Store
7. [ ] Wait for approval
8. [ ] Celebrate! 🎉
