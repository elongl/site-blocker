const main = async () => {
  const { blockedSites } = await chrome.storage.sync.get({ blockedSites: [] });
  if (blockedSites.includes(location.host)) {
    window.location.href = chrome.runtime.getURL(
      `static/blocked.html?url=${location.href}`
    );
  }
};

main();
