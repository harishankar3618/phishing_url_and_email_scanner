// popup.js - Interactive UI with stats
document.addEventListener("DOMContentLoaded", () => {
    updateStatus();
    setupListeners();
});

// Listen for status changes
chrome.storage.onChanged.addListener((changes) => {
    if (changes.scanStatus || changes.phishingStatus) {
        updateStatus();
        // Update stats when scan completes
        if ((changes.scanStatus && changes.scanStatus.oldValue === "scanning" && 
             changes.scanStatus.newValue !== "scanning") ||
            (changes.phishingStatus && changes.phishingStatus.oldValue === "scanning" && 
             changes.phishingStatus.newValue !== "scanning")) {
            }
        }
    }
);

function updateStatus() {
    chrome.storage.local.get(["scanStatus", "phishingStatus"], (data) => {
        let statusIcon = document.getElementById("statusIcon");
        let statusText = document.getElementById("statusText");
        let detailsContainer = document.getElementById("detailsContainer");
        let detailsText = document.getElementById("detailsText");
        let pulseElement = document.getElementById("scanningPulse");
        
        // Reset all status classes
        document.body.classList.remove("status-safe", "status-danger", "status-scanning", "status-error");
        detailsContainer.classList.remove("visible");
        
        if (data.phishingStatus) {
            // Email scanning mode
            if (data.phishingStatus.includes("Scanning")) {
                setStatus("scanning", "📧 Scanning email content...", "../icons/scanning.png");
                detailsText.textContent = "Analyzing email for phishing indicators...";
            } else if (data.phishingStatus.includes("Safe")) {
                setStatus("safe", "✅ Email appears safe!", "../icons/icon.png");
                
                // Extract score if available
                const scoreMatch = data.phishingStatus.match(/\(Score: (\d+)\)/);
                if (scoreMatch) {
                    detailsText.textContent = `Email phishing score: ${scoreMatch[1]}/10`;
                } else {
                    detailsText.textContent = "No suspicious content detected in this email.";
                }
            } else {
                setStatus("danger", "⚠️ Phishing email detected!", "../icons/danger.png");
                
                // Extract indicators if available
                if (data.phishingStatus.includes("(")) {
                    detailsText.textContent = data.phishingStatus;
                } else {
                    detailsText.textContent = "This email contains suspicious elements commonly used in phishing attempts.";
                }
            }
        } else {
            // URL scanning mode
            if (!data.scanStatus || data.scanStatus === "scanning") {
                setStatus("scanning", "🔄 Scanning website...", "../icons/scanning.png");
                detailsText.textContent = "Checking this URL against VirusTotal's database of known threats...";
            } else if (data.scanStatus === "safe") {
                setStatus("safe", "✅ Website appears safe!", "../icons/icon.png");
                detailsText.textContent = "No malicious content detected on this website.";
            } else if (data.scanStatus === "malicious") {
                setStatus("danger", "⚠️ Dangerous website detected!", "../icons/danger.png");
                detailsText.textContent = "This website has been flagged as potentially dangerous. Exercise caution.";
            } else {
                setStatus("error", "⚙️ Scan error", "../icons/error.png");
                detailsText.textContent = "Unable to complete security scan. Please try again.";
            }
        }
        
        // Helper function to set status
        function setStatus(statusClass, message, iconPath) {
            document.body.classList.add(`status-${statusClass}`);
            statusText.textContent = message;
            statusIcon.src = iconPath;
            
            // Show pulse animation for scanning
            if (statusClass === "scanning") {
                pulseElement.style.backgroundColor = "rgba(33, 150, 243, 0.2)";
                pulseElement.style.animation = "pulse 1.5s infinite";
            } else {
                pulseElement.style.animation = "none";
            }
            
            // Show details for all states
            detailsContainer.classList.add("visible");
            
            // Add appropriate icon colors
            if (statusClass === "danger") {
                pulseElement.style.backgroundColor = "rgba(231, 76, 60, 0.1)";
            } else if (statusClass === "safe") {
                pulseElement.style.backgroundColor = "rgba(39, 174, 96, 0.1)";
            }
        }
    });
}

function setupListeners() {
    // Rescan button event
    document.getElementById("rescanButton").addEventListener("click", () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                // Tell background script to rescan
                chrome.runtime.sendMessage({
                    action: "rescan",
                    tabId: tabs[0].id,
                    url: tabs[0].url
                });
                
                // Update UI to scanning state
                document.getElementById("statusIcon").src = "../icons/scanning.png";
                document.getElementById("statusText").textContent = "🔄 Rescanning...";
                document.body.classList.remove("status-safe", "status-danger", "status-error");
                document.body.classList.add("status-scanning");
                
                // Animate scanning state
                document.getElementById("scanningPulse").style.animation = "pulse 1.5s infinite";
            }
        });
    });
    
    // Settings button event - for future implementation
    document.getElementById("settingsButton").addEventListener("click", () => {
        // Could open options page in the future
        document.getElementById("detailsText").textContent = "Settings will be available in a future update.";
    });
}
