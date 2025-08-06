// ==UserScript==
// @name         uRedditBlock
// @namespace    https://tampermonkey.net/
// @version      1.0
// @description  Lightning-fast subreddit & user blocking for Reddit.
// @author       berkaygediz
// @match        https://www.reddit.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  "use strict";

  let blockedSubreddits = [];
  let blockedUsers = [];
  // chromium extension (storage)
  /*
  async function loadBlockedLists() {
    const result = await chrome.storage.sync.get(['blockedSubreddits', 'blockedUsers']);
    blockedSubreddits = result.blockedSubreddits || [];
    blockedUsers = result.blockedUsers || [];
  }
  
  async function saveBlockedLists() {
    await chrome.storage.sync.set({
      blockedSubreddits,
      blockedUsers
    });
  }
  */
  
  //firefox extension (storage)
  /*
  async function loadBlockedLists() {
    const result = await browser.storage.sync.get(['blockedSubreddits', 'blockedUsers']);
    blockedSubreddits = result.blockedSubreddits || [];
    blockedUsers = result.blockedUsers || [];
  }
  
  async function saveBlockedLists() {
    await browser.storage.sync.set({
      blockedSubreddits,
      blockedUsers
    });
  }
  */
  
  function loadBlockedLists() {
    try {
      const subs = GM_getValue("blockedSubreddits", "[]");
      blockedSubreddits = JSON.parse(subs);
    } catch (e) {
      blockedSubreddits = [];
    }
    try {
      const users = GM_getValue("blockedUsers", "[]");
      blockedUsers = JSON.parse(users);
    } catch (e) {
      blockedUsers = [];
    }
  }

  function saveBlockedLists() {
    GM_setValue("blockedSubreddits", JSON.stringify(blockedSubreddits));
    GM_setValue("blockedUsers", JSON.stringify(blockedUsers));
  }

  loadBlockedLists();

  let debounceTimeout;
  function debouncedRemoveAndButtons() {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      removeBlockedContent();
      addBlockButtons();
    }, 500);
  }

  const observer = new MutationObserver(debouncedRemoveAndButtons);
  observer.observe(document.body, { childList: true, subtree: true });

  function removeCommentAndWrappers(element) {
    if (!element) return;
    let container = element.closest(
      "article, section, details, shreddit-comment"
    );
    if (container) {
      container.style.setProperty("display", "none", "important");
      container.remove();
    } else {
      element.style.setProperty("display", "none", "important");
      element.remove();
    }
  }

  // Comments tree
  document.querySelectorAll("shreddit-comment[author]").forEach((comment) => {
    const author = comment.getAttribute("author");
    if (author && blockedUsers.includes(author)) {
      removeCommentAndWrappers(comment);
    }
  });

  function removeBlockedContent() {
    document
      .querySelectorAll('a[data-ks-id][slot="full-post-link"]')
      .forEach((postLink) => {
        const container = postLink.closest(
          '[data-testid="post-container"], faceplate-tracker, shreddit-post, div'
        );
        if (!container) return;

        const href = postLink.getAttribute("href");
        if (!href) return;

        let shouldRemove = false;

        // Subreddit
        const subredditMatch = href.match(/^\/r\/([^\/]+)/);
        if (subredditMatch) {
          const subreddit = subredditMatch[1];
          if (blockedSubreddits.includes(subreddit)) {
            shouldRemove = true;
          }
        }

        // Users
        const userElement = container.querySelector('a[href^="/user/"]');
        if (userElement) {
          const username = userElement.href
            .split("/user/")[1]
            ?.replace("/", "");
          if (blockedUsers.includes(username)) {
            shouldRemove = true;
          }
        }

        if (shouldRemove) {
          const article = postLink.closest("article");
          if (article) {
            const hr = article.nextElementSibling;
            if (hr && hr.tagName === "HR") hr.remove();
            article.remove();
          } else {
            container.remove();
          }
        }
      });

    // Search results
    document
      .querySelectorAll('a[data-testid="post-title"]')
      .forEach((postTitleLink) => {
        const href = postTitleLink.getAttribute("href");
        if (!href) return;

        const subredditMatch = href.match(/^\/r\/([^\/]+)/);
        if (!subredditMatch) return;

        const subreddit = subredditMatch[1];
        if (blockedSubreddits.includes(subreddit)) {
          const container = postTitleLink.closest(
            '[data-testid="post-container"], article, div'
          );
          if (container) {
            container.remove();
          } else {
            postTitleLink.remove();
          }
        }
      });

    // User profile
    document
      .querySelectorAll('a[data-ks-id][href*="/comments/"]')
      .forEach((link) => {
        const href = link.getAttribute("href");
        if (!href) return;

        const subredditMatch = href.match(/\/r\/([^\/]+)/);
        if (!subredditMatch) return;
        const subreddit = subredditMatch[1];

        if (blockedSubreddits.includes(subreddit)) {
          const article =
            link.closest("article") ||
            link.closest('[data-testid="post-container"]');
          if (article) {
            const hr = article.nextElementSibling;
            if (hr && hr.tagName === "HR") hr.remove();
            article.remove();
          } else {
            link.remove();
          }
          return;
        }

        // User block
        let username = null;
        const parent = link.parentElement;
        if (parent) {
          const userLink = parent.querySelector('a[href^="/user/"]');
          if (userLink) {
            username = userLink
              .getAttribute("href")
              .split("/user/")[1]
              .replace("/", "");
          }
        }

        if (username && blockedUsers.includes(username)) {
          const article =
            link.closest("article") ||
            link.closest('[data-testid="post-container"]');
          if (article) {
            const hr = article.nextElementSibling;
            if (hr && hr.tagName === "HR") hr.remove();
            article.remove();
          } else {
            link.remove();
          }
        }
      });

    document
      .querySelectorAll('section[aria-label="Comments"] [id^="t1_"]')
      .forEach((comment) => {
        const userElement = comment.querySelector('a[href^="/user/"]');
        if (!userElement) return;
        const username = userElement.href.split("/user/")[1]?.replace("/", "");
        if (blockedUsers.includes(username)) {
          removeCommentAndWrappers(comment);
        }
      });

    document.querySelectorAll('details[role="article"]').forEach((detail) => {
      const userEl = detail.querySelector('a[href^="/user/"]');
      if (!userEl) return;
      const username = userEl.href.split("/user/")[1]?.replace("/", "");
      if (blockedUsers.includes(username)) {
        removeCommentAndWrappers(detail);
      }
    });

    document.querySelectorAll("shreddit-comment[author]").forEach((comment) => {
      const author = comment.getAttribute("author");
      if (author && blockedUsers.includes(author)) {
        removeCommentAndWrappers(comment);
      }
    });

    // Sidebar RECENTS
    removeBlockedSidebarRecent();

    // Unnecessary <hr>
    document.querySelectorAll("hr").forEach((hr) => {
      if (
        (!hr.previousElementSibling ||
          hr.previousElementSibling.tagName === "HR") &&
        (!hr.nextElementSibling || hr.nextElementSibling.tagName === "HR")
      ) {
        hr.remove();
      }
      const parent = hr.parentElement;
      if (
        parent &&
        parent.tagName === "ARTICLE" &&
        parent.children.length === 1
      ) {
        parent.remove();
      }
    });
  }

  function querySelectorAllDeep(selector, root = document) {
    const results = [];

    function traverse(node) {
      if (node.nodeType !== 1) return;
      if (node.matches(selector)) results.push(node);

      if (node.shadowRoot) {
        traverse(node.shadowRoot);
      }
      node.childNodes.forEach(traverse);
    }

    traverse(root);
    return results;
  }

  function removeBlockedSidebarRecent() {
    // RECENT container -> Shadow DOM
    const recentContainers = querySelectorAllDeep("div#RECENT");

    if (!recentContainers.length) return;

    recentContainers.forEach((container) => {
      container.querySelectorAll("li").forEach((li) => {
        const subredditLink = li.querySelector('a[href^="/r/"]');
        if (!subredditLink) return;

        const href = subredditLink.getAttribute("href");
        const match = href.match(/^\/r\/([^\/]+)/);
        if (!match) return;

        const subredditName = match[1];
        if (blockedSubreddits.includes(subredditName)) {
          li.remove();
        }
      });
    });
  }

  // User and subreddit block buttons
  function addBlockButtons() {
    // User button
    document.querySelectorAll('a[href^="/user/"]').forEach((userEl) => {
      const username = userEl.href.split("/user/")[1]?.replace("/", "");
      if (!username) return;

      if (userEl.querySelector("img")) {
        return;
      }

      if (userEl.parentElement.querySelector(".block-user-btn")) return;

      const btn = document.createElement("span");
      btn.innerText = "❌";
      btn.title = `Block user: ${username}`;
      btn.className = "block-user-btn";
      btn.style.cursor = "pointer";
      btn.style.color = "red";
      btn.style.marginLeft = "6px";
      btn.style.fontSize = "12px";
      btn.style.display = "inline-flex";
      btn.style.alignItems = "center";
      btn.style.userSelect = "none";

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!blockedUsers.includes(username)) {
          blockedUsers.push(username);
          saveBlockedLists();
          removeBlockedContent();
        }
      });

      userEl.parentElement.appendChild(btn);
    });

    // Subreddit button
    document
      .querySelectorAll('a[data-testid="subreddit-name"]')
      .forEach((subEl) => {
        const subredditMatch = subEl.href.match(/\/r\/([^\/]+)/);
        if (!subredditMatch) return;

        const subreddit = subredditMatch[1];
        const wrapper = subEl.parentElement;
        if (!subreddit) return;

        if (blockedSubreddits.includes(subreddit)) return;
        if (wrapper.querySelector(".block-subreddit-btn")) return;

        const btn = document.createElement("span");
        btn.innerText = "🚫";
        btn.title = `Subreddit blocked: ${subreddit}`;
        btn.className = "block-subreddit-btn";
        btn.style.cursor = "pointer";
        btn.style.color = "darkred";
        btn.style.marginLeft = "6px";
        btn.style.fontSize = "12px";
        btn.style.display = "inline-flex";
        btn.style.alignItems = "center";
        btn.style.userSelect = "none";

        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!blockedSubreddits.includes(subreddit)) {
            blockedSubreddits.push(subreddit);
            saveBlockedLists();
            removeBlockedContent();
            alert(`Subreddit blocked: ${subreddit}`);
          }
        });

        wrapper.appendChild(btn);
      });
  }

  removeBlockedContent();
  addBlockButtons();
})();
