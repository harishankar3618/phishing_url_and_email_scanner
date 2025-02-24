console.log("📧 Email Scanner Injected...");

// ✅ Track if alert has already been shown for an email
let alertShown = 0;

// ✅ Scan email for phishing content
function scanEmailForPhishing() {
    let emailBodyElement = document.querySelector(".a3s, .ii.gt, .a3s.aiL");
    if (!emailBodyElement) {
        console.warn("⚠️ No email content found. Retrying in 2s...");
        setTimeout(scanEmailForPhishing, 2000);
        return;
    }

    let emailBody = emailBodyElement.innerText.toLowerCase();
    const phishingKeywords = [
        "urgent", "reset password", "verify account", "click here",
        "suspicious activity", "confirm your identity", "unusual login attempt",
        "bank account", "password reset", "update payment", "security alert"
    ];

    let foundPhishing = phishingKeywords.some(keyword => emailBody.includes(keyword));

    let emailStatus = foundPhishing ? "❌ Phishing Email Detected" : "✅ Email is Safe!";
    chrome.storage.local.set({ phishingStatus: emailStatus });

    if (foundPhishing && alertShown === 0) {
        alertShown = 1;
        console.warn("⚠️ Phishing email detected:");
        
        // ✅ Send notification request to `background.js`
        chrome.runtime.sendMessage({
            action: "showNotification",
            title: "⚠️ Phishing Warning!",
            message: "This email has been flagged as phishing."
        });

        alert("⚠️ Phishing Warning!\nThis email has been flagged as phishing.");
        emailBodyElement.style.border = "2px solid red";
    } else if (!foundPhishing) {
        console.log("✅ Email is safe:");        
        emailBodyElement.style.border = "2px solid green";
    }
}

// ✅ Observe email changes dynamically
const observer = new MutationObserver(() => {
    alertShown = false;  
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

startObserving();
