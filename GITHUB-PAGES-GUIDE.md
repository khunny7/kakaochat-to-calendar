# GitHub Pages Deployment Guide

## Part 1: Generate Icons ✅

1. The icon generator should have opened in your browser
2. Click "🚀 Generate All Icons" button
3. Download each icon:
   - `pwa-192x192.png`
   - `pwa-512x512.png`
   - `apple-touch-icon.png`
   - `favicon-32x32.png`
4. Save all PNG files to `web/public/` folder (replacing the SVG files)

## Part 2: Update Icon References

After downloading the icons, we need to update the manifest to use PNG instead of SVG.

## Part 3: Enable GitHub Pages

1. Go to your repository: https://github.com/khunny7/kakaochat-to-calendar
2. Click **Settings** tab
3. In the left sidebar, click **Pages**
4. Under "Build and deployment":
   - Source: Select **GitHub Actions**
5. That's it! GitHub Actions is already configured.

## Part 4: Push Changes

After generating and saving the icons:

```powershell
# Stage changes
git add .

# Commit
git commit -m "Add GitHub Pages deployment and proper PWA icons"

# Push
git push origin main
```

## Part 5: Wait for Deployment

1. Go to the **Actions** tab in your GitHub repo
2. Watch the deployment workflow run
3. Once complete (green checkmark), your app will be live at:
   **https://khunny7.github.io/kakaochat-to-calendar/**

## Testing

After deployment:
1. Visit the URL
2. Test uploading KakaoTalk files
3. Verify the app works correctly
4. Check that icons appear properly
5. Try installing as PWA (browser should show install prompt)

## Troubleshooting

If the deployment fails:
- Check the Actions tab for error logs
- Ensure all icons are in `web/public/` folder
- Verify `package-lock.json` exists in `web/` folder

## Next: Windows Store

Once deployed and tested on GitHub Pages, you can:
1. Go to https://www.pwabuilder.com/
2. Enter: `https://khunny7.github.io/kakaochat-to-calendar/`
3. Generate Windows MSIX package
4. Submit to Microsoft Store
