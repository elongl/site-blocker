const unblockButton = document.getElementById("unblock-button");

const unblockSite = async () => {
  let { blockedSites } = await chrome.storage.sync.get({ blockedSites: [] });
  const urlParams = new URLSearchParams(location.search);
  const currentBlockedSiteURL = new URL(urlParams.get("url"));
  blockedSites = blockedSites.filter(
    (site) => site !== currentBlockedSiteURL.host
  );
  await chrome.storage.sync.set({ blockedSites });
  window.location.href = currentBlockedSiteURL.href;
};

unblockButton.addEventListener("click", unblockSite);
