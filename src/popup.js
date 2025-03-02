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
  const blockDuration = document.getElementById("block-duration").value;
  let { blockedSites } = await chrome.storage.sync.get({ blockedSites: [] });
  const blockEntry = { host: currentTabURL.host, unblockAt: null };

  if (blockDuration) {
    const unblockTime = Date.now() + parseInt(blockDuration) * 60 * 1000;
    blockEntry.unblockAt = unblockTime;
  }

  blockedSites = [...blockedSites, blockEntry];
  await chrome.storage.sync.set({ blockedSites });
  blockSuccessLabel.style.display = "block";
  await chrome.tabs.update(currentTab.id, {
    url: chrome.runtime.getURL(`static/blocked.html?url=${currentTabURL.href}`),
  });
};

const blockButton = document.getElementById("block-button");
blockButton.addEventListener("click", blockSite);
