(() => {
  const root = document.documentElement;
  const header = document.querySelector(".site-header");
  const progress = document.querySelector(".scroll-progress span");
  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector("#site-navigation");
  const heroCopy = document.querySelector(".hero-copy");
  const revealTargets = [...document.querySelectorAll("[data-reveal]")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Enable motion styles only after this script is ready; without JS, content stays visible.
  root.classList.add("js");

  const closeMenu = (restoreFocus = false) => {
    if (!menuButton || !navigation) return;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open menu");
    navigation.classList.remove("is-open");
    if (restoreFocus) menuButton.focus();
  };

  if (menuButton && navigation) {
    menuButton.addEventListener("click", () => {
      const isOpen = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!isOpen));
      menuButton.setAttribute("aria-label", isOpen ? "Open menu" : "Close menu");
      navigation.classList.toggle("is-open", !isOpen);
    });

    navigation.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu(true);
    });

    window.addEventListener("resize", () => {
      if (window.matchMedia("(min-width: 681px)").matches) closeMenu();
    });
  }

  let scrollFrame = 0;
  const updateScrollState = () => {
    if (scrollFrame) return;

    scrollFrame = window.requestAnimationFrame(() => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progressRatio = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
      if (progress) progress.style.transform = `scaleX(${Math.min(1, Math.max(0, progressRatio))})`;
      header?.classList.toggle("is-scrolled", window.scrollY > 12);
      scrollFrame = 0;
    });
  };

  updateScrollState();
  window.addEventListener("scroll", updateScrollState, { passive: true });
  window.addEventListener("resize", updateScrollState, { passive: true });

  const gallery = document.querySelector(".gallery-carousel");
  const galleryStage = gallery?.querySelector(".gallery-stage");
  const gallerySlides = [...(gallery?.querySelectorAll(".gallery-slide") ?? [])];
  const galleryControls = gallery?.querySelector(".gallery-controls");
  const galleryStatus = gallery?.querySelector(".gallery-status");
  const previousPhoto = gallery?.querySelector("[data-gallery-prev]");
  const nextPhoto = gallery?.querySelector("[data-gallery-next]");
  const galleryThumbnails = [...(gallery?.querySelectorAll("[data-gallery-thumbnail]") ?? [])];

  if (gallery && galleryStage && gallerySlides.length > 1 && galleryControls && galleryStatus && previousPhoto && nextPhoto && galleryThumbnails.length === gallerySlides.length) {
    let activePhoto = 0;
    let pointerStart = null;
    let autoAdvanceTimer = 0;

    const renderGallery = () => {
      const stageWidth = galleryStage.clientWidth;
      const distanceBetweenSlides = stageWidth * (window.innerWidth <= 680 ? 0.52 : 0.35);

      gallerySlides.forEach((slide, index) => {
        const halfLength = Math.floor(gallerySlides.length / 2);
        let offset = index - activePhoto;
        if (offset > halfLength) offset -= gallerySlides.length;
        if (offset < -halfLength) offset += gallerySlides.length;

        const distance = Math.abs(offset);
        slide.style.setProperty("--slide-x", `${offset * distanceBetweenSlides}px`);
        slide.style.setProperty("--slide-scale", String(Math.max(0.58, 1 - distance * 0.18)));
        slide.style.setProperty("--slide-opacity", String(Math.max(0.45, 1 - distance * 0.22)));
        slide.style.setProperty("--slide-depth", String(gallerySlides.length - distance));
        slide.dataset.active = String(offset === 0);
        slide.setAttribute("aria-hidden", String(offset !== 0));
        galleryThumbnails[index].setAttribute("aria-pressed", String(index === activePhoto));
      });

      galleryStatus.textContent = `Photo ${activePhoto + 1} of ${gallerySlides.length}`;
    };

    const showPhoto = (step) => {
      activePhoto = (activePhoto + step + gallerySlides.length) % gallerySlides.length;
      renderGallery();
    };

    const updateAutoAdvance = () => {
      if (reduceMotion.matches && autoAdvanceTimer) {
        window.clearInterval(autoAdvanceTimer);
        autoAdvanceTimer = 0;
      } else if (!reduceMotion.matches && !autoAdvanceTimer) {
        autoAdvanceTimer = window.setInterval(() => showPhoto(1), 5000);
      }
    };

    gallery.classList.add("is-enhanced");
    galleryControls.hidden = false;
    previousPhoto.addEventListener("click", () => showPhoto(-1));
    nextPhoto.addEventListener("click", () => showPhoto(1));
    galleryThumbnails.forEach((thumbnail, index) => {
      thumbnail.addEventListener("click", () => {
        activePhoto = index;
        renderGallery();
      });
    });
    galleryStage.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPhoto(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        showPhoto(1);
      }
    });
    galleryStage.addEventListener("pointerdown", (event) => {
      pointerStart = event.clientX;
    });
    galleryStage.addEventListener("pointerup", (event) => {
      if (pointerStart === null) return;
      const pointerDelta = event.clientX - pointerStart;
      pointerStart = null;
      if (Math.abs(pointerDelta) > 48) showPhoto(pointerDelta < 0 ? 1 : -1);
    });
    galleryStage.addEventListener("pointercancel", () => {
      pointerStart = null;
    });
    reduceMotion.addEventListener("change", updateAutoAdvance);
    window.addEventListener("resize", renderGallery, { passive: true });
    renderGallery();
    updateAutoAdvance();
  }

  if (heroCopy) {
    if (reduceMotion.matches) heroCopy.classList.add("is-visible");
    else requestAnimationFrame(() => heroCopy.classList.add("is-visible"));
  }

  const revealImmediately = () => {
    revealTargets.forEach((target) => target.classList.add("is-visible"));
  };

  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    revealImmediately();
  } else {
    // Sequence each section's parts in reading order without repeating the entrance.
    const revealOrder = new Map();
    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const section = entry.target.closest("section");
          const sequence = section ? revealOrder.get(section) ?? 0 : 0;
          if (section) revealOrder.set(section, sequence + 1);
          entry.target.style.setProperty("--reveal-delay", `${Math.min(sequence, 5) * 75}ms`);
          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
    );

    revealTargets.forEach((target) => observer.observe(target));
  }

  // A safety net for browser interruptions: after load, nothing in the first screen stays hidden.
  window.addEventListener(
    "load",
    () => {
      window.setTimeout(() => {
        revealTargets.forEach((target) => {
          const bounds = target.getBoundingClientRect();
          if (bounds.top < window.innerHeight && bounds.bottom > 0) {
            target.classList.add("is-visible");
          }
        });
      }, 1800);
    },
    { once: true }
  );

  const searchForm = document.querySelector("#listing-search");
  const searchStatus = document.querySelector("#search-status");
  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (searchStatus) {
      searchStatus.textContent = "Current listing results are not connected yet. Call Marci at 206-919-6886.";
    }
  });

  const cookieNotice = document.querySelector("#cookie-notice");
  cookieNotice?.querySelector(".cookie-accept")?.addEventListener("click", () => {
    cookieNotice.setAttribute("hidden", "");
  });
})();
