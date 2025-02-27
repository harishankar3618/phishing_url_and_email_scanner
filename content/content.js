console.log("📧 Email Scanner Injected...");

// Track if alert has already been shown for an email
let alert = 0;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "showNotification") {
        chrome.runtime.sendMessage({
            action: "showNotification",
            title: request.title,
            message: request.message
        });
    }
    return true;
});

// Scan email for phishing content
function scanEmailForPhishing() {
    let emailBodyElement = document.querySelector(".a3s, .ii.gt, .a3s.aiL");
    if (!emailBodyElement) {
        console.warn("⚠️ No email content found. Retrying in 2s...");
        setTimeout(scanEmailForPhishing, 2000);
        return;
    }
    
    let emailBody = emailBodyElement.innerText.toLowerCase();
    let emailHeadersElement = document.querySelector(".gE.iv.gt");
    let emailHeaders = emailHeadersElement ? emailHeadersElement.innerText.toLowerCase() : "";

    // Phishing keywords list with weighted scoring
    const phishingIndicators = [
        { keyword: "urgent", weight: 2 }, { keyword: "immediate", weight: 2 },
        { keyword: "alert", weight: 1 }, { keyword: "important notice", weight: 1 },
        { keyword: "verify account", weight: 3 }, { keyword: "confirm identity", weight: 3 },
        { keyword: "suspicious activity", weight: 3 }, { keyword: "click here", weight: 2 },
        { keyword: "reset password", weight: 3 }, { keyword: "bank account", weight: 2 },
        { keyword: "credit card", weight: 2 }, { keyword: "security breach", weight: 3 },
        { keyword: "account will be suspended", weight: 4 }
    ];

    let phishingScore = 0;
    let matchedKeywords = [];

    // Check for phishing keywords
    phishingIndicators.forEach(indicator => {
        if (emailBody.includes(indicator.keyword)) {
            phishingScore += indicator.weight;
            matchedKeywords.push(indicator.keyword);
        }
    });

    // Check for mismatched sender domains
    const fromMatch = emailHeaders.match(/from:.*?<(.*?)>/i);
    const replyToMatch = emailHeaders.match(/reply-to:.*?<(.*?)>/i);

    if (fromMatch && replyToMatch) {
        const fromDomain = fromMatch[1].split('@')[1];
        const replyToDomain = replyToMatch[1].split('@')[1];

        if (fromDomain !== replyToDomain) {
            phishingScore += 5;
            matchedKeywords.push("mismatched sender domains");
        }
    }

    // Check for excessive links
    const linkMatches = emailBody.match(/https?:\/\//g);
    if (linkMatches && linkMatches.length > 3) {
        phishingScore += Math.min(linkMatches.length - 3, 3);
        matchedKeywords.push("excessive links");
    }

    // Check for giveaway scams
    if (emailBody.includes("free") && 
        (emailBody.includes("prize") || emailBody.includes("won") || emailBody.includes("lottery"))) {
        phishingScore += 4;
        matchedKeywords.push("suspicious giveaway");
    }

    // Determine if email is phishing
    const isPhishing = phishingScore >= 5;
    let emailStatus = isPhishing ? 
        `❌ Phishing Email Detected (Score: ${phishingScore})` : 
        `✅ Email is Safe! (Score: ${phishingScore})`;

    chrome.storage.local.set({ phishingStatus: emailStatus });

    if (isPhishing && alert===0) {
        console.warn("⚠️ Phishing email detected");
        alert=1

        // Send notification request to background.js
        chrome.runtime.sendMessage({
            action: "showNotification",
            title: "⚠️ Phishing Warning",
            message: "This email contains potential phishing indicators."
        });

        // Apply red border to email content
        emailBodyElement.style.border = "3px solid red";

        // Insert warning banner
        setTimeout(() => {
            if (!document.querySelector("#phishShieldWarningBanner")) {
                const warningBanner = document.createElement("div");
                warningBanner.id = "phishShieldWarningBanner";
                warningBanner.style.cssText = `
                    background-color: #ffebee;
                    color: #c62828;
                    padding: 10px;
                    margin: 10px 0;
                    border-left: 4px solid #c62828;
                    font-weight: bold;
                    text-align: center;
                `;
                warningBanner.textContent = "⚠️ PhishShield Warning: This email contains potential phishing indicators.";
                emailBodyElement.parentNode.insertBefore(warningBanner, emailBodyElement);
            }
        }, 1000);
        
    } else if(!isPhishing && alert!=0) {
        console.log(`✅ Email appears safe (Score: ${phishingScore})`);
        emailBodyElement.style.border = "2px solid green";
    }
}

// Observe email changes dynamically
const observer = new MutationObserver(() => {
    alertShown = 0;
    scanEmailForPhishing();
});

function startObserving() {
    let emailContainer = document.querySelector(".ii.gt, .nH, .a3s.aiL");
    if (emailContainer) {
        observer.observe(emailContainer, { childList: true, subtree: true });
        scanEmailForPhishing();
    } else {
        console.warn("⚠️ Email container not found. Retrying in 2s...");
        setTimeout(startObserving, 2000);
    }
}

// Start observer when page is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserving);
} else {
    startObserving();
}
