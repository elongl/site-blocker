const blockButton = document.getElementById("block-button");
const blockSuccessLabel = document.getElementById("block-success");

const getCurrentTab = async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  return tab;
};

const blockSite = async () => {
  const currentTab = await getCurrentTab();
  const currentTabURL = new URL(currentTab.url);
  let { blockedSites } = await chrome.storage.sync.get({ blockedSites: [] });
  blockedSites = [...blockedSites, currentTabURL.host];
  await chrome.storage.sync.set({ blockedSites });
  blockSuccessLabel.style.display = "block";
  await chrome.tabs.update(currentTab.id, {
    url: chrome.runtime.getURL(`static/blocked.html?url=${currentTabURL.href}`),
  });
};

blockButton.addEventListener("click", blockSite);
