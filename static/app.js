
/* =================================
   A LITTLE BOUQUET FOR YOU
================================= */

const CONFIG = {
  dion: {
    name: "Dion",
    quote: "Replace this with a quote that reminds you of Dion.",
    morse: ".... . .-.. .-.. --- / -.. .. --- -.",
    song: "/static/audio/dion.mp3"
  },
  eunice: {
    name: "Eunice",
    quote: "Replace this with a quote that reminds you of Eunice.",
    morse: ".... . .-.. .-.. --- / . ..- -. .. -.-. .",
    song: "/static/audio/eunice.mp3"
  }
};

/* ELEMENT REFERENCES */

const body = document.body;
const homeView = document.getElementById("homeView");
const bouquetView = document.getElementById("bouquetView");
const dialog = document.getElementById("passwordDialog");
const passwordInput = document.getElementById("passwordInput");
const passwordError = document.getElementById("passwordError");
const passwordForm = document.getElementById("passwordForm");
const letter = document.getElementById("letter");
const decodedText = document.getElementById("decodedText");
const morseText = document.getElementById("morseText");
const stage = document.getElementById("bouquetStage");

let selectedFriend = null;
let audio = null;
let typingTimer = null;
let lastFocusedElement = null;
let isLoggingOut = false;

/* ACCESSIBILITY & UTILITIES */

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function stopTyping() {
  if (typingTimer) {
    clearTimeout(typingTimer);
    typingTimer = null;
  }
}

function stopMusic() {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    audio = null;
  }
}

function closePasswordDialog() {
  dialog.hidden = true;
  passwordError.textContent = "";
  if (lastFocusedElement) lastFocusedElement.focus();
}

function showPasswordDialog(friend) {
  if (!CONFIG[friend]) return;
  selectedFriend = friend;
  lastFocusedElement = document.activeElement;
  document.getElementById("passwordTitle").textContent = `A little gate for ${CONFIG[friend].name}.`;
  passwordError.textContent = "";
  passwordInput.value = "";
  dialog.hidden = false;
  setTimeout(() => passwordInput.focus(), 50);
}

/* FRIEND SELECTION */

document.querySelectorAll(".friend-card").forEach(button => {
  button.addEventListener("click", () => showPasswordDialog(button.dataset.friend));
});

/* PASSWORD DIALOG */

document.getElementById("closePassword").addEventListener("click", closePasswordDialog);

dialog.addEventListener("click", event => {
  if (event.target === dialog) closePasswordDialog();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !dialog.hidden) closePasswordDialog();
});

dialog.addEventListener("keydown", event => {
  if (event.key !== "Tab") return;

  const focusable = dialog.querySelectorAll('button:not([disabled]), input:not([disabled])');
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

/* PASSWORD AUTHENTICATION */

passwordForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!selectedFriend || !CONFIG[selectedFriend]) return;

  const submitButton = passwordForm.querySelector('button[type="submit"]');
  passwordError.textContent = "";

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Opening your bouquet...";
  }

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        friend: selectedFriend,
        password: passwordInput.value
      })
    });

    const result = await response.json();

    if (!response.ok) {
      passwordError.textContent = result.message || "That password isn't quite right. Try again.";
      passwordInput.select();
      return;
    }

    if (result.redirect) {
      window.location.href = result.redirect;
    } else {
      throw new Error("Missing redirect destination.");
    }
  } catch (error) {
    console.error("Login error:", error);
    passwordError.textContent = "Something went wrong. Please try again.";
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "open my bouquet ♡";
    }
  }
});

/* MORSE CODE DECODER */

function morseToText(code) {
  const alphabet = {
    ".-": "A", "-...": "B", "-.-.": "C", "-..": "D", ".": "E",
    "..-.": "F", "--.": "G", "....": "H", "..": "I", ".---": "J",
    "-.-": "K", ".-..": "L", "--": "M", "-.": "N", "---": "O",
    ".--.": "P", "--.-": "Q", ".-.": "R", "...": "S", "-": "T",
    "..-": "U", "...-": "V", ".--": "W", "-..-": "X", "-.--": "Y",
    "--..": "Z", "-----": "0", ".----": "1", "..---": "2",
    "...--": "3", "....-": "4", ".....": "5", "-....": "6",
    "--...": "7", "---..": "8", "----.": "9"
  };

  return code.trim().split(/\s*\/+\s*/).map(word =>
    word.trim().split(/\s+/).map(letter => alphabet[letter] || "").join("")
  ).filter(Boolean).join(" ");
}

/* TYPEWRITER EFFECT */

function typeText(target, text, delay = 65) {
  stopTyping();
  target.textContent = "";

  if (prefersReducedMotion.matches) {
    target.textContent = text;
    return;
  }

  let index = 0;

  function typeNextCharacter() {
    if (index >= text.length) {
      typingTimer = null;
      return;
    }

    target.textContent += text[index++];
    typingTimer = setTimeout(typeNextCharacter, delay);
  }

  typeNextCharacter();
}

/* BACKGROUND MUSIC */

function playMusic(song) {
  stopMusic();
  if (!song) return;

  audio = new Audio(song);
  audio.loop = true;
  audio.volume = 0.35;

  audio.play().catch(error => {
    console.info("Music playback unavailable.", error);
  });
}

/* BOUQUET ANIMATION */

function bloomBouquet() {
  if (!stage) return;
  stage.classList.remove("blooming");
  void stage.offsetWidth;
  stage.classList.add("blooming");
}

/* OPEN PERSONAL BOUQUET */

function openBouquet(friend) {
  const data = CONFIG[friend];
  if (!data) return;

  selectedFriend = friend;
  body.dataset.friend = friend;
  homeView.hidden = true;
  bouquetView.hidden = false;

  document.getElementById("topEyebrow").textContent = `A SMALL GIFT FOR ${data.name.toUpperCase()}`;
  document.getElementById("dedicationEyebrow").textContent = "gathered just for you";
  document.getElementById("dedicationTitle").textContent = `For ${data.name}`;
  document.getElementById("dedicationQuote").textContent = `“${data.quote}”`;

  morseText.textContent = data.morse;
  decodedText.textContent = "";
  letter.hidden = true;

  stopTyping();
  bloomBouquet();
  playMusic(data.song);

  window.scrollTo({
    top: 0,
    behavior: prefersReducedMotion.matches ? "instant" : "smooth"
  });
}

/* INITIAL SESSION CHECK */

const initialFriend = body.dataset.friend;

if (initialFriend && CONFIG[initialFriend]) {
  openBouquet(initialFriend);
}

/* HIDDEN LETTER */

document.getElementById("hiddenMessageButton").addEventListener("click", () => {
  letter.hidden = !letter.hidden;

  if (!letter.hidden) {
    stopTyping();
    decodedText.textContent = "";
    letter.scrollIntoView({
      behavior: prefersReducedMotion.matches ? "instant" : "smooth",
      block: "nearest"
    });
  }
});

/* CLOSE LETTER */

document.getElementById("closeLetter").addEventListener("click", () => {
  stopTyping();
  letter.hidden = true;
  decodedText.textContent = "";
});

/* DECODE HIDDEN MESSAGE */

document.getElementById("decodeButton").addEventListener("click", () => {
  const friend = body.dataset.friend;
  if (!CONFIG[friend]) return;

  const decodedMessage = morseToText(CONFIG[friend].morse);
  typeText(decodedText, decodedMessage, 75);
});

/* LEAVE THE GARDEN */

document.getElementById("backButton").addEventListener("click", leaveGarden);
document.getElementById("logoutButton").addEventListener("click", leaveGarden);

async function leaveGarden() {
  if (isLoggingOut) return;
  isLoggingOut = true;

  stopMusic();
  stopTyping();

  const buttons = [
    document.getElementById("backButton"),
    document.getElementById("logoutButton")
  ];

  buttons.forEach(button => button.disabled = true);

  try {
    await fetch("/logout", { method: "POST" });
  } catch (error) {
    console.error("Logout request failed:", error);
  } finally {
    window.location.href = "/";
  }
}