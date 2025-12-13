const getBlockedSiteURL = () => {
  const urlParams = new URLSearchParams(location.search);
  const urlParam = urlParams.get("url");
  if (!urlParam) {
    return null;
  }
  try {
    return new URL(decodeURIComponent(urlParam));
  } catch {
    return null;
  }
};

const reloadOtherBlockedTabsForHost = async (host, excludeTabId) => {
  const blockedPageBase = chrome.runtime.getURL("static/blocked.html");
  const tabs = await chrome.tabs.query({ url: blockedPageBase + "*" });
  for (const tab of tabs) {
    if (tab.id === excludeTabId) continue;
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

const blockedSiteURL = getBlockedSiteURL();
let selectedMinutes = 30;

const checkIfStillBlocked = async () => {
  if (!blockedSiteURL) return;
  const { temporarilyUnblocked } = await chrome.storage.local.get({
    temporarilyUnblocked: [],
  });
  const tempEntry = temporarilyUnblocked.find(
    (entry) => entry.host === blockedSiteURL.host
  );
  if (tempEntry && tempEntry.expiresAt > Date.now()) {
    window.location.href = blockedSiteURL.href;
  }
};

checkIfStillBlocked();

const displayBlockedSite = () => {
  const siteNameElement = document.getElementById("blocked-site-name");
  if (blockedSiteURL) {
    siteNameElement.textContent = blockedSiteURL.host;
  } else {
    siteNameElement.textContent = "Unknown site";
    document.getElementById("unblock-once-button").disabled = true;
    document.getElementById("unblock-button").disabled = true;
    document.getElementById("temp-unblock-button").disabled = true;
  }
};

const setupDurationButtons = () => {
  const buttons = document.querySelectorAll(".duration-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedMinutes = parseInt(btn.dataset.minutes);
    });
  });
};

const temporarilyUnblockSite = async () => {
  if (!blockedSiteURL) return;
  const expiresAt = Date.now() + selectedMinutes * 60 * 1000;
  let { temporarilyUnblocked } = await chrome.storage.local.get({
    temporarilyUnblocked: [],
  });
  temporarilyUnblocked = temporarilyUnblocked.filter(
    (entry) => entry.host !== blockedSiteURL.host
  );
  temporarilyUnblocked = [
    ...temporarilyUnblocked,
    { host: blockedSiteURL.host, expiresAt },
  ];
  await chrome.storage.local.set({ temporarilyUnblocked });
  const currentTab = await chrome.tabs.getCurrent();
  reloadOtherBlockedTabsForHost(blockedSiteURL.host, currentTab?.id);
  window.location.href = blockedSiteURL.href;
};

const unblockSiteOnce = async () => {
  if (!blockedSiteURL) return;
  let { oneTimeUnblocked } = await chrome.storage.local.get({
    oneTimeUnblocked: [],
  });
  oneTimeUnblocked = [...oneTimeUnblocked, blockedSiteURL.host];
  await chrome.storage.local.set({ oneTimeUnblocked });
  window.location.href = blockedSiteURL.href;
};

const unblockSite = async () => {
  if (!blockedSiteURL) return;
  let { blockedSites } = await chrome.storage.sync.get({ blockedSites: [] });
  blockedSites = blockedSites.filter(
    (site) => site.host !== blockedSiteURL.host
  );
  await chrome.storage.sync.set({ blockedSites });
  const currentTab = await chrome.tabs.getCurrent();
  reloadOtherBlockedTabsForHost(blockedSiteURL.host, currentTab?.id);
  window.location.href = blockedSiteURL.href;
};

displayBlockedSite();
setupDurationButtons();
document
  .getElementById("temp-unblock-button")
  .addEventListener("click", temporarilyUnblockSite);
document
  .getElementById("unblock-once-button")
  .addEventListener("click", unblockSiteOnce);
document
  .getElementById("unblock-button")
  .addEventListener("click", unblockSite);
