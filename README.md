# Peek — installable photo comparison PWA

Compare near-identical photos at pixel level. Each frame keeps its own zoom and pan,
so switching frames changes only the thing you're judging.

**Live app:** [dnkextra.github.io/peek](https://dnkextra.github.io/peek/)

> This app was written by LLMs with minimal human code review.

## Files

| File | Job |
|---|---|
| `index.html` | The whole app — UI, canvas viewer, gestures, IndexedDB |
| `manifest.webmanifest` | Install metadata + Android share target |
| `sw.js` | Offline shell cache + receives photos from the share sheet |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | Launcher icons |

Keep all files in the same directory. Everything uses relative paths, so it works
from a subfolder (e.g. `username.github.io/peek/`).

## Running it

**Local test (installable, because localhost counts as secure):**

```bash
cd peek
python3 -m http.server 8000
```

Open `http://localhost:8000`. On a phone, port-forward over USB:
`chrome://inspect` → Port forwarding → 8000 → localhost:8000.

**Hosting:** any static HTTPS host — GitHub Pages, Netlify, Cloudflare Pages.
HTTPS is required for the service worker, which means it's required for
installing and for the share target.

**Installing:** Chrome on Android shows "Install app" in the ⋮ menu (or prompts
automatically). It then runs fullscreen with its own launcher icon.

## Using it

**Comparisons.** The home screen lists your comparisons — each is a set of photos of
the same subject. Tap **New comparison** to make one, the ⋮ on a card to rename or
delete it. Sharing photos to Peek from your gallery creates a new comparison.

**In a comparison**

- **Drag** to pan, **pinch** or scroll wheel to zoom, **double-tap** for 1:1 ⇄ fit.
- **Tap a thumbnail** to switch frames. Each thumbnail shows that frame's remembered crop.
- **Long-press a thumbnail** to rename or remove that photo.
- **Add** at the end of the rail (or ⋮ → Add photos) puts more photos in the set.
- **Match** copies the current crop to every frame for a strict same-pixels A/B.
- **Full screen** hides the bars. Tap the photo to hide the thumbnails as well;
  tap again to bring them back. The floating ⤡ button exits.
- **Arrow keys / number keys** switch frames on desktop; `f` toggles full screen.
- Rotating the device moves the rail to the right edge and keeps the crop.

State survives closing the app: photos, labels and view positions are in IndexedDB.

## About the labels

Frames are labelled by EXIF capture time (`10 Aug 14:03:22`), and aperture, shutter,
ISO and focal length are shown along the bottom of the viewport.

Filenames are not used, because the Android picker routes through Google Photos,
which reports a MediaStore id like `1000031199.jpg` rather than the name you see in
the app. That name lives in Google's database; no browser API can reach it. Peek
does check for an original name embedded in the file itself (XMP `PreservedFileName`,
`RawFileName`, `dc:title`, TIFF DocumentName) and uses that when present, and falls
back to a supplied filename when there is no EXIF date.

Long-press any thumbnail to see the supplied name, camera model and capture time
together, or to rename the frame.

## Known limits

- **No RAW.** Browsers can't decode `.ARW` / `.NEF` / `.CR3`. HEIC support varies by
  device. JPEG, PNG, WebP and AVIF work. Undecodable files are skipped with a message.
- **Memory.** Full-resolution bitmaps are kept for at most 3 frames at a time (LRU);
  others fall back to a 560px preview for a moment while they decode. With very large
  files on low-end devices, expect a brief "Decoding…" on first switch.
- **No folder re-open.** The File System Access API isn't on Android Chrome, so the
  app stores copies of the picked files rather than references to them.
- Sharing photos always creates a new comparison rather than adding to an existing one.
- EXIF is only read from JPEG. PNG and WebP frames fall back to numbered labels.

## If you want it in the Play Store

Wrap this same PWA with [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)
as a Trusted Web Activity. No rewrite, and it keeps updating from the web.
