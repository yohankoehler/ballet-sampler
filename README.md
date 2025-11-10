# 🪁 Kite Sampler

A web-based music sampler that allows you to load audio files and assign specific parts of the song to playback buttons.

## Features

- **Load Music Files**: Support for various audio formats (MP3, WAV, OGG, etc.)
- **9-Pad Grid**: 3x3 grid of sample buttons for easy access
- **Visual Waveform**: Integrated wavesurfer.js for precise sample selection
- **Draggable Regions**: Select, resize and move sample regions with mouse/touch
- **Loop Mode**: Toggle continuous looping of samples
- **Mobile Responsive**: Optimized for both desktop and mobile devices
- **Keyboard Shortcuts**: Use number keys 1-9 to trigger pads

## How to Use

1. **Load a Music File**: Click the "📁 Load Music File" button and select an audio file
2. **Create/Edit Samples**: Click any numbered pad (1-9) to open the waveform editor
3. **Name Your Sample**: Enter a custom name in the text field
4. **Select Region**: Drag on the waveform to select the part you want to sample
5. **Save Sample**: Click "💾 Save Region" to assign it to the pad
6. **Play Samples**: Click pad buttons or use keyboard numbers (1-9) to play samples

## Controls

### Main Interface
- **Load Button**: Opens file picker to load audio files
- **Loop Toggle**: Enable/disable continuous looping of samples
- **Numbered Pads (1-9)**:
  - **Single Click**: Play sample (if exists) or create new sample (if empty)
  - **Double Click**: Edit existing sample (desktop)
  - **Hold/Long Press**: Edit existing sample (mobile - 500ms)

### Waveform Editor
- **Drag on Waveform**: Create a sample region
- **▶️ Play Region**: Preview the selected region
- **💾 Save Region**: Save the region to the current pad
- **🗑️ Clear**: Remove the sample from the pad
- **×**: Close the editor

### Keyboard Shortcuts
- **1-9**: Trigger corresponding pad (disabled when typing)
- **Spacebar**: Stop all currently playing samples (disabled when typing)
- **Escape**: Close waveform editor

**Note**: Keyboard shortcuts are automatically disabled when typing in input fields, so you can use spaces normally in sample names.

## Technical Details

- Built with vanilla JavaScript (no frameworks required)
- Uses wavesurfer.js v7 for audio visualization
- Responsive CSS Grid layout
- WebAudio API for audio processing
- Works offline once loaded

## Browser Compatibility

- Chrome/Edge 88+
- Firefox 84+
- Safari 14+
- Mobile browsers with WebAudio support

## Installation & Setup

This project requires Node.js to run locally to avoid CORS issues.

### Prerequisites
- Node.js 14.0.0 or higher
- npm (comes with Node.js)

### Installation
```bash
# Install dependencies
npm install
```

### Running the App
```bash
# Start the development server
npm start
# or
npm run dev
```

The app will be available at `http://localhost:3000`

### Project Structure
```
kitesampler/
├── package.json          # Dependencies and scripts
├── server.js             # Express server for development
├── index.html            # Main HTML file
├── styles.css            # Responsive CSS styles
├── script.js             # Main application logic
├── README.md             # This file
└── node_modules/         # Dependencies (auto-generated)
    └── wavesurfer.js/    # Local wavesurfer installation
```

## Mobile Usage Tips

- Use landscape orientation for better waveform visibility
- Tap and drag to create regions on the waveform
- Pinch to zoom is disabled to prevent accidental zooming
- Optimized touch targets for finger navigation

Enjoy creating beats and samples! 🎵