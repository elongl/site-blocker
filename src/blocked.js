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

const blockedSiteURL = getBlockedSiteURL();

const getStats = async () => {
  const { blockStats } = await chrome.storage.local.get({
    blockStats: { shown: 0, unblocked: 0 },
  });
  return blockStats;
};

const recordShown = async () => {
  const stats = await getStats();
  stats.shown++;
  await chrome.storage.local.set({ blockStats: stats });
  renderStats();
};

const recordUnblocked = async () => {
  const stats = await getStats();
  stats.unblocked++;
  await chrome.storage.local.set({ blockStats: stats });
};

const resetStats = async () => {
  await chrome.storage.local.set({ blockStats: { shown: 0, unblocked: 0 } });
  renderStats();
};

const renderStats = async () => {
  const stats = await getStats();
  const pastShown = blockedSiteURL ? stats.shown - 1 : stats.shown;
  const resisted = Math.max(0, pastShown - stats.unblocked);
  const unblockedPercent = pastShown > 0 ? (stats.unblocked / pastShown) * 100 : 0;

  document.getElementById("stat-resisted").textContent = resisted;
  document.getElementById("stat-unblocked").textContent = stats.unblocked;

  const percentEl = document.getElementById("stat-percent");
  percentEl.textContent = `${unblockedPercent.toFixed(1)}%`;
  percentEl.className = "stat-percent";
  if (unblockedPercent > 50) {
    percentEl.classList.add("high");
  } else if (unblockedPercent < 10) {
    percentEl.classList.add("low");
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
    (entry) => entry.host === blockedSiteURL.host,
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
  await recordUnblocked();
  const expiresAt = Date.now() + selectedMinutes * 60 * 1000;
  let { temporarilyUnblocked } = await chrome.storage.local.get({
    temporarilyUnblocked: [],
  });
  temporarilyUnblocked = temporarilyUnblocked.filter(
    (entry) => entry.host !== blockedSiteURL.host,
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
  await recordUnblocked();
  let { oneTimeUnblocked } = await chrome.storage.local.get({
    oneTimeUnblocked: [],
  });
  oneTimeUnblocked = [...oneTimeUnblocked, blockedSiteURL.host];
  await chrome.storage.local.set({ oneTimeUnblocked });
  window.location.href = blockedSiteURL.href;
};

const unblockSite = async () => {
  if (!blockedSiteURL) return;
  await recordUnblocked();
  let { blockedSites } = await chrome.storage.sync.get({ blockedSites: [] });
  blockedSites = blockedSites.filter(
    (site) => site.host !== blockedSiteURL.host,
  );
  await chrome.storage.sync.set({ blockedSites });
  const currentTab = await chrome.tabs.getCurrent();
  reloadOtherBlockedTabsForHost(blockedSiteURL.host, currentTab?.id);
  window.location.href = blockedSiteURL.href;
};

const getRandomPhrase = () => {
  return CHALLENGE_PHRASES[
    Math.floor(Math.random() * CHALLENGE_PHRASES.length)
  ];
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
  const isMatch =
    inputEl.value.toLowerCase().trim() === currentChallenge.toLowerCase();
  confirmBtn.disabled = !isMatch;
};

const confirmChallenge = () => {
  const inputEl = document.getElementById("challenge-input");
  if (inputEl.value.toLowerCase().trim() !== currentChallenge.toLowerCase()) {
    inputEl.classList.add("error");
    setTimeout(() => inputEl.classList.remove("error"), 400);
    return;
  }

  const action = pendingAction;
  if (action) {
    document.getElementById("challenge-confirm").disabled = true;
    document.getElementById("challenge-confirm").textContent = "Redirecting...";
    action();
  }
};

displayBlockedSite();
setupDurationButtons();
renderStats();

if (blockedSiteURL) {
  recordShown();
}

document.getElementById("reset-stats-button").addEventListener("click", resetStats);

document
  .getElementById("temp-unblock-button")
  .addEventListener("click", () => showChallenge(temporarilyUnblockSite));
document
  .getElementById("unblock-once-button")
  .addEventListener("click", () => showChallenge(unblockSiteOnce));
document
  .getElementById("unblock-button")
  .addEventListener("click", () => showChallenge(unblockSite));

document
  .getElementById("challenge-cancel")
  .addEventListener("click", hideChallenge);
document
  .getElementById("challenge-confirm")
  .addEventListener("click", confirmChallenge);
document
  .getElementById("challenge-input")
  .addEventListener("input", validateChallenge);
document.getElementById("challenge-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") confirmChallenge();
  if (e.key === "Escape") hideChallenge();
});
document
  .getElementById("challenge-input")
  .addEventListener("paste", (e) => e.preventDefault());
document
  .getElementById("challenge-input")
  .addEventListener("drop", (e) => e.preventDefault());
document.getElementById("challenge-overlay").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) hideChallenge();
});
