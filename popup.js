const fields = ["internshipId", "name", "mobile"];

document.getElementById("save").onclick = () => {
  const data = {};
  fields.forEach((id) => (data[id] = document.getElementById(id).value));
  chrome.storage.sync.set(data, () => {
    const btn = document.getElementById("save");
    const originalText = btn.innerText;
    btn.innerText = "Saved!";
    setTimeout(() => (btn.innerText = originalText), 1500);
  });
};

chrome.storage.sync.get(fields, (data) => {
  fields.forEach((id) => {
    document.getElementById(id).value = data[id] || "";
  });
});
