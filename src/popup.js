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
  const blockSuccessLabel = document.getElementById("block-success");
  let { blockedSites } = await chrome.storage.sync.get({ blockedSites: [] });
  blockedSites = [...blockedSites, currentTabURL.host];
  await chrome.storage.sync.set({ blockedSites });
  blockSuccessLabel.style.display = "block";
  await chrome.tabs.update(currentTab.id, {
    url: chrome.runtime.getURL(`static/blocked.html?url=${currentTabURL.href}`),
  });
};

const blockButton = document.getElementById("block-button");
blockButton.addEventListener("click", blockSite);
