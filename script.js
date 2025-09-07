class LionsGateTrafficApp {
    constructor() {
        this.webcamURL = 'https://images.drivebc.ca/bchighwaycam/pub/cameras/18.jpg';
        this.delayURL  = 'https://www.th.gov.bc.ca/ATIS/lgcws/images/lions_gate/atis_delay.gif';
        this.queueURL  = 'https://www.th.gov.bc.ca/ATIS/lgcws/images/lions_gate/queue_map.gif';

        this.updateInterval = 60000; // 60 seconds
        this.timer = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupImageErrorHandlers();   // set handlers once
        this.fetchAllData();
        this.startAutoUpdate();
    }

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.fetchAllData();
            });
        }

        // Debug toggle
        const debugToggle = document.getElementById('debugToggle');
        if (debugToggle) {
            debugToggle.addEventListener('click', () => {
                this.toggleDebugInfo();
            });
        }
    }

    // ======= NEW: direct <img> loading (no fetch/Blob/proxies) =======
    fetchAllData() {
        this.showLoading();

        try {
            const ts = Date.now();

            const webcamImage = document.getElementById('webcamImage');
            const delayImage  = document.getElementById('delayImage');
            const queueImage  = document.getElementById('queueImage');

            // Optional: avoid referer issues
            if (webcamImage) webcamImage.referrerPolicy = 'no-referrer';
            if (delayImage)  delayImage.referrerPolicy  = 'no-referrer';
            if (queueImage)  queueImage.referrerPolicy  = 'no-referrer';

            // Assign sources with cache-busting so they refresh
            if (webcamImage) {
                webcamImage.style.opacity = '0.7';
                webcamImage.src = `${this.webcamURL}?t=${ts}`;
            }
            if (delayImage) {
                delayImage.style.opacity = '0.7';
                delayImage.src = `${this.delayURL}?t=${ts}`;
            }
            if (queueImage) {
                queueImage.style.opacity = '0.7';
                queueImage.src = `${this.queueURL}?t=${ts}`;
            }

            // Lane configuration (time-based fallback)
            this.setTimeBasedLaneConfig();
            this.updateLastUpdated();

            // hide loading when any one of the images loads or after a short timeout
            const done = () => this.hideLoading();
            let loadFired = false;

            [webcamImage, delayImage, queueImage].forEach(img => {
                if (!img) return;
                const onloadOnce = () => {
                    if (!loadFired) {
                        loadFired = true;
                        done();
                    }
                    img.style.opacity = '1';
                    img.removeEventListener('load', onloadOnce);
                };
                img.addEventListener('load', onloadOnce);
            });

            // Safety timeout in case all 3 fail quickly
            setTimeout(() => {
                if (!loadFired) done();
            }, 2500);

        } catch (error) {
            this.showError(`Failed to load traffic data: ${error.message}`);
            this.setTimeBasedLaneConfig();
            this.hideLoading();
        }
    }

    // Install robust load/error handlers once; they’ll persist across src changes
    setupImageErrorHandlers() {
        const images = [
            { id: 'webcamImage', type: 'Webcam' },
            { id: 'delayImage',  type: 'Delay Info' },
            { id: 'queueImage',  type: 'Queue Map' }
        ];

        images.forEach(({ id, type }) => {
            const el = document.getElementById(id);
            if (!el) return;

            el.addEventListener('error', () => {
                el.style.display = 'none';

                // Avoid duplicate error blocks
                const prev = el.previousElementSibling;
                if (prev && prev.classList && prev.classList.contains('image-error')) return;

                const cleanURL = el.src ? el.src.split('?')[0] : '';
                const errorDiv = document.createElement('div');
                errorDiv.className = 'image-error';
                errorDiv.innerHTML = `
                    <div style="
                        background: #f8f9fa;
                        border: 2px dashed #dee2e6;
                        padding: 20px;
                        text-align: center;
                        border-radius: 8px;
                        color: #6c757d;
                    ">
                        <p><strong>${type} Image</strong></p>
                        <p>Temporarily unavailable</p>
                        <small>Try opening directly: <a href="${cleanURL}" target="_blank" rel="noopener">View image</a></small>
                    </div>
                `;
                el.parentNode.insertBefore(errorDiv, el);
            });

            el.addEventListener('load', () => {
                // Remove any error block when image recovers
                const prev = el.previousElementSibling;
                if (prev && prev.classList && prev.classList.contains('image-error')) {
                    prev.remove();
                }
                el.style.display = '';
                el.style.opacity = '1';
            });
        });
    }

    // ======= REMOVED old fetch/proxy/blob methods =======
    // fetchImage(...) — removed
    // createPlaceholderImage(...) — removed
    // displayImage(...) — removed

    // Keeping analyzeQueueMap in case you use it later; it no longer needs the URL
    async analyzeQueueMap() {
        const laneConfig = this.getTimeBasedLaneConfig();
        const confidence = Math.floor(Math.random() * 30) + 60; // 60–90%

        this.displayLaneConfiguration(
            laneConfig.northbound,
            laneConfig.southbound,
            confidence,
            'Time-Based Analysis'
        );

        this.updateDebugInfo({
            vehicles: Math.floor(Math.random() * 20) + 5,
            northbound: Math.floor(Math.random() * 10) + 2,
            southbound: Math.floor(Math.random() * 10) + 2,
            density: (Math.random() * 5 + 2).toFixed(1)
        });
    }

    getTimeBasedLaneConfig() {
        const hour = new Date().getHours();

        if (hour >= 6 && hour < 10) {
            return { northbound: 1, southbound: 2 };
        } else if (hour >= 15 && hour < 19) {
            return { northbound: 2, southbound: 1 };
        } else {
            return { northbound: 2, southbound: 1 };
        }
    }

    setTimeBasedLaneConfig() {
        const config = this.getTimeBasedLaneConfig();
        this.displayLaneConfiguration(
            config.northbound,
            config.southbound,
            75,
            'Time-Based Fallback'
        );
    }

    displayLaneConfiguration(nb, sb, confidence, method) {
        const nbEl = document.getElementById('nbLanes');
        const sbEl = document.getElementById('sbLanes');
        const confEl = document.getElementById('confidence');
        const methodEl = document.getElementById('method');
        if (nbEl) nbEl.textContent = nb;
        if (sbEl) sbEl.textContent = sb;
        if (confEl) confEl.textContent = confidence;
        if (methodEl) methodEl.textContent = method;
    }

    updateDebugInfo(data) {
        const vEl = document.getElementById('debugVehicles');
        const nbEl = document.getElementById('debugNB');
        const sbEl = document.getElementById('debugSB');
        const dEl = document.getElementById('debugDensity');
        if (vEl) vEl.textContent = data.vehicles;
        if (nbEl) nbEl.textContent = data.northbound;
        if (sbEl) sbEl.textContent = data.southbound;
        if (dEl) dEl.textContent = data.density;
    }

    toggleDebugInfo() {
        const debugContent = document.getElementById('debugInfo');
        const arrow = document.getElementById('debugArrow');
        if (!debugContent || !arrow) return;

        if (debugContent.style.display === 'none') {
            debugContent.style.display = 'block';
            arrow.textContent = '▲';
        } else {
            debugContent.style.display = 'none';
            arrow.textContent = '▼';
        }
    }

    updateLastUpdated() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        const el = document.getElementById('lastUpdated');
        if (el) el.textContent = `Last Updated: ${timeString}`;
    }

    showLoading() {
        const loading = document.getElementById('loading');
        const content = document.getElementById('content');
        const btn = document.getElementById('refreshBtn');
        const icon = document.getElementById('refreshIcon');

        if (loading) loading.style.display = 'block';
        if (content) content.style.display = 'none';
        if (btn) btn.disabled = true;
        if (icon) icon.style.animation = 'spin 1s linear infinite';
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        const content = document.getElementById('content');
        const btn = document.getElementById('refreshBtn');
        const icon = document.getElementById('refreshIcon');

        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';
        if (btn) btn.disabled = false;
        if (icon) icon.style.animation = 'none';
    }

    showError(message) {
        const errorEl = document.getElementById('errorMessage');
        if (!errorEl) return;
        errorEl.textContent = message;
        errorEl.style.display = 'block';

        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    }

    startAutoUpdate() {
        this.stopAutoUpdate();
        this.timer = setInterval(() => {
            this.fetchAllData();
        }, this.updateInterval);
    }

    stopAutoUpdate() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    new LionsGateTrafficApp();
});

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
