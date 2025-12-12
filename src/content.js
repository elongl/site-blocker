const main = async () => {
  const [{ blockedSites }, { oneTimeUnblocked }] = await Promise.all([
    chrome.storage.sync.get({ blockedSites: [] }),
    chrome.storage.local.get({ oneTimeUnblocked: [] }),
  ]);
  const currentHost = location.host;
  const currentTime = Date.now();

  if (oneTimeUnblocked.includes(currentHost)) {
    const updatedOneTimeUnblocked = oneTimeUnblocked.filter((host) => host !== currentHost);
    await chrome.storage.local.set({ oneTimeUnblocked: updatedOneTimeUnblocked });
    return;
  }

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
