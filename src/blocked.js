const getBlockedSiteURL = () => {
  const urlParams = new URLSearchParams(location.search);
  return new URL(urlParams.get("url"));
};

const unblockSiteOnce = async () => {
  const currentBlockedSiteURL = getBlockedSiteURL();
  let { oneTimeUnblocked } = await chrome.storage.local.get({ oneTimeUnblocked: [] });
  oneTimeUnblocked = [...oneTimeUnblocked, currentBlockedSiteURL.host];
  await chrome.storage.local.set({ oneTimeUnblocked });
  window.location.href = currentBlockedSiteURL.href;
};

const unblockSite = async () => {
  let { blockedSites } = await chrome.storage.sync.get({ blockedSites: [] });
  const currentBlockedSiteURL = getBlockedSiteURL();
  blockedSites = blockedSites.filter(
    (site) => site.host !== currentBlockedSiteURL.host
  );
  await chrome.storage.sync.set({ blockedSites });
  window.location.href = currentBlockedSiteURL.href;
};

document.getElementById("unblock-once-button").addEventListener("click", unblockSiteOnce);
document.getElementById("unblock-button").addEventListener("click", unblockSite);
