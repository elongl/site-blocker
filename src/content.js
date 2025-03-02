const main = async () => {
  const { blockedSites } = await chrome.storage.sync.get({ blockedSites: [] });
  const currentHost = location.host;
  const currentTime = Date.now();

  const isBlocked = blockedSites.some((site) => {
    if (site.host === currentHost) {
      if (site.unblockAt && site.unblockAt <= currentTime) {
        const updatedBlockedSites = blockedSites.filter(
          (blockedSite) => blockedSite.host !== currentHost
        );
        chrome.storage.sync.set({ blockedSites: updatedBlockedSites });
        return false;
      }
      return true;
    }
    return false;
  });

  if (isBlocked) {
    window.location.href = chrome.runtime.getURL(
      `static/blocked.html?url=${location.href}`
    );
  }
};

main();
