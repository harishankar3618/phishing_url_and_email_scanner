// background.js
const VIRUSTOTAL_API_KEY = "df0f291924441848a014c0f41ed63ad251e90d73243126a3272ab8cbc67e4994";

// Handle URL scanning
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url && !tab.url.includes("mail.google.com")) {
        chrome.action.setIcon({ tabId, path: "icons/scanning.png" });
        chrome.storage.local.set({ scanStatus: "scanning", phishingStatus: null });
        scanURL(tabId, tab.url);
    }
});

// Handle notification requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "showNotification") {
        chrome.notifications.create(`notify_${Date.now()}`, {
            type: "basic",
            iconUrl: "icons/danger.png",
            title: request.title,
            message: request.message
        });
    }
    return true;
});

async function scanURL(tabId, url) {
    try {
        let response = await fetch("https://www.virustotal.com/api/v3/urls", {
            method: "POST",
            headers: { "x-apikey": VIRUSTOTAL_API_KEY, "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ url })
        });

        if (!response.ok) {
            throw new Error(`VirusTotal API error: ${response.status}`);
        }

        let data = await response.json();
        let analysisId = data.data.id;

        // Use a slightly longer timeout to ensure results are ready
        setTimeout(async () => {
            try {
                let result = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
                    headers: { "x-apikey": VIRUSTOTAL_API_KEY }
                });

                if (!result.ok) {
                    throw new Error(`VirusTotal analysis error: ${result.status}`);
                }

                let scanData = await result.json();
                let maliciousCount = scanData.data.attributes.stats.malicious;
                let suspiciousCount = scanData.data.attributes.stats.suspicious;
                let isMalicious = (maliciousCount > 0 || suspiciousCount > 0);

                // Update icon and storage
                chrome.action.setIcon({ tabId, path: isMalicious ? "icons/danger.png" : "icons/icon.png" });
                chrome.storage.local.set({ scanStatus: isMalicious ? "malicious" : "safe" });

                // Show notification with scan results
                if (isMalicious) {
                    chrome.notifications.create({
                        type: "basic",
                        iconUrl: "icons/danger.png",
                        title: "PhishShield",
                        message: `⚠️ Warning: This site may be dangerous! (${maliciousCount} malicious, ${suspiciousCount} suspicious detections)`
                    });
                }
            } catch (error) {
                console.error("VirusTotal Analysis Error:", error);
                chrome.action.setIcon({ tabId, path: "icons/error.png" });
                chrome.storage.local.set({ scanStatus: "error" });
            }
        }, 7000); // Increased timeout for more reliable results
    } catch (error) {
        console.error("VirusTotal API Error:", error);
        chrome.action.setIcon({ tabId, path: "icons/error.png" });
        chrome.storage.local.set({ scanStatus: "error" });
    }
}
