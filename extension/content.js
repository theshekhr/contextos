(function () {
  const SITE = window.location.hostname.includes("claude.ai") ? "Claude" : "ChatGPT";

  function scrapeConversation() {
    let turns = [];

    if (SITE === "Claude") {
      // The actual scrollable conversation column. Anything outside this
      // container (sidebar, other extensions' injected UI, usage banners)
      // is structurally excluded just by anchoring here.
      const container = document.querySelector(
        ".flex-1.flex.flex-col.px-4.max-w-3xl.mx-auto.w-full.pt-1"
      );

      if (container) {
        Array.from(container.children).forEach((turn) => {
          // User messages render inside a bubble with this background/shape.
          // Claude's responses use a plain grid layout with no bubble.
          const isUser = !!turn.querySelector(
            ".bg-bg-300.rounded-xl.break-words.text-text-100"
          );
          const text = turn.innerText.trim();
          if (text) turns.push(`${isUser ? "User" : "Claude"}: ${text}`);
        });
      }

      // Narrow fallback only, in case Claude.ai changes this structure again.
      // Deliberately does NOT fall back to grabbing <main> or <body> wholesale,
      // since that previously captured unrelated sidebar/extension content.
      if (turns.length === 0) {
        const userSelectors = '[data-testid="user-message"], .font-user-message';
        const aiSelectors = '[data-testid="chat-message"], .font-claude-message';
        const nodes = document.querySelectorAll(`${userSelectors}, ${aiSelectors}`);
        nodes.forEach((node) => {
          const isUser = node.matches(userSelectors);
          const text = node.innerText.trim();
          if (text) turns.push(`${isUser ? "User" : "Claude"}: ${text}`);
        });
      }
    } else {
      // ChatGPT renders each turn inside [data-message-author-role] — already
      // confirmed working, left unchanged.
      const nodes = document.querySelectorAll("[data-message-author-role]");
      nodes.forEach((node) => {
        const role = node.getAttribute("data-message-author-role");
        const label = role === "user" ? "User" : "ChatGPT";
        const text = node.innerText.trim();
        if (text) turns.push(`${label}: ${text}`);
      });
    }

    return turns.join("\n");
  }

  function createButton() {
    if (document.getElementById("contextos-float-btn")) return;
    const btn = document.createElement("button");
    btn.id = "contextos-float-btn";
    btn.innerHTML = `
      <span class="contextos-dot"></span>
      Add to Memory
    `;
    btn.addEventListener("click", handleClick);
    document.body.appendChild(btn);
  }

  function handleClick() {
    const conversation = scrapeConversation();
    if (!conversation || conversation.length < 10) {
      showToast("No conversation found on this page yet.");
      return;
    }
    chrome.runtime.sendMessage(
      { type: "CAPTURE_CONVERSATION", payload: { aiModel: SITE, conversation } },
      (response) => {
        if (response?.needsAuth) {
          showToast("Connect your ContextOS account in the extension popup first.");
        } else if (response?.needsProject) {
          showToast("Open the extension popup to pick a project, then click Add to Memory again.");
        }
      }
    );
  }

  function showToast(message) {
    let toast = document.getElementById("contextos-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "contextos-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3200);
  }

  // Listen for messages from either the popup (project-picker flow) or the
  // background script (floating-button flow).
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // The popup asks for the page's conversation text and expects a reply.
    if (message.action === "scrapeConversation") {
      const text = scrapeConversation();
      sendResponse({ text });
      return; // synchronous reply, no need to keep the channel open
    }

    // Save results coming back from the background script (floating-button flow).
    if (message.type === "SAVE_SUCCESS") {
      showToast("Saved to ContextOS \u2713");
    } else if (message.type === "SAVE_ERROR") {
      showToast(message.error || "Failed to save.");
    }
  });

  createButton();

  // Some SPAs remove/replace the DOM on navigation; keep re-injecting the button
  const observer = new MutationObserver(() => createButton());
  observer.observe(document.body, { childList: true, subtree: true });
})();