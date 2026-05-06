const API_URL = "http://127.0.0.1:8000";

const sections = document.querySelectorAll("main > section");
document.querySelectorAll("nav button").forEach(btn => {
  btn.addEventListener("click", () => {
    sections.forEach(s => s.hidden = s.id !== btn.dataset.view);
  });
});
