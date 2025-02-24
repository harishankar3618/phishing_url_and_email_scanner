const SAFE_BROWSING_API_KEY = "AIzaSyDqJNiTb44E7HEUpI8YrzPefDpvg5yhQo8";

// ✅ Listen for tab updates and check the URL
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
        console.log("🔍 Checking URL:", tab.url);

        if (tab.url.includes("mail.google.com")) {
            console.log("📧 Gmail detected, injecting email scanner...");
            injectEmailScanner(tabId);
            return;
        }

        const isMalicious = await checkSafeBrowsing(tab.url);
        let urlStatus = isMalicious ? "❌ Dangerous Site" : "✅ Safe Site";

        // ✅ Store result in Chrome storage
        chrome.storage.local.set({ urlStatus });

        if (isMalicious) {
            console.warn("⚠️ Malicious site detected:", tab.url);
            notifyUser("⚠️ Phishing Warning!", "This website has been flagged as unsafe.");
            chrome.tabs.update(tabId, { url: chrome.runtime.getURL("blocked.html") });
        }
    }
});

// ✅ Check URL using Google Safe Browsing API
async function checkSafeBrowsing(url) {
    const safeBrowsingUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${SAFE_BROWSING_API_KEY}`;
    const requestBody = {
        client: { clientId: "scam-detector", clientVersion: "1.0" },
        threatInfo: {
            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING"],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url }]
        }
    };

    try {
        const response = await fetch(safeBrowsingUrl, {
            method: "POST",
            body: JSON.stringify(requestBody),
            headers: { "Content-Type": "application/json" }
        });
        const data = await response.json();
        return data.matches ? true : false;
    } catch (error) {
        console.error("❌ Safe Browsing API Error:", error);
        return false;
    }
}

// ✅ Injects script into Gmail for phishing detection
function injectEmailScanner(tabId) {
    chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["content.js"]
    }, () => {
        if (chrome.runtime.lastError) {
            console.error("Script Injection Error:", chrome.runtime.lastError.message);
        }
    });
}

// ✅ Listen for messages from `content.js`
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getStatus") {
        chrome.storage.local.get(["urlStatus", "phishingStatus"], (data) => {
            sendResponse({
                urlStatus: data.urlStatus || "🔍 Scanning URL...",
                phishingStatus: data.phishingStatus || "📧 No email scanned yet"
            });
        });
        return true;
    }

    if (message.action === "showNotification") {
        notifyUser(message.title, message.message);
    }
});

// ✅ Show notifications
function notifyUser(title, message) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: title,
        message: message
    });
}
