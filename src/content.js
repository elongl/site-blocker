const main = async () => {
  const [{ blockedSites }, { oneTimeUnblocked }, { temporarilyUnblocked }] = await Promise.all([
    chrome.storage.sync.get({ blockedSites: [] }),
    chrome.storage.local.get({ oneTimeUnblocked: [] }),
    chrome.storage.local.get({ temporarilyUnblocked: [] }),
  ]);
  const currentHost = location.host;
  const currentTime = Date.now();

  if (oneTimeUnblocked.includes(currentHost)) {
    const updatedOneTimeUnblocked = oneTimeUnblocked.filter((host) => host !== currentHost);
    await chrome.storage.local.set({ oneTimeUnblocked: updatedOneTimeUnblocked });
    return;
  }

  const tempUnblockEntry = temporarilyUnblocked.find((entry) => entry.host === currentHost);
  if (tempUnblockEntry) {
    if (tempUnblockEntry.expiresAt > currentTime) {
      return;
    }
    const updatedTempUnblocked = temporarilyUnblocked.filter((entry) => entry.host !== currentHost);
    await chrome.storage.local.set({ temporarilyUnblocked: updatedTempUnblocked });
  }

  const blockEntry = blockedSites.find((site) => site.host === currentHost);
  if (!blockEntry) {
    return;
  }

  window.location.href = chrome.runtime.getURL(
    `static/blocked.html?url=${encodeURIComponent(location.href)}`
  );
};

main();
