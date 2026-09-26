function createPresentationNavigator(slideCount, onLeaveLastSlide = () => {}) {
  let activeSlide = 0;
  const lastSlide = Math.max(slideCount - 1, 0);

  function goTo(index) {
    const previousSlide = activeSlide;
    activeSlide = Math.min(Math.max(index, 0), lastSlide);
    if (previousSlide === lastSlide && activeSlide !== lastSlide) onLeaveLastSlide();
    return activeSlide;
  }

  return {
    current: () => activeSlide,
    goTo,
    next: () => goTo(activeSlide + 1),
    previous: () => goTo(activeSlide - 1),
  };
}

function buildBookingUrl(answers) {
  const url = new URL('https://cal.com/je-bert');
  url.searchParams.set('duration', '15');
  const problems = answers.problems || [];
  if (problems.length) url.searchParams.set('notes', `Rencontre découverte Realsync\nProblèmes vécus :\n${problems.map((problem) => `- ${problem}`).join('\n')}`);
  return url.href;
}

function initializeImagePreview(dialog, image, buttons) {
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      image.src = button.dataset.preview;
      image.alt = button.dataset.previewTitle;
      dialog.setAttribute('aria-label', button.dataset.previewTitle);
      dialog.showModal();
    });
  });
  dialog.addEventListener('click', () => dialog.close());
}

function initPresentation() {
  const slides = [...document.querySelectorAll(".slide")];
  const navigator = createPresentationNavigator(slides.length, () => {
    questionnaire.reset();
    updateBookingLinks();
  });
  const progress = [...document.querySelectorAll(".progress-step")];
  const previousButton = document.querySelector("[data-previous]");
  const nextButton = document.querySelector("[data-next]");
  const screenNumber = document.querySelector("[data-screen-number]");
  const totalScreens = document.querySelector("[data-total-screens]");
  const liveStatus = document.querySelector("[data-live-status]");
  const questionnaire = document.querySelector('[data-questionnaire]');
  const previewDialog = document.querySelector('[data-preview-dialog]');
  initializeImagePreview(previewDialog, document.querySelector('[data-preview-image]'), document.querySelectorAll('[data-preview]'));
  let touchStart = null;

  if (!slides.length) return;

  totalScreens.textContent = String(slides.length);

  function render(index) {
    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === index;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
      slide.inert = !isActive;
    });

    progress.forEach((step, stepIndex) => {
      const isActive = stepIndex === index;
      step.classList.toggle("is-active", isActive);
      step.setAttribute("aria-current", isActive ? "step" : "false");
    });

    previousButton.disabled = index === 0;
    nextButton.disabled = index === slides.length - 1;
    screenNumber.textContent = String(index + 1);
    liveStatus.textContent = `Écran ${index + 1} sur ${slides.length} : ${slides[index].dataset.title}`;
  }

  function move(direction) {
    const index = direction === "next" ? navigator.next() : navigator.previous();
    render(index);
  }

  previousButton.addEventListener("click", () => move("previous"));
  nextButton.addEventListener("click", () => move("next"));

  progress.forEach((step, index) => {
    step.addEventListener("click", () => render(navigator.goTo(index)));
  });

  document.addEventListener("keydown", (event) => {
    if (previewDialog.open) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target instanceof Element && event.target.closest('input, select, textarea, [contenteditable="true"]')) return;
    if (event.key === ' ' && event.target instanceof Element && event.target.closest('button, a')) return;
    if (event.key === "ArrowRight" || event.key === " ") {
      event.preventDefault();
      move("next");
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move("previous");
    }
    if (event.key === "Home") render(navigator.goTo(0));
    if (event.key === "End") render(navigator.goTo(slides.length - 1));
  });

  document.addEventListener("pointerdown", (event) => {
    if (previewDialog.open) { touchStart = null; return; }
    const interactive = event.target instanceof Element && event.target.closest('a, button, input, label, select, textarea');
    touchStart = event.pointerType === 'touch' && !interactive ? { x: event.clientX, y: event.clientY } : null;
  });

  document.addEventListener("pointerup", (event) => {
    if (!touchStart || event.pointerType !== 'touch') return;
    const delta = event.clientX - touchStart.x;
    const verticalDelta = event.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(delta) < 60 || Math.abs(delta) < Math.abs(verticalDelta) * 1.5) return;
    move(delta < 0 ? "next" : "previous");
  });
  document.addEventListener('pointercancel', () => { touchStart = null; });

  function updateBookingLinks() {
    const answers = { problems: new FormData(questionnaire).getAll('problems') };
    const href = buildBookingUrl(answers);
    document.querySelectorAll('[data-booking]').forEach((link) => { link.href = href; });
  }
  questionnaire.addEventListener('change', updateBookingLinks);
  updateBookingLinks();

  render(0);
}

if (typeof document !== "undefined") {
  initPresentation();
}

// Classic script so the presentation also works when opened as a local file in Safari.
if (typeof module !== 'undefined') module.exports = { createPresentationNavigator, buildBookingUrl, initializeImagePreview };
