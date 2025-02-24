document.addEventListener("DOMContentLoaded", function () {
    chrome.runtime.sendMessage({ action: "getStatus" }, function (response) {
        let urlElement = document.getElementById("urlStatus");
        let emailElement = document.getElementById("emailStatus");

        // Show only the relevant status
        if (window.location.href.includes("mail.google.com")) {
            urlElement.style.display = "none";
        } else {
            emailElement.style.display = "none";
        }

        urlElement.innerText = response.urlStatus || "Checking URL...";
        emailElement.innerText = response.phishingStatus || "Checking Email...";

        urlElement.className = response.urlStatus.includes("Dangerous") ? "status danger" : "status safe";
        emailElement.className = response.phishingStatus.includes("Phishing") ? "status danger" : "status safe";
    });
});
