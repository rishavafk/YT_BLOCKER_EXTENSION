// YT Focus Shield - Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  // Set defaults on install
  chrome.storage.sync.get({
    blockRecommendations: true,
    blockShortsAutoplay: true,
    blockSidebar: true,
    blockEndScreen: true,
    blockedKeywords: [],
    blockedChannels: []
  }, (existing) => {
    chrome.storage.sync.set(existing);
  });
});
