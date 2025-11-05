# Icon Placeholders

The current icons are SVG placeholders. For production, you should create proper PNG icons:

## Required Icons

- `pwa-192x192.png` - 192x192 pixels
- `pwa-512x512.png` - 512x512 pixels
- `apple-touch-icon.png` - 180x180 pixels
- `favicon.ico` - 32x32 pixels

## How to Create Icons

### Option 1: Online Tools
- Use [Favicon Generator](https://realfavicongenerator.net/)
- Upload a high-res logo (1024x1024 recommended)
- Download all generated sizes

### Option 2: Design Tools
- Create in Figma/Photoshop/GIMP
- Export at required sizes
- Optimize with [TinyPNG](https://tinypng.com/)

### Option 3: Convert SVG to PNG
```bash
# Using ImageMagick
convert pwa-512x512.svg -resize 512x512 pwa-512x512.png
convert pwa-512x512.svg -resize 192x192 pwa-192x192.png
convert pwa-512x512.svg -resize 180x180 apple-touch-icon.png
```

## Design Guidelines

- **Background**: Yellow (#FAE100 - KakaoTalk brand color)
- **Foreground**: Black or dark gray for contrast
- **Symbol**: Letter "K" or calendar icon
- **Style**: Simple, recognizable at small sizes
- **Format**: PNG with transparency (if needed)

## Testing

After creating icons, test them:
1. Run `npm run build`
2. Run `npm run preview`
3. Open DevTools > Application > Manifest
4. Verify all icons load correctly
