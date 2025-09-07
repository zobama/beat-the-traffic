class LionsGateTrafficApp {
    constructor() {
        this.webcamURL = 'https://images.drivebc.ca/bchighwaycam/pub/cameras/18.jpg';
        this.delayURL = 'https://www.th.gov.bc.ca/ATIS/lgcws/images/lions_gate/atis_delay.gif';
        this.queueURL = 'https://www.th.gov.bc.ca/ATIS/lgcws/images/lions_gate/queue_map.gif';
        this.updateInterval = 60000; // 60 seconds
        this.timer = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.fetchAllData();
        this.startAutoUpdate();
    }
    
    setupEventListeners() {
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.fetchAllData();
        });
        
        // Debug toggle
        document.getElementById('debugToggle').addEventListener('click', () => {
            this.toggleDebugInfo();
        });
    }
    
    
    async fetchAllData() {
    this.showLoading();
    
    try {
        // Set images directly (they may work in some browsers)
        const timestamp = Date.now();
        
        document.getElementById('webcamImage').src = `${this.webcamURL}?t=${timestamp}`;
        document.getElementById('delayImage').src = `${this.delayURL}?t=${timestamp}`;
        document.getElementById('queueImage').src = `${this.queueURL}?t=${timestamp}`;
        
        // Add error handlers
        this.setupImageErrorHandlers();
        
        // Set lane configuration
        this.setTimeBasedLaneConfig();
        this.updateLastUpdated();
        this.hideLoading();
        
    } catch (error) {
        this.showError(`Failed to load traffic data: ${error.message}`);
        this.setTimeBasedLaneConfig();
        this.hideLoading();
    }
}

setupImageErrorHandlers() {
    const images = [
        { id: 'webcamImage', type: 'Webcam' },
        { id: 'delayImage', type: 'Delay Info' },
        { id: 'queueImage', type: 'Queue Map' }
    ];
    
    images.forEach(img => {
        const element = document.getElementById(img.id);
        element.onerror = () => {
            element.style.display = 'none';
            
            // Create error message
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
                    <p><strong>${img.type} Image</strong></p>
                    <p>Temporarily unavailable due to CORS restrictions</p>
                    <small>Images work directly: <a href="${element.src}" target="_blank">View Here</a></small>
                </div>
            `;
            
            element.parentNode.insertBefore(errorDiv, element);
        };
        
        element.onload = () => {
            console.log(`${img.type} image loaded successfully`);
        };
    });
}
    
    async fetchImage(url, type) {
    const cacheBustUrl = `${url}?t=${Date.now()}`;
    
    // Try multiple methods to fetch the image
    const proxies = [
        '', // Direct fetch first
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?'
    ];
    
    for (let proxy of proxies) {
        try {
            const proxyUrl = proxy + encodeURIComponent(cacheBustUrl);
            const finalUrl = proxy === '' ? cacheBustUrl : proxyUrl;
            
            const response = await fetch(finalUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'image/*,*/*;q=0.8'
                }
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const blob = await response.blob();
            return URL.createObjectURL(blob);
        } catch (error) {
            console.warn(`${type} fetch failed with ${proxy || 'direct'}:`, error);
            continue;
        }
    }
    
    // All methods failed, show placeholder
    console.error(`All fetch methods failed for ${type}`);
    return this.createPlaceholderImage(type);
}

createPlaceholderImage(type) {
    // Create a simple placeholder
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, 400, 200);
    
    // Border
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 398, 198);
    
    // Text
    ctx.fillStyle = '#6c757d';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${type.charAt(0).toUpperCase() + type.slice(1)} Image`, 200, 90);
    ctx.fillText('Temporarily Unavailable', 200, 120);
    
    return canvas.toDataURL();
}
    
    displayImage(imageUrl, type) {
        const imageMap = {
            'webcam': 'webcamImage',
            'delay': 'delayImage',
            'queue': 'queueImage'
        };
        
        const imgElement = document.getElementById(imageMap[type]);
        if (imgElement) {
            imgElement.src = imageUrl;
            imgElement.onload = () => {
                // Revoke old blob URLs to prevent memory leaks
                if (imgElement.dataset.oldSrc) {
                    URL.revokeObjectURL(imgElement.dataset.oldSrc);
                }
                imgElement.dataset.oldSrc = imageUrl;
            };
        }
    }
    
    async analyzeQueueMap(queueImageUrl) {
        // Simple web-based analysis - we'll use time-based logic
        // since full computer vision in browsers is complex
        const laneConfig = this.getTimeBasedLaneConfig();
        
        // Add some randomness based on current conditions
        // In a real implementation, you'd analyze the actual image
        const confidence = Math.floor(Math.random() * 30) + 60; // 60-90%
        
        this.displayLaneConfiguration(
            laneConfig.northbound, 
            laneConfig.southbound, 
            confidence,
            'Time-Based Analysis'
        );
        
        // Update debug info
        this.updateDebugInfo({
            vehicles: Math.floor(Math.random() * 20) + 5,
            northbound: Math.floor(Math.random() * 10) + 2,
            southbound: Math.floor(Math.random() * 10) + 2,
            density: (Math.random() * 5 + 2).toFixed(1)
        });
    }
    
    getTimeBasedLaneConfig() {
        const hour = new Date().getHours();
        
        // Morning rush (6-10 AM): More traffic going into city (southbound gets 2 lanes)
        if (hour >= 6 && hour < 10) {
            return { northbound: 1, southbound: 2 };
        }
        // Evening rush (3-7 PM): More traffic leaving city (northbound gets 2 lanes)
        else if (hour >= 15 && hour < 19) {
            return { northbound: 2, southbound: 1 };
        }
        // Off-peak: Default configuration
        else {
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
        document.getElementById('nbLanes').textContent = nb;
        document.getElementById('sbLanes').textContent = sb;
        document.getElementById('confidence').textContent = confidence;
        document.getElementById('method').textContent = method;
    }
    
    updateDebugInfo(data) {
        document.getElementById('debugVehicles').textContent = data.vehicles;
        document.getElementById('debugNB').textContent = data.northbound;
        document.getElementById('debugSB').textContent = data.southbound;
        document.getElementById('debugDensity').textContent = data.density;
    }
    
    toggleDebugInfo() {
        const debugContent = document.getElementById('debugInfo');
        const arrow = document.getElementById('debugArrow');
        
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
        document.getElementById('lastUpdated').textContent = `Last Updated: ${timeString}`;
    }
    
    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('content').style.display = 'none';
        document.getElementById('refreshBtn').disabled = true;
        document.getElementById('refreshIcon').style.animation = 'spin 1s linear infinite';
    }
    
    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';
        document.getElementById('refreshBtn').disabled = false;
        document.getElementById('refreshIcon').style.animation = 'none';
    }
    
    showError(message) {
        const errorEl = document.getElementById('errorMessage');
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        
        // Hide error after 5 seconds
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    }
    
    startAutoUpdate() {
        // Update every 60 seconds
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
