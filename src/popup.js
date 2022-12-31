const blockButton = document.getElementById("block-button");
const blockSuccessLabel = document.getElementById("block-success");

const getCurrentTab = async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  return new URL(tab.url);
};

const blockSite = async () => {
  const currentTab = await getCurrentTab();
  let { blockedSites } = await chrome.storage.sync.get({ blockedSites: [] });
  blockedSites = [...blockedSites, currentTab.host];
  await chrome.storage.sync.set({ blockedSites });
  blockSuccessLabel.style.display = "block";
};

blockButton.addEventListener("click", blockSite);
