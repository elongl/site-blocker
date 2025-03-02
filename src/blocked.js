const unblockSite = async () => {
  let { blockedSites } = await chrome.storage.sync.get({ blockedSites: [] });
  const urlParams = new URLSearchParams(location.search);
  const currentBlockedSiteURL = new URL(urlParams.get("url"));
  blockedSites = blockedSites.filter(
    (site) => site.host !== currentBlockedSiteURL.host
  );
  await chrome.storage.sync.set({ blockedSites });
  window.location.href = currentBlockedSiteURL.href;
};

const unblockButton = document.getElementById("unblock-button");
unblockButton.addEventListener("click", unblockSite);
