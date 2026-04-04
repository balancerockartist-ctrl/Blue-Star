/**
 * 1AI Re-Search — Client-side LLM-style search engine.
 *
 * This demo uses a local knowledge base to simulate LLM-powered responses.
 * In production this would connect to an actual LLM backend API.
 */

(function () {
  "use strict";

  // --- Knowledge base (simulated LLM responses) ---
  var knowledgeBase = [
    {
      keywords: ["1ai", "what is 1ai", "about 1ai"],
      answer:
        "1AI stands for \"AI for Every 1\" — the idea that artificial intelligence " +
        "should be accessible to every single person on the planet. It is part of the " +
        "Blue-Star project and the Global Operating System (G.O.S.©) initiative, " +
        "aiming to democratize AI-powered tools so that anyone can search, learn, " +
        "and solve problems with the help of intelligent technology."
    },
    {
      keywords: ["re-search", "research", "search engine", "how does re-search work"],
      answer:
        "Re-Search is the intelligent search engine at the heart of 1AI. Unlike " +
        "traditional keyword-based search engines, Re-Search leverages large language " +
        "model (LLM) technology to understand the intent behind your questions and " +
        "generate meaningful, conversational answers. It re-searches information to " +
        "find the most relevant and accurate response for you."
    },
    {
      keywords: ["global operating system", "gos", "g.o.s"],
      answer:
        "The Global Operating System (G.O.S.©) is a vision for AI agentic technology " +
        "that connects people, services, and systems worldwide. It provides the " +
        "foundational platform on which tools like 1AI and Re-Search are built, " +
        "enabling seamless interaction between humans and intelligent agents across " +
        "the globe."
    },
    {
      keywords: ["qr store", "qr code", "qrstore"],
      answer:
        "QR Store© is an innovative concept that uses QR codes to dynamically connect " +
        "people with a hosting platform. When you scan a QR code, it opens Google Lens " +
        "to photograph an item for sale, issues a credit for the item, and offers a " +
        "tipping option. The data is stored in the G.L.S.© (Godworld.org Logistics " +
        "Systems), which serves as the supply and demand logistics chain of the future."
    },
    {
      keywords: ["blue star", "blue-star", "project"],
      answer:
        "Blue-Star is the overarching project that brings together 1AI, Re-Search, " +
        "the Global Operating System (G.O.S.©), QR Store©, and the G.L.S.© logistics " +
        "platform. It represents a unified vision for using AI and technology to serve " +
        "every person on the planet — from intelligent search to commerce and logistics."
    },
    {
      keywords: ["llm", "large language model", "language model"],
      answer:
        "A Large Language Model (LLM) is a type of artificial intelligence trained on " +
        "vast amounts of text data to understand and generate human language. Re-Search " +
        "uses LLM technology to interpret your natural-language questions and produce " +
        "helpful, context-aware answers — going far beyond simple keyword matching."
    },
    {
      keywords: ["gls", "g.l.s", "logistics", "godworld"],
      answer:
        "G.L.S.© stands for Godworld.org Logistics Systems. It is the logistics supply " +
        "and demand chain of the future, storing data captured through QR Store© and " +
        "Google Lens. G.L.S.© enables efficient tracking, distribution, and management " +
        "of goods and services on a global scale."
    }
  ];

  // --- DOM elements ---
  var searchForm = document.getElementById("search-form");
  var searchInput = document.getElementById("search-input");
  var resultsContainer = document.getElementById("results-container");
  var resultsDiv = document.getElementById("results");
  var clearBtn = document.getElementById("clear-btn");
  var suggestionBtns = document.querySelectorAll(".suggestion");

  // --- Search logic ---

  /**
   * Find the best matching answer from the knowledge base.
   * Returns the answer string or a fallback message.
   */
  function findAnswer(query) {
    var normalised = query.toLowerCase().trim();

    var bestMatch = null;
    var bestScore = 0;

    for (var i = 0; i < knowledgeBase.length; i++) {
      var entry = knowledgeBase[i];
      var score = 0;

      for (var k = 0; k < entry.keywords.length; k++) {
        var kw = entry.keywords[k];
        if (normalised === kw) {
          score += 10; // exact match
        } else if (normalised.indexOf(kw) !== -1) {
          score += 5; // substring match
        } else {
          // Check individual words
          var words = kw.split(/\s+/);
          for (var w = 0; w < words.length; w++) {
            if (normalised.indexOf(words[w]) !== -1) {
              score += 2;
            }
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }

    if (bestMatch && bestScore >= 2) {
      return bestMatch.answer;
    }

    return (
      "Thank you for your question! Re-Search is still learning and expanding its " +
      "knowledge base. In a full deployment, this query would be sent to an LLM " +
      "backend for a comprehensive answer. Try asking about 1AI, Re-Search, the " +
      "Global Operating System, QR Store, or Blue-Star."
    );
  }

  /**
   * Simulate a typing effect for the answer text.
   */
  function typeAnswer(container, text, callback) {
    var index = 0;
    var cursor = document.createElement("span");
    cursor.className = "typing-cursor";
    container.appendChild(cursor);

    var chunkSize = 3;
    var intervalMs = 18;

    var interval = setInterval(function () {
      if (index < text.length) {
        var end = Math.min(index + chunkSize, text.length);
        container.insertBefore(
          document.createTextNode(text.slice(index, end)),
          cursor
        );
        index = end;
      } else {
        clearInterval(interval);
        if (cursor.parentNode) {
          cursor.parentNode.removeChild(cursor);
        }
        if (callback) {
          callback();
        }
      }
    }, intervalMs);
  }

  /**
   * Perform a search and display results.
   */
  function performSearch(query) {
    if (!query.trim()) {
      return;
    }

    var answer = findAnswer(query);

    // Build result item
    var item = document.createElement("div");
    item.className = "result-item";

    var queryEl = document.createElement("div");
    queryEl.className = "result-query";
    queryEl.textContent = query;

    var answerEl = document.createElement("div");
    answerEl.className = "result-answer";

    item.appendChild(queryEl);
    item.appendChild(answerEl);

    // Prepend (newest first)
    if (resultsDiv.firstChild) {
      resultsDiv.insertBefore(item, resultsDiv.firstChild);
    } else {
      resultsDiv.appendChild(item);
    }

    resultsContainer.hidden = false;
    typeAnswer(answerEl, answer);

    // Scroll result into view
    item.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // --- Event listeners ---

  searchForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var query = searchInput.value;
    performSearch(query);
    searchInput.value = "";
  });

  for (var i = 0; i < suggestionBtns.length; i++) {
    suggestionBtns[i].addEventListener("click", function () {
      var query = this.getAttribute("data-query");
      searchInput.value = query;
      performSearch(query);
      searchInput.value = "";
    });
  }

  clearBtn.addEventListener("click", function () {
    resultsDiv.innerHTML = "";
    resultsContainer.hidden = true;
    searchInput.focus();
  });
})();
