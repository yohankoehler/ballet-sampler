// Import WaveSurfer and Regions plugin using proper ES module syntax
import WaveSurfer from '/wavesurfer.js/dist/wavesurfer.esm.js';
import RegionsPlugin from '/wavesurfer.js/dist/plugins/regions.esm.js';

class KiteSampler {
    constructor() {
        this.wavesurfer = null;
        this.regions = null;
        this.currentAudio = null;
        this.currentPad = null;
        this.currentFileId = null; // Unique identifier for current file
        this.sampleData = {}; // Store sample data for each pad
        this.playingAudios = []; // Track currently playing audio elements
        this.playingTimeouts = []; // Track timeouts for stopping audio
        this.loopInterval = null; // Track loop interval
        this.loopConversionTimeout = null; // Track timeout for converting to loop mode
        this.currentLoopingPad = null; // Track which pad is looping
        this.currentPlayingPad = null; // Track which pad is currently playing (one-time)
        this.currentPlayingSample = null; // Track current sample data
        this.init();
    }

    init() {
        console.log('Initializing Kite Sampler...');
        this.bindEvents();
    }

    bindEvents() {
        // Load button click
        document.getElementById('loadButton').addEventListener('click', () => {
            console.log('Load button clicked');
            document.getElementById('audioFile').click();
        });

        // File selection
        document.getElementById('audioFile').addEventListener('change', (e) => {
            console.log('File selected:', e.target.files[0]);
            this.loadAudioFile(e.target.files[0]);
        });

        // Sample button interactions
        document.querySelectorAll('.sample-btn').forEach(btn => {
            let holdTimer = null;
            let isHolding = false;

            // Helper function to handle button action
            const handleButtonAction = (padNumber) => {
                if (this.currentAudio) {
                    if (this.sampleData[padNumber]) {
                        // If sample exists, play it
                        this.playSample(padNumber);
                    } else {
                        // If no sample, open modal to create one
                        this.openSampleModal(padNumber);
                    }
                } else {
                    alert('Please load an audio file first!');
                }
            };

            // Helper function to handle edit action
            const handleEditAction = (padNumber) => {
                if (this.currentAudio && this.sampleData[padNumber]) {
                    this.openSampleModal(padNumber);
                }
            };

            // Single click handler (desktop and mobile)
            btn.addEventListener('click', (e) => {
                // Ignore click if it was a hold gesture
                if (isHolding) {
                    isHolding = false;
                    return;
                }

                const padNumber = btn.dataset.pad;
                handleButtonAction(padNumber);
            });

            // Double-click to edit existing sample (desktop only)
            btn.addEventListener('dblclick', (e) => {
                e.preventDefault(); // Prevent text selection
                const padNumber = btn.dataset.pad;
                handleEditAction(padNumber);
            });

            // Touch start - begin hold timer (mobile)
            btn.addEventListener('touchstart', (e) => {
                const padNumber = btn.dataset.pad;

                // Only start hold timer if sample exists
                if (this.currentAudio && this.sampleData[padNumber]) {
                    holdTimer = setTimeout(() => {
                        isHolding = true;
                        // Add visual feedback for hold
                        btn.classList.add('holding');
                        // Vibrate if available
                        if (navigator.vibrate) {
                            navigator.vibrate(50);
                        }
                        handleEditAction(padNumber);
                    }, 500); // 500ms hold time
                }
            });

            // Touch end - handle tap or clear hold timer
            btn.addEventListener('touchend', (e) => {
                e.preventDefault(); // Prevent click event on mobile to avoid double-firing

                const padNumber = btn.dataset.pad;

                if (holdTimer) {
                    clearTimeout(holdTimer);
                    holdTimer = null;
                }
                btn.classList.remove('holding');

                // If we didn't trigger a hold, this was a quick tap
                if (!isHolding) {
                    // Handle the tap directly on mobile
                    handleButtonAction(padNumber);
                } else {
                    // Reset holding flag after hold action
                    setTimeout(() => {
                        isHolding = false;
                    }, 100);
                }
            });

            // Touch cancel - clear hold timer
            btn.addEventListener('touchcancel', (e) => {
                if (holdTimer) {
                    clearTimeout(holdTimer);
                    holdTimer = null;
                }
                btn.classList.remove('holding');
                isHolding = false;
            });
        });

        // Modal controls
        document.querySelector('.close-btn').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('playRegion').addEventListener('click', () => {
            this.playCurrentRegion();
        });

        document.getElementById('saveRegion').addEventListener('click', () => {
            this.saveCurrentRegion();
        });

        document.getElementById('clearRegion').addEventListener('click', () => {
            this.clearCurrentRegion();
        });

        // Close modal when clicking outside
        document.getElementById('waveformModal').addEventListener('click', (e) => {
            if (e.target.id === 'waveformModal') {
                this.closeModal();
            }
        });

        // Prevent scroll when modal is open on mobile
        document.getElementById('waveformModal').addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        // Loop mode toggle handler
        document.getElementById('loopMode').addEventListener('change', (e) => {
            this.handleLoopModeChange(e.target.checked);
        });

        // Stop button handler
        document.getElementById('stopButton').addEventListener('click', () => {
            this.stopAllSamples();
        });
    }

    // Generate unique identifier for a file
    generateFileId(file) {
        return `${file.name}_${file.size}_${file.lastModified}`;
    }

    // Save sample data to localStorage
    saveSampleData() {
        if (!this.currentFileId) return;

        try {
            // Convert file objects to null since they can't be serialized
            const dataToSave = {};
            Object.keys(this.sampleData).forEach(padNumber => {
                const sample = this.sampleData[padNumber];
                dataToSave[padNumber] = {
                    start: sample.start,
                    end: sample.end,
                    name: sample.name
                    // Don't save the file object - we'll reattach it when loading
                };
            });

            const storageKey = `kitesampler_${this.currentFileId}`;
            localStorage.setItem(storageKey, JSON.stringify({
                fileId: this.currentFileId,
                samples: dataToSave,
                savedAt: Date.now()
            }));

            console.log(`Saved sample data for file: ${this.currentFileId}`);
        } catch (error) {
            console.error('Error saving sample data:', error);
        }
    }

    // Load sample data from localStorage
    loadSampleData(fileId) {
        try {
            const storageKey = `kitesampler_${fileId}`;
            const savedData = localStorage.getItem(storageKey);

            if (savedData) {
                const parsedData = JSON.parse(savedData);
                console.log(`Found saved data for file: ${fileId}`);

                // Restore sample data and reattach current file
                Object.keys(parsedData.samples).forEach(padNumber => {
                    const savedSample = parsedData.samples[padNumber];
                    this.sampleData[padNumber] = {
                        start: savedSample.start,
                        end: savedSample.end,
                        name: savedSample.name,
                        file: this.currentAudio // Reattach the current file
                    };
                });

                this.updateSampleButtons();
                this.showFeedback(`Restored ${Object.keys(parsedData.samples).length} saved samples!`);
                return true;
            }
        } catch (error) {
            console.error('Error loading sample data:', error);
        }
        return false;
    }

    async loadAudioFile(file) {
        if (!file) return;

        try {
            this.currentAudio = file;
            this.currentFileId = this.generateFileId(file);

            // Display file name
            document.getElementById('fileName').textContent = `Loaded: ${file.name}`;

            // Clear existing samples first
            this.sampleData = {};
            this.updateSampleButtons();

            // Try to load saved data for this file
            const hadSavedData = this.loadSampleData(this.currentFileId);

            if (!hadSavedData) {
                console.log('No previous data found for this file');
            }

            console.log('Audio file loaded successfully');

        } catch (error) {
            console.error('Error loading audio file:', error);
            alert('Error loading audio file. Please try again.');
        }
    }

    openSampleModal(padNumber) {
        this.currentPad = padNumber;
        document.getElementById('currentPad').textContent = padNumber;
        document.getElementById('waveformModal').style.display = 'block';

        // Load existing sample name if it exists
        const existingSample = this.sampleData[padNumber];
        const nameInput = document.getElementById('sampleName');
        if (existingSample && existingSample.name) {
            nameInput.value = existingSample.name;
        } else {
            nameInput.value = '';
        }

        // Prevent body scroll on mobile
        document.body.style.overflow = 'hidden';

        this.initWavesurfer();
    }

    closeModal() {
        document.getElementById('waveformModal').style.display = 'none';
        document.body.style.overflow = 'auto';

        if (this.wavesurfer) {
            this.wavesurfer.destroy();
            this.wavesurfer = null;
            this.regions = null;
        }

        this.currentPad = null;
    }

    async initWavesurfer() {
        if (!this.currentAudio) return;

        try {
            console.log('Initializing WaveSurfer...');

            // Create regions plugin instance
            this.regions = RegionsPlugin.create({
                dragSelection: {
                    slop: 5
                }
            });

            // Create wavesurfer instance
            this.wavesurfer = WaveSurfer.create({
                container: '#waveform',
                waveColor: 'rgba(255, 255, 255, 0.6)',
                progressColor: 'rgba(255, 255, 255, 0.8)',
                cursorColor: '#fff',
                barWidth: 2,
                barRadius: 3,
                responsive: true,
                height: 100,
                normalize: true,
                plugins: [this.regions]
            });

            // Load audio file
            await this.wavesurfer.loadBlob(this.currentAudio);

            // Set up region events
            this.setupRegionEvents();

            // If there's an existing sample for this pad, load it
            if (this.sampleData[this.currentPad]) {
                const sample = this.sampleData[this.currentPad];
                this.regions.addRegion({
                    start: sample.start,
                    end: sample.end,
                    color: 'rgba(76, 175, 80, 0.3)',
                    drag: true,
                    resize: true
                });
                this.updateRegionInfo(sample.start, sample.end);
            } else {
                document.getElementById('regionTime').textContent = 'No region selected - drag on waveform to create';
            }

            console.log('WaveSurfer initialized successfully');

        } catch (error) {
            console.error('Error initializing wavesurfer:', error);
            alert('Error loading waveform. Please try again.');
        }
    }

    setupRegionEvents() {
        // Handle region creation
        this.regions.on('region-created', (region) => {
            // Remove other regions (only allow one per pad)
            const regions = this.regions.getRegions();
            regions.forEach(r => {
                if (r !== region) {
                    r.remove();
                }
            });

            this.updateRegionInfo(region.start, region.end);
        });

        // Handle region updates
        this.regions.on('region-updated', (region) => {
            this.updateRegionInfo(region.start, region.end);
        });

        // Enable drag selection
        this.regions.enableDragSelection({
            color: 'rgba(76, 175, 80, 0.3)'
        });
    }

    updateRegionInfo(start, end) {
        const duration = end - start;
        document.getElementById('regionTime').textContent =
            `Region: ${start.toFixed(2)}s - ${end.toFixed(2)}s (${duration.toFixed(2)}s)`;
    }

    playCurrentRegion() {
        // Stop all currently playing samples first
        this.stopAllSamples();

        const regions = this.regions?.getRegions();
        if (regions && regions.length > 0) {
            const region = regions[0];
            region.play();
        } else {
            // Play entire track if no region
            this.wavesurfer?.play();
        }
    }

    saveCurrentRegion() {
        const regions = this.regions?.getRegions();
        if (regions && regions.length > 0) {
            const region = regions[0];
            const sampleName = document.getElementById('sampleName').value.trim();

            // Save region data with name
            this.sampleData[this.currentPad] = {
                start: region.start,
                end: region.end,
                file: this.currentAudio,
                name: sampleName || `Sample ${this.currentPad}`
            };

            this.updateSampleButtons();
            this.closeModal();

            // Save to localStorage
            this.saveSampleData();

            // Show success feedback
            const displayName = sampleName || `Sample ${this.currentPad}`;
            this.showFeedback(`"${displayName}" saved to pad ${this.currentPad}!`);
        } else {
            alert('Please select a region first by dragging on the waveform.');
        }
    }

    clearCurrentRegion() {
        // Remove from sample data
        delete this.sampleData[this.currentPad];

        // Clear regions in wavesurfer
        const regions = this.regions?.getRegions();
        if (regions) {
            regions.forEach(region => region.remove());
        }

        this.updateSampleButtons();
        document.getElementById('regionTime').textContent = 'No region selected - drag on waveform to create';

        // Save to localStorage
        this.saveSampleData();

        this.showFeedback(`Sample cleared from pad ${this.currentPad}`);
    }

    stopAllSamples() {
        // Stop all currently playing audio elements
        this.playingAudios.forEach(audio => {
            if (audio && !audio.paused) {
                audio.pause();
                URL.revokeObjectURL(audio.src);
            }
        });

        // Clear all timeouts
        this.playingTimeouts.forEach(timeout => {
            clearTimeout(timeout);
        });

        // Stop any looping
        if (this.loopInterval) {
            clearInterval(this.loopInterval);
            this.loopInterval = null;
            this.currentLoopingPad = null;
        }

        // Clear any pending loop conversion
        if (this.loopConversionTimeout) {
            clearTimeout(this.loopConversionTimeout);
            this.loopConversionTimeout = null;
        }

        // Remove playing and looping classes from all buttons
        document.querySelectorAll('.sample-btn.playing').forEach(btn => {
            btn.classList.remove('playing', 'looping');
        });

        // Clear tracking variables
        this.currentPlayingPad = null;
        this.currentPlayingSample = null;

        // Clear arrays
        this.playingAudios = [];
        this.playingTimeouts = [];

        console.log('All samples stopped');
    }

    async playSample(padNumber) {
        const sample = this.sampleData[padNumber];
        if (!sample) return;

        try {
            // Stop all currently playing samples first
            this.stopAllSamples();

            console.log(`Playing sample from pad ${padNumber}`);

            // Check if loop mode is enabled
            const isLoopMode = document.getElementById('loopMode').checked;

            if (isLoopMode) {
                // Start looping
                this.startLoop(padNumber, sample);
            } else {
                // Play once
                this.playOnce(padNumber, sample);
            }

        } catch (error) {
            console.error('Error playing sample:', error);
        }
    }

    playOnce(padNumber, sample) {
        // Track currently playing sample for loop mode switching
        this.currentPlayingPad = padNumber;
        this.currentPlayingSample = sample;

        // Create a temporary audio element for playback
        const audio = new Audio();
        const url = URL.createObjectURL(sample.file);
        audio.src = url;

        // Add to tracking arrays
        this.playingAudios.push(audio);

        // Wait for audio to be ready and set current time
        audio.addEventListener('canplay', () => {
            audio.currentTime = sample.start;
            audio.play();
        }, { once: true });

        // Add visual feedback
        const btn = document.querySelector(`[data-pad="${padNumber}"]`);
        btn.classList.add('playing');

        // Stop at the end of the region
        const duration = (sample.end - sample.start) * 1000;
        const timeout = setTimeout(() => {
            audio.pause();
            btn.classList.remove('playing');
            URL.revokeObjectURL(url);

            // Clear current playing tracking
            this.currentPlayingPad = null;
            this.currentPlayingSample = null;

            // Remove from tracking arrays
            const audioIndex = this.playingAudios.indexOf(audio);
            if (audioIndex > -1) {
                this.playingAudios.splice(audioIndex, 1);
            }
            const timeoutIndex = this.playingTimeouts.indexOf(timeout);
            if (timeoutIndex > -1) {
                this.playingTimeouts.splice(timeoutIndex, 1);
            }
        }, duration);

        this.playingTimeouts.push(timeout);
    }

    startLoop(padNumber, sample) {
        this.currentLoopingPad = padNumber;
        const btn = document.querySelector(`[data-pad="${padNumber}"]`);

        // Add visual feedback for looping
        btn.classList.add('playing', 'looping');

        // Function to play the sample once
        const playLoopIteration = () => {
            const audio = new Audio();
            const url = URL.createObjectURL(sample.file);
            audio.src = url;

            // Add to tracking arrays
            this.playingAudios.push(audio);

            audio.addEventListener('canplay', () => {
                audio.currentTime = sample.start;
                audio.play();
            }, { once: true });

            // Clean up when finished
            const duration = (sample.end - sample.start) * 1000;
            setTimeout(() => {
                audio.pause();
                URL.revokeObjectURL(url);

                // Remove from tracking arrays
                const audioIndex = this.playingAudios.indexOf(audio);
                if (audioIndex > -1) {
                    this.playingAudios.splice(audioIndex, 1);
                }
            }, duration);
        };

        // Play immediately
        playLoopIteration();

        // Set up interval for continuous looping
        const loopDuration = (sample.end - sample.start) * 1000;
        this.loopInterval = setInterval(() => {
            // Only continue looping if loop mode is still on and this is still the current pad
            if (document.getElementById('loopMode').checked && this.currentLoopingPad === padNumber) {
                playLoopIteration();
            } else {
                // Stop looping if conditions changed
                clearInterval(this.loopInterval);
                this.loopInterval = null;
                this.currentLoopingPad = null;
                btn.classList.remove('playing', 'looping');
            }
        }, loopDuration);
    }

    convertToLoopMode(padNumber, sample) {
        // Update tracking variables to indicate we're now looping
        this.currentLoopingPad = padNumber;
        this.currentPlayingPad = null; // Clear one-time playing tracking
        this.currentPlayingSample = null;

        // Update visual feedback to show looping state
        const btn = document.querySelector(`[data-pad="${padNumber}"]`);
        btn.classList.add('looping');

        // Set up continuous looping starting immediately when current playback finishes
        const loopDuration = (sample.end - sample.start) * 1000;

        // Clear any existing loop interval
        if (this.loopInterval) {
            clearInterval(this.loopInterval);
        }

        // Function to play the sample once
        const playLoopIteration = () => {
            // Only continue if loop mode is still on and this is still the current pad
            if (document.getElementById('loopMode').checked && this.currentLoopingPad === padNumber) {
                const audio = new Audio();
                const url = URL.createObjectURL(sample.file);
                audio.src = url;

                // Add to tracking arrays
                this.playingAudios.push(audio);

                audio.addEventListener('canplay', () => {
                    audio.currentTime = sample.start;
                    audio.play();
                }, { once: true });

                // Clean up when finished
                setTimeout(() => {
                    audio.pause();
                    URL.revokeObjectURL(url);

                    // Remove from tracking arrays
                    const audioIndex = this.playingAudios.indexOf(audio);
                    if (audioIndex > -1) {
                        this.playingAudios.splice(audioIndex, 1);
                    }
                }, loopDuration);
            } else {
                // Stop looping if conditions changed
                clearInterval(this.loopInterval);
                this.loopInterval = null;
                this.currentLoopingPad = null;
                btn.classList.remove('playing', 'looping');
            }
        };

        // Start the first loop iteration immediately when current playback ends
        this.loopConversionTimeout = setTimeout(() => {
            playLoopIteration();

            // Then set up regular interval for subsequent iterations
            this.loopInterval = setInterval(playLoopIteration, loopDuration);

            // Clear the conversion timeout as it's no longer needed
            this.loopConversionTimeout = null;
        }, loopDuration);
    }

    handleLoopModeChange(isLoopMode) {
        if (isLoopMode) {
            // If loop mode is turned ON and there's a currently playing sample
            if (this.currentPlayingPad && this.currentPlayingSample) {
                console.log(`Converting pad ${this.currentPlayingPad} to loop mode`);

                // Convert the current one-time playback to loop mode
                // Don't stop the current audio, just set up looping for when it finishes
                this.convertToLoopMode(this.currentPlayingPad, this.currentPlayingSample);
            }
        } else {
            // If loop mode is turned OFF, just stop the loop timers and remove animation
            // Do NOT restart the sample - let it continue playing as one-time

            const btn = document.querySelector(`[data-pad="${this.currentLoopingPad}"]`);

            // Clear loop interval if it exists
            if (this.loopInterval) {
                clearInterval(this.loopInterval);
                this.loopInterval = null;
            }

            // Clear loop conversion timeout if it exists
            if (this.loopConversionTimeout) {
                clearTimeout(this.loopConversionTimeout);
                this.loopConversionTimeout = null;
            }

            // Remove loop animation and set to regular playing state
            if (btn && this.currentLoopingPad) {
                btn.classList.remove('looping');
                // Keep 'playing' class since the sample is still playing
            }

            // Clear loop tracking
            this.currentLoopingPad = null;

            console.log('Loop mode turned off - sample continues playing once');
        }
    }

    updateSampleButtons() {
        document.querySelectorAll('.sample-btn').forEach(btn => {
            const padNumber = btn.dataset.pad;
            const sampleNameDiv = btn.querySelector('.sample-name');

            if (this.sampleData[padNumber]) {
                btn.classList.add('has-sample');
                sampleNameDiv.textContent = this.sampleData[padNumber].name;
            } else {
                btn.classList.remove('has-sample');
                sampleNameDiv.textContent = '';
            }
        });
    }

    showFeedback(message) {
        // Create temporary feedback element
        const feedback = document.createElement('div');
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(76, 175, 80, 0.9);
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            z-index: 1001;
            font-size: 0.9rem;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        `;

        document.body.appendChild(feedback);

        // Remove after 2 seconds
        setTimeout(() => {
            if (document.body.contains(feedback)) {
                document.body.removeChild(feedback);
            }
        }, 2000);
    }
}

// Initialize the sampler when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Kite Sampler...');
    window.kiteSampler = new KiteSampler();
});

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Check if user is typing in an input field
    const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true';

    // Get the sampler instance (we need to store it globally)
    const sampler = window.kiteSampler;

    // Number keys 1-9 for quick pad access (only when not typing)
    if (e.key >= '1' && e.key <= '9' && !isTyping) {
        const padNumber = e.key;
        const btn = document.querySelector(`[data-pad="${padNumber}"]`);
        if (btn) {
            btn.click();
        }
    }

    // Spacebar to stop all samples (only when not typing)
    if (e.key === ' ' && sampler && !isTyping) {
        e.preventDefault(); // Prevent page scroll
        sampler.stopAllSamples();
    }

    // Escape to close modal (works even when typing)
    if (e.key === 'Escape') {
        const modal = document.getElementById('waveformModal');
        if (modal.style.display === 'block') {
            document.querySelector('.close-btn').click();
        }
    }
});

// Prevent zoom on double tap for iOS
let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);

console.log('Kite Sampler script loaded with ES modules');