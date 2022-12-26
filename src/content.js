const blockSite = async (host) => {
  const blockedSites = (await chrome.storage.sync.get("blockedSites")) || [];
  await chrome.storage.sync.set({
    blockedSites: [...blockedSites, host],
  });
  console.log(`Successfully added "${host}" to blocked sites.`);
};

if (blockedSites.includes(location.host)) {
  const blockedPageURL = chrome.runtime.getURL("static/blocked.html");
  window.location.href = blockedPageURL;
}
