function findOres() {
    const inputSignatureStr = document.getElementById('signatureInput').value;
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = "";

    const signature = parseInt(inputSignatureStr);
    if (isNaN(signature) || signature <= 0) {
        resultsDiv.innerHTML = "<p style='color:#ff6b6b; text-align:center;'>❌ Please enter a valid number.</p>";
        return;
    }

    let matches = [];
    // It will automatically use the "ores" array from data.js!
    for (const ore of ores) {
        if (signature % ore.signature === 0) {
            const count = signature / ore.signature;
            matches.push({
                name: ore.name,
                count: count
            });
        }
    }

    if (matches.length > 0) {
        resultsDiv.innerHTML = "<h3>Possible Matches:</h3><ul>" +
            matches.map(m => `<li><span class='ore-name'>${m.name}</span> <span class='ore-count'>(${m.count}x node cluster)</span></li>`).join('') +
            "</ul>";
    } else {
        resultsDiv.innerHTML = "<h3 style='color:#a1a6b0;'>No perfect matches found.</h3><p style='color:#a1a6b0; font-size:0.9rem;'>The initial signature may not be perfectly precise, or it's a mixed cluster.</p>";
    }
}

// Safely attach the Enter key listener after the page loads
document.addEventListener('DOMContentLoaded', function() {
    const sigInput = document.getElementById('signatureInput');
    if (sigInput) {
        sigInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault(); // Stops the page from refreshing
                findOres();
            }
        });
    }
});