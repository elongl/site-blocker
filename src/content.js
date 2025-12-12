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

  const blockEntry = blockedSites.find((site) => site.host === currentHost);
  if (!blockEntry) {
    return;
  }

  if (blockEntry.unblockAt && blockEntry.unblockAt <= currentTime) {
    const updatedBlockedSites = blockedSites.filter((site) => site.host !== currentHost);
    await chrome.storage.sync.set({ blockedSites: updatedBlockedSites });
    return;
  }

  window.location.href = chrome.runtime.getURL(
    `static/blocked.html?url=${encodeURIComponent(location.href)}`
  );
};

main();
