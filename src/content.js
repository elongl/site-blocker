if (location.host === 'twitter.com') {
  const blockedPageURL = chrome.runtime.getURL('static/blocked.html');
  window.location.href = blockedPageURL;
}
