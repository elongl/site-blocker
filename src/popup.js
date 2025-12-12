const getCurrentTab = async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  return tab;
};

const renderBlockedList = async () => {
  const { blockedSites } = await chrome.storage.sync.get({ blockedSites: [] });
  const listElement = document.getElementById("blocked-list");
  listElement.innerHTML = "";

  if (blockedSites.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.className = "empty-message";
    emptyMessage.textContent = "No blocked sites";
    listElement.appendChild(emptyMessage);
    return;
  }

  for (const site of blockedSites) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = site.host;
    if (site.unblockAt) {
      const remaining = Math.max(0, Math.ceil((site.unblockAt - Date.now()) / 60000));
      span.textContent += ` (${remaining}m)`;
    }
    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => removeSite(site.host));
    li.appendChild(span);
    li.appendChild(removeButton);
    listElement.appendChild(li);
  }
};

const removeSite = async (host) => {
  let { blockedSites } = await chrome.storage.sync.get({ blockedSites: [] });
  blockedSites = blockedSites.filter((site) => site.host !== host);
  await chrome.storage.sync.set({ blockedSites });
  renderBlockedList();
};

const blockSite = async () => {
  const currentTab = await getCurrentTab();
  if (!currentTab.url || currentTab.url.startsWith("chrome://")) {
    return;
  }
  const currentTabURL = new URL(currentTab.url);
  const blockSuccessLabel = document.getElementById("block-success");
  const blockDuration = document.getElementById("block-duration").value;
  let { blockedSites } = await chrome.storage.sync.get({ blockedSites: [] });

  const existingIndex = blockedSites.findIndex((site) => site.host === currentTabURL.host);
  if (existingIndex !== -1) {
    blockedSites.splice(existingIndex, 1);
  }

  const blockEntry = { host: currentTabURL.host, unblockAt: null };
  if (blockDuration) {
    const unblockTime = Date.now() + parseInt(blockDuration) * 60 * 1000;
    blockEntry.unblockAt = unblockTime;
  }

  blockedSites = [...blockedSites, blockEntry];
  await chrome.storage.sync.set({ blockedSites });
  blockSuccessLabel.style.display = "block";
  renderBlockedList();
  await chrome.tabs.update(currentTab.id, {
    url: chrome.runtime.getURL(`static/blocked.html?url=${encodeURIComponent(currentTabURL.href)}`),
  });
};

renderBlockedList();
document.getElementById("block-button").addEventListener("click", blockSite);
