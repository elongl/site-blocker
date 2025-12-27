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

const CHALLENGE_PHRASES = [
  "I am wasting my time",
  "I should be working",
  "This is a distraction",
  "I will regret this",
  "Back to procrastinating",
];

let currentChallenge = null;
let pendingAction = null;

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

const getRandomPhrase = () => {
  return CHALLENGE_PHRASES[Math.floor(Math.random() * CHALLENGE_PHRASES.length)];
};

const showChallenge = (action) => {
  pendingAction = action;
  currentChallenge = getRandomPhrase();
  
  const overlay = document.getElementById("challenge-overlay");
  const phraseEl = document.getElementById("challenge-phrase");
  const inputEl = document.getElementById("challenge-input");
  const confirmBtn = document.getElementById("challenge-confirm");
  
  phraseEl.textContent = currentChallenge;
  inputEl.value = "";
  confirmBtn.disabled = true;
  inputEl.classList.remove("error");
  
  overlay.classList.add("visible");
  setTimeout(() => inputEl.focus(), 100);
};

const hideChallenge = () => {
  document.getElementById("challenge-overlay").classList.remove("visible");
  pendingAction = null;
  currentChallenge = null;
};

const validateChallenge = () => {
  const inputEl = document.getElementById("challenge-input");
  const confirmBtn = document.getElementById("challenge-confirm");
  const isMatch = inputEl.value.toLowerCase().trim() === currentChallenge.toLowerCase();
  confirmBtn.disabled = !isMatch;
};

const confirmChallenge = () => {
  const inputEl = document.getElementById("challenge-input");
  if (inputEl.value.toLowerCase().trim() !== currentChallenge.toLowerCase()) {
    inputEl.classList.add("error");
    setTimeout(() => inputEl.classList.remove("error"), 400);
    return;
  }
  
  hideChallenge();
  if (pendingAction) pendingAction();
};

displayBlockedSite();
setupDurationButtons();

document.getElementById("temp-unblock-button").addEventListener("click", () => showChallenge(temporarilyUnblockSite));
document.getElementById("unblock-once-button").addEventListener("click", () => showChallenge(unblockSiteOnce));
document.getElementById("unblock-button").addEventListener("click", () => showChallenge(unblockSite));

document.getElementById("challenge-cancel").addEventListener("click", hideChallenge);
document.getElementById("challenge-confirm").addEventListener("click", confirmChallenge);
document.getElementById("challenge-input").addEventListener("input", validateChallenge);
document.getElementById("challenge-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") confirmChallenge();
  if (e.key === "Escape") hideChallenge();
});
document.getElementById("challenge-input").addEventListener("paste", (e) => e.preventDefault());
document.getElementById("challenge-overlay").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) hideChallenge();
});
