const getBlockedSiteURL = () => {
  const urlParams = new URLSearchParams(location.search);
  const urlParam = urlParams.get("url");
  if (!urlParam) {
    return null;
  }
  try {
    return new URL(decodeURIComponent(urlParam));
  } catch {
    return null;
  }
};

const blockedSiteURL = getBlockedSiteURL();

const displayBlockedSite = () => {
  const siteNameElement = document.getElementById("blocked-site-name");
  if (blockedSiteURL) {
    siteNameElement.textContent = blockedSiteURL.host;
  } else {
    siteNameElement.textContent = "Unknown site";
    document.getElementById("unblock-once-button").disabled = true;
    document.getElementById("unblock-button").disabled = true;
  }
};

const unblockSiteOnce = async () => {
  if (!blockedSiteURL) return;
  let { oneTimeUnblocked } = await chrome.storage.local.get({ oneTimeUnblocked: [] });
  oneTimeUnblocked = [...oneTimeUnblocked, blockedSiteURL.host];
  await chrome.storage.local.set({ oneTimeUnblocked });
  window.location.href = blockedSiteURL.href;
};

const unblockSite = async () => {
  if (!blockedSiteURL) return;
  let { blockedSites } = await chrome.storage.sync.get({ blockedSites: [] });
  blockedSites = blockedSites.filter((site) => site.host !== blockedSiteURL.host);
  await chrome.storage.sync.set({ blockedSites });
  window.location.href = blockedSiteURL.href;
};

displayBlockedSite();
document.getElementById("unblock-once-button").addEventListener("click", unblockSiteOnce);
document.getElementById("unblock-button").addEventListener("click", unblockSite);
