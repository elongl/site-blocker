const getCurrentTab = async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  return tab;
};

const reloadBlockedTabsForHost = async (host) => {
  const blockedPageBase = chrome.runtime.getURL("static/blocked.html");
  const tabs = await chrome.tabs.query({ url: blockedPageBase + "*" });
  for (const tab of tabs) {
    try {
      const tabUrl = new URL(tab.url);
      const originalUrl = tabUrl.searchParams.get("url");
      if (originalUrl) {
        const originalHost = new URL(decodeURIComponent(originalUrl)).host;
        if (originalHost === host) {
          chrome.tabs.update(tab.id, { url: decodeURIComponent(originalUrl) });
        }
      }
    } catch {}
  }
};

const formatTimeRemaining = (ms) => {
  const minutes = Math.ceil(ms / 60000);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${minutes}m`;
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
    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => removeSite(site.host));
    li.appendChild(span);
    li.appendChild(removeButton);
    listElement.appendChild(li);
  }
};

const renderTempUnblockedList = async () => {
  const { temporarilyUnblocked } = await chrome.storage.local.get({
    temporarilyUnblocked: [],
  });
  const section = document.getElementById("temp-unblocked-section");
  const listElement = document.getElementById("temp-unblocked-list");
  listElement.innerHTML = "";

  const now = Date.now();
  const activeUnblocks = temporarilyUnblocked.filter(
    (entry) => entry.expiresAt > now,
  );

  if (activeUnblocks.length === 0) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";

  for (const entry of activeUnblocks) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = entry.host;
    const timeSpan = document.createElement("span");
    timeSpan.className = "temp-unblock-time";
    timeSpan.textContent = formatTimeRemaining(entry.expiresAt - now);
    span.appendChild(timeSpan);
    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => cancelTempUnblock(entry.host));
    li.appendChild(span);
    li.appendChild(cancelButton);
    listElement.appendChild(li);
  }
};

const removeSite = async (host) => {
  let { blockedSites } = await chrome.storage.sync.get({ blockedSites: [] });
  let { temporarilyUnblocked } = await chrome.storage.local.get({
    temporarilyUnblocked: [],
  });
  blockedSites = blockedSites.filter((site) => site.host !== host);
  temporarilyUnblocked = temporarilyUnblocked.filter(
    (entry) => entry.host !== host,
  );
  await chrome.storage.sync.set({ blockedSites });
  await chrome.storage.local.set({ temporarilyUnblocked });
  reloadBlockedTabsForHost(host);
  renderBlockedList();
  renderTempUnblockedList();
};

const cancelTempUnblock = async (host) => {
  let { temporarilyUnblocked } = await chrome.storage.local.get({
    temporarilyUnblocked: [],
  });
  temporarilyUnblocked = temporarilyUnblocked.filter(
    (entry) => entry.host !== host,
  );
  await chrome.storage.local.set({ temporarilyUnblocked });
  renderTempUnblockedList();
};

const blockSite = async () => {
  const currentTab = await getCurrentTab();
  if (!currentTab.url || currentTab.url.startsWith("chrome://")) {
    return;
  }
  const currentTabURL = new URL(currentTab.url);
  const blockSuccessLabel = document.getElementById("block-success");
  let { blockedSites } = await chrome.storage.sync.get({ blockedSites: [] });

  const existingIndex = blockedSites.findIndex(
    (site) => site.host === currentTabURL.host,
  );
  if (existingIndex !== -1) {
    blockedSites.splice(existingIndex, 1);
  }

  blockedSites = [...blockedSites, { host: currentTabURL.host }];
  await chrome.storage.sync.set({ blockedSites });
  blockSuccessLabel.style.display = "block";
  renderBlockedList();
  await chrome.tabs.update(currentTab.id, {
    url: chrome.runtime.getURL(
      `static/blocked.html?url=${encodeURIComponent(currentTabURL.href)}`,
    ),
  });
};

renderBlockedList();
renderTempUnblockedList();
document.getElementById("block-button").addEventListener("click", blockSite);
