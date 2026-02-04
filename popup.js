/**
 * Popup Script for NPTEL Attendance Autofill
 * Handles saving and retrieving user settings.
 */

const fields = ["internshipId", "name", "mobile"];

// Save configuration
document.getElementById("save").onclick = () => {
  const data = {};
  fields.forEach((id) => (data[id] = document.getElementById(id).value));

  chrome.storage.sync.set(data, () => {
    const btn = document.getElementById("save");
    const originalText = btn.innerText;

    // Feedback animation
    btn.innerText = "Saved!";
    btn.style.backgroundColor = "#4CAF50"; // Green

    setTimeout(() => {
      btn.innerText = originalText;
      btn.style.backgroundColor = ""; // Revert to default
    }, 1500);
  });
};

// Load configuration
chrome.storage.sync.get(fields, (data) => {
  fields.forEach((id) => {
    document.getElementById(id).value = data[id] || "";
  });
});
