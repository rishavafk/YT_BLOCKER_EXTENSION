## YT Focus Shield (Chrome Extension)

YT Focus Shield is a Chrome extension that helps you stay focused on YouTube by hiding recommendations, removing distracting UI elements, and blocking specific channels/keywords.

### Features

- Hide YouTube homepage recommendations (homepage feed)
- Remove the “Up Next” / related videos sidebar
- Hide end screen cards
- Block Shorts shelf and pause Shorts playback
- Add your own:
  - Blocked keywords (matches against video titles)
  - Blocked channels (matches against channel names)
- “Block current video’s channel” quick action (from the extension popup)
- Uses `chrome.storage.sync` so your settings sync across Chrome profiles (when sync is enabled)

### How to install (developer mode)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `yt-blocker` folder (this repo you downloaded)

### How to use

Open the extension popup from the toolbar:

- Toggle the main block switches:
  - `Homepage Recommendations`
  - `Sidebar "Up Next"`
  - `End Screen Cards`
  - `Shorts Autoplay`
- Add blocked items:
  - Use **Add** under **Blocked Keywords** to store keywords
  - Use **Add** under **Blocked Channels** to store channel names
- Click **Reset all** to clear toggles and lists back to defaults

### Privacy / permissions

The extension only operates on `youtube.com` pages and uses:

- `storage` + `chrome.storage.sync` for settings
- `activeTab` and `scripting` (used to interact with the currently open YouTube tab when you choose “Block current video’s channel”)

It does not include any authentication or external tracking logic.

### Notes / limitations

YouTube’s UI can change over time, and some selectors may need updates. If a toggle stops working, you may need to re-check the selectors in `content.js`.

### File structure

```text
yt-blocker/
  manifest.json
  background.js
  content.js
  content.css
  popup.html
  popup.js
  icons/
    icon16.png
    icon48.png
    icon128.png
```

