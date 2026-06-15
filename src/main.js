import $ from "jquery";

import "bootstrap/dist/css/bootstrap-grid.min.css";

import select2 from "select2";
import "select2/dist/css/select2.css";
import Inputmask from "inputmask";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

import LocomotiveScroll from "locomotive-scroll";
import "locomotive-scroll/dist/locomotive-scroll.css";
import noUiSlider from "nouislider";
import "nouislider/dist/nouislider.css";

import Swiper from "swiper";
import {
  EffectFade,
  FreeMode,
  Mousewheel,
  Navigation,
  Scrollbar,
  Thumbs,
} from "swiper/modules";

import { Fancybox } from "@fancyapps/ui";

import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/navigation";
import "swiper/css/scrollbar";
import "@fancyapps/ui/dist/fancybox/fancybox.css";

import "./scss/main.scss";

if (typeof document !== "undefined") {
  document.documentElement.classList.add("is-js");
}

select2($);

let locomotiveScrollInstance = null;
let locomotiveScrollObserver = null;
let locomotiveScrollTriggerBound = false;
let locomotiveScrollProxyBound = false;
let locomotiveScrollIsLocked = false;
let locomotiveResizeFrame = 0;
let locomotiveScrollTriggerUpdateFrame = 0;
let locomotiveLoadBound = false;
let locomotiveRefreshBound = false;
let modalsInitialized = false;
let headerScrollCleanup = null;
let catalogFilterChipsSwiper = null;
let catalogFilterChipRenderLocked = false;
const pageLockSources = new Set();

gsap.registerPlugin(ScrollTrigger);
gsap.registerPlugin(SplitText);

const onReady = (callback) => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback, { once: true });
    return;
  }

  callback();
};

const scheduleLocomotiveResize = () => {
  if (!locomotiveScrollInstance || locomotiveScrollIsLocked) return;
  if (locomotiveResizeFrame) return;

  locomotiveResizeFrame = window.requestAnimationFrame(() => {
    locomotiveResizeFrame = 0;
    locomotiveScrollInstance?.resize();
  });
};

const syncLocomotiveLockState = () => {
  if (!locomotiveScrollInstance) return;

  const shouldLock = document.documentElement.classList.contains("hidden");

  if (shouldLock === locomotiveScrollIsLocked) return;

  locomotiveScrollIsLocked = shouldLock;

  if (shouldLock) {
    if (locomotiveResizeFrame) {
      window.cancelAnimationFrame(locomotiveResizeFrame);
      locomotiveResizeFrame = 0;
    }

    locomotiveScrollInstance.stop();
    return;
  }

  locomotiveScrollInstance.start();
  scheduleLocomotiveResize();
};

const setPageScrollLocked = (source, isLocked) => {
  if (!source) return;

  if (isLocked) {
    pageLockSources.add(source);
  } else {
    pageLockSources.delete(source);
  }

  document.documentElement.classList.toggle("hidden", pageLockSources.size > 0);
  syncLocomotiveLockState();
};

const bindLocomotiveScrollTrigger = () => {
  if (!locomotiveScrollInstance) return;

  const scrollElement = document.documentElement;

  if (!locomotiveScrollProxyBound) {
    ScrollTrigger.scrollerProxy(scrollElement, {
      scrollTop(value) {
        if (arguments.length) {
          locomotiveScrollInstance.scrollTo(value, {
            duration: 0,
            disableLerp: true,
          });
        }

        return locomotiveScrollInstance?.scroll?.y ?? window.pageYOffset ?? 0;
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      },
      pinType: "transform",
    });

    ScrollTrigger.defaults({ scroller: scrollElement });
    ScrollTrigger.config({ ignoreMobileResize: true });
    locomotiveScrollProxyBound = true;
  }

  if (
    !locomotiveScrollTriggerBound &&
    typeof locomotiveScrollInstance.on === "function"
  ) {
    locomotiveScrollInstance.on("scroll", () => {
      if (locomotiveScrollTriggerUpdateFrame) return;

      locomotiveScrollTriggerUpdateFrame = window.requestAnimationFrame(() => {
        locomotiveScrollTriggerUpdateFrame = 0;
        ScrollTrigger.update();
      });
    });

    locomotiveScrollTriggerBound = true;
  }

  if (!locomotiveRefreshBound) {
    ScrollTrigger.addEventListener("refresh", scheduleLocomotiveResize);
    locomotiveRefreshBound = true;
  }
};

const initLocomotiveScroll = () => {
  if (!locomotiveScrollInstance) {
    locomotiveScrollInstance = new LocomotiveScroll({
      smooth: true,
      smartphone: {
        smooth: false,
      },
      tablet: {
        smooth: false,
      },
    });
  }

  bindLocomotiveScrollTrigger();

  syncLocomotiveLockState();

  if (!locomotiveScrollObserver) {
    let previousHiddenState =
      document.documentElement.classList.contains("hidden");

    locomotiveScrollObserver = new MutationObserver(() => {
      const nextHiddenState =
        document.documentElement.classList.contains("hidden");

      if (nextHiddenState === previousHiddenState) return;

      previousHiddenState = nextHiddenState;
      syncLocomotiveLockState();
    });

    locomotiveScrollObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  if (!locomotiveLoadBound) {
    window.addEventListener(
      "load",
      () => {
        scheduleLocomotiveResize();
        ScrollTrigger.refresh();
      },
      { once: true },
    );
    locomotiveLoadBound = true;
  }

  scheduleLocomotiveResize();

  return locomotiveScrollInstance;
};

const initHeroIntro = () => {
  if (!window.gsap) return;

  const heroEl = document.querySelector(".hero");
  if (!heroEl || heroEl.dataset.heroIntroInited === "true") return;

  heroEl.dataset.heroIntroInited = "true";

  const heroImageEl = heroEl.querySelector(".hero_gallery img");
  const heroTitleEl = heroEl.querySelector(".hero_wrap_text");
  const heroLabelEl = heroEl.querySelector(".hero_wrap_label");
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const HERO_INTRO_START_DELAY = 0.5;
  let pageLoaded = document.readyState === "complete";
  let imageLoaded = !heroImageEl || heroImageEl.complete;

  const completeIntro = () => {
    gsap.set(heroEl, {
      "--hero-overlay-opacity": 0,
      "--hero-image-scale": 1,
    });

    gsap.set([heroTitleEl, heroLabelEl], {
      autoAlpha: 1,
      clearProps: "visibility",
    });
  };

  const playIntro = () => {
    if (heroEl.dataset.heroIntroPlayed === "true") return;

    heroEl.dataset.heroIntroPlayed = "true";

    if (prefersReducedMotion) {
      completeIntro();
      return;
    }

    let titleSplit = null;
    let labelSplit = null;

    if (heroTitleEl && heroLabelEl) {
      titleSplit = new SplitText(heroTitleEl, {
        type: "lines",
        linesClass: "hero-title-line",
        mask: "lines",
      });

      labelSplit = new SplitText(heroLabelEl, {
        type: "lines",
        linesClass: "hero-label-line",
        mask: "lines",
      });
    }

    const titleLines = titleSplit?.lines ?? [];
    const labelLines = labelSplit?.lines ?? [];

    gsap.set([heroTitleEl, heroLabelEl], {
      autoAlpha: 1,
      y: 0,
      clearProps: "visibility",
    });

    if (titleLines.length) {
      gsap.set(titleLines, {
        yPercent: 110,
        autoAlpha: 1,
        willChange: "transform",
      });
    }

    if (labelLines.length) {
      gsap.set(labelLines, {
        yPercent: -110,
        autoAlpha: 1,
        willChange: "transform",
      });
    }

    const heroTimeline = gsap.timeline({
      defaults: {
        ease: "power3.out",
      },
      onComplete: () => {
        gsap.set([titleLines, labelLines], {
          clearProps: "willChange",
        });

        gsap.set([heroTitleEl, heroLabelEl], {
          clearProps: "transform",
        });
      },
    });

    heroTimeline.to(heroEl, {
      duration: 1.45,
      "--hero-overlay-opacity": 0,
      "--hero-image-scale": 1,
      clearProps: "willChange",
    });

    if (titleLines.length) {
      heroTimeline.to(
        titleLines,
        {
          yPercent: 0,
          duration: 0.82,
          stagger: 0.08,
        },
        "-=0.68",
      );
    }

    if (labelLines.length) {
      heroTimeline.to(
        labelLines,
        {
          yPercent: 0,
          duration: 0.72,
          stagger: 0.06,
        },
        "<0.06",
      );
    }

    if (heroTitleEl) {
      heroTimeline.to(
        heroTitleEl,
        {
          keyframes: [
            {
              y: -6,
              duration: 0.38,
              ease: "sine.out",
            },
            {
              y: 0,
              duration: 0.72,
              ease: "sine.out",
            },
          ],
          clearProps: "transform",
        },
        "<0.1",
      );
    }

    if (heroLabelEl) {
      heroTimeline.to(
        heroLabelEl,
        {
          keyframes: [
            {
              y: 6,
              duration: 0.36,
              ease: "sine.out",
            },
            {
              y: 0,
              duration: 0.68,
              ease: "sine.out",
            },
          ],
          clearProps: "transform",
        },
        "<0.04",
      );
    }
  };

  const scheduleIntroStart = () => {
    if (!pageLoaded || !imageLoaded) return;
    if (heroEl.dataset.heroIntroScheduled === "true") return;

    heroEl.dataset.heroIntroScheduled = "true";

    // Temporary debugging delay: start the intro 0.5s after full page load.
    window.setTimeout(() => {
      window.requestAnimationFrame(playIntro);
    }, HERO_INTRO_START_DELAY * 1000);
  };

  if (pageLoaded) {
    scheduleIntroStart();
  } else {
    window.addEventListener(
      "load",
      () => {
        pageLoaded = true;
        scheduleIntroStart();
      },
      { once: true },
    );
  }

  if (imageLoaded) {
    scheduleIntroStart();
    return;
  }

  heroImageEl.addEventListener(
    "load",
    () => {
      imageLoaded = true;
      scheduleIntroStart();
    },
    { once: true },
  );

  heroImageEl.addEventListener(
    "error",
    () => {
      imageLoaded = true;
      scheduleIntroStart();
    },
    { once: true },
  );
};

const initHomeCategoriesParallax = () => {
  if (!window.gsap || !window.ScrollTrigger) return;

  const cardImageEls = document.querySelectorAll(
    ".home_categories_row_card_image",
  );
  if (!cardImageEls.length) return;

  cardImageEls.forEach((cardImageEl) => {
    if (cardImageEl.dataset.parallaxInited === "true") return;

    const imageEl = cardImageEl.querySelector("img");
    if (!imageEl) return;

    const getMotionConfig = () => {
      if (window.matchMedia("(max-width: 767px)").matches) {
        return { maxOffset: 12, scaleBuffer: 0.04 };
      }

      if (window.matchMedia("(max-width: 1199px)").matches) {
        return { maxOffset: 22, scaleBuffer: 0.035 };
      }

      return { maxOffset: 34, scaleBuffer: 0.03 };
    };

    const syncImageScale = () => {
      const rect = cardImageEl.getBoundingClientRect();
      const { maxOffset, scaleBuffer } = getMotionConfig();
      const safeHeight = Math.max(rect.height, 1);
      const imageScale = 1 + (maxOffset * 2) / safeHeight + scaleBuffer;

      gsap.set(imageEl, {
        scale: imageScale,
        transformOrigin: "center center",
        willChange: "transform",
      });
    };

    const updateImageOffset = () => {
      const rect = cardImageEl.getBoundingClientRect();
      const { maxOffset } = getMotionConfig();
      const viewportCenter = window.innerHeight / 2;
      const cardCenter = rect.top + rect.height / 2;
      const normalizedDistance = (cardCenter - viewportCenter) / viewportCenter;
      const clampedDistance = Math.max(-1, Math.min(1, normalizedDistance));

      gsap.set(imageEl, { y: clampedDistance * maxOffset });
    };

    syncImageScale();
    updateImageOffset();

    ScrollTrigger.create({
      trigger: cardImageEl,
      start: "top bottom",
      end: "bottom top",
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: updateImageOffset,
      onRefresh: () => {
        syncImageScale();
        updateImageOffset();
      },
      onRefreshInit: () => {
        syncImageScale();
        updateImageOffset();
      },
    });

    cardImageEl.dataset.parallaxInited = "true";
  });
};

const initHeaderMenuToggle = () => {
  const header = document.querySelector(".header");
  const button = document.querySelector(".header_wrap_btn");
  const menu = document.querySelector(".header_menu");

  if (!button || !menu) return;

  const closeMenu = () => {
    header?.classList.remove("active");
    button.classList.remove("active");
    menu.classList.remove("active");
    setPageScrollLocked("menu", false);
  };

  const openMenu = () => {
    header?.classList.add("active");
    button.classList.add("active");
    menu.classList.add("active");
    setPageScrollLocked("menu", true);
  };

  const toggleMenu = () => {
    if (button.classList.contains("active")) {
      closeMenu();
      return;
    }

    openMenu();
  };

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleMenu();
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    const clickedInsideMenu = target.closest(".header_menu");
    const clickedButton = target.closest(".header_wrap_btn");

    if (clickedInsideMenu || clickedButton) return;
    closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
};

const initHeaderScrollState = () => {
  const header = document.querySelector(".header");
  if (!header) return;

  headerScrollCleanup?.();

  const scrollThreshold = 70;
  let frameId = 0;

  const getScrollTop = () => {
    if (typeof locomotiveScrollInstance?.scroll?.y === "number") {
      return locomotiveScrollInstance.scroll.y;
    }

    return window.scrollY || window.pageYOffset || 0;
  };

  const syncHeaderState = () => {
    header.classList.toggle("scrolled", getScrollTop() > scrollThreshold);
  };

  const requestHeaderSync = () => {
    if (frameId) return;

    frameId = window.requestAnimationFrame(() => {
      frameId = 0;
      syncHeaderState();
    });
  };

  let detachLocomotiveScroll = null;
  let handleWindowScroll = null;

  if (typeof locomotiveScrollInstance?.on === "function") {
    const handleLocomotiveScroll = () => {
      requestHeaderSync();
    };

    locomotiveScrollInstance.on("scroll", handleLocomotiveScroll);

    detachLocomotiveScroll = () => {
      if (typeof locomotiveScrollInstance?.off === "function") {
        locomotiveScrollInstance.off("scroll", handleLocomotiveScroll);
      }
    };
  } else {
    handleWindowScroll = () => {
      requestHeaderSync();
    };

    window.addEventListener("scroll", handleWindowScroll, { passive: true });
  }

  syncHeaderState();

  headerScrollCleanup = () => {
    if (handleWindowScroll) {
      window.removeEventListener("scroll", handleWindowScroll);
    }

    if (frameId) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    }

    detachLocomotiveScroll?.();
  };
};

const initFancybox = () => {
  if (!document.querySelector("[data-fancybox]")) return;

  Fancybox.bind("[data-fancybox]", {
    dragToClose: false,
    Thumbs: {
      type: "classic",
    },
    hideScrollbar: false,
    groupAll: false,
    wheel: false,
    infinite: false,
    fadeEffect: true,
    zoomEffect: false,
    showClass: "f-fadeIn",
    hideClass: "f-fadeOut",
    Images: {
      zoom: false,
    },
    on: {
      ready: () => setPageScrollLocked("fancybox", true),
      close: () => setPageScrollLocked("fancybox", false),
      destroy: () => setPageScrollLocked("fancybox", false),
    },
  });
};

const initSelect2 = () => {
  if (!($.fn && $.fn.select2)) return;

  const updateSelectionSummary = ($element) => {
    if (!$element.data("selection-summary")) return;

    const summaryLabel = $element.data("summary-label") || "";
    const selectedValues = $element.val();
    const selectedCount = Array.isArray(selectedValues)
      ? selectedValues.filter(Boolean).length
      : selectedValues
        ? 1
        : 0;
    const summaryText = selectedCount
      ? `${summaryLabel} (${selectedCount})`
      : summaryLabel;
    const renderedNode = $element
      .next(".select2-container")
      .find(".select2-selection__rendered")
      .get(0);

    if (!renderedNode) return;

    renderedNode.textContent = summaryText;
    renderedNode.setAttribute("title", summaryText);
  };

  $(".js-select2").each((_, element) => {
    const $element = $(element);

    if ($element.hasClass("select2-hidden-accessible")) return;

    const selectionCssClass = $element.data("selection-class") || "";
    const dropdownCssClass = $element.data("dropdown-class") || "";
    const dropdownParentSelector = $element.data("dropdown-parent");
    const isCatalogToolbarSelect = $element.hasClass(
      "listings_wrap_content_toolbar_sort_form_select_field",
    );
    const $dropdownParent = dropdownParentSelector
      ? $(dropdownParentSelector).first()
      : isCatalogToolbarSelect
        ? $element.closest(".listings_wrap_content_toolbar_sort_form")
        : $element.parent();

    const placeholder = $element.data("placeholder");
    const isCatalogSortSelect =
      dropdownCssClass === "catalog_filter_sort_dropdown";
    const selectOptions = {
      width: "100%",
      minimumResultsForSearch: $element.data("search") ? 0 : -1,
      allowClear: Boolean($element.data("allow-clear")),
      closeOnSelect: !$element.prop("multiple"),
      dropdownParent: $dropdownParent.length
        ? $dropdownParent
        : $element.parent(),
      selectionCssClass,
      dropdownCssClass,
    };

    if (isCatalogSortSelect) {
      selectOptions.dropdownAutoWidth = true;
    }

    if (placeholder) {
      selectOptions.placeholder = placeholder;
    }

    $element.select2(selectOptions);

    if ($element.data("selection-summary")) {
      updateSelectionSummary($element);
      $element.on("change select2:select select2:unselect", () => {
        updateSelectionSummary($element);
      });
    }
  });
};

const initPhoneMasks = () => {
  const phoneInputs = document.querySelectorAll('input[type="tel"]');
  if (!phoneInputs.length) return;

  const phoneMask = new Inputmask({
    mask: "+7 (999) 999 99 99",
    showMaskOnHover: false,
  });

  phoneMask.mask(phoneInputs);
};

const initGlobalSelect2LenisGuard = () => {
  if (document.body.dataset.select2LenisGuardInited === "true") return;

  document.body.dataset.select2LenisGuardInited = "true";

  const applyLenisPrevent = () => {
    document
      .querySelectorAll(
        ".select2-container.select2-container--default.select2-container--open .select2-results__options, .select2-results > .select2-results__options",
      )
      .forEach((resultsList) => {
        resultsList.setAttribute("data-lenis-prevent", "");
      });
  };

  applyLenisPrevent();

  const observer = new MutationObserver(() => {
    applyLenisPrevent();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
};

const initHomeShowcaseSliders = () => {
  const sectionNodes = document.querySelectorAll(".home_showcase");
  if (!sectionNodes.length) return;

  sectionNodes.forEach((section) => {
    if (section.dataset.sliderInited === "true") return;

    const sliderEl = section.querySelector(".home_showcase_wrap_slider.swiper");
    const prevEl = section.querySelector(
      ".home_showcase_wrap_head_bottom_navigation_prev",
    );
    const nextEl = section.querySelector(
      ".home_showcase_wrap_head_bottom_navigation_next",
    );
    const scrollbarEl = section.querySelector(
      ".home_showcase_wrap_head_bottom_scrollbar",
    );
    const slideEls = section.querySelectorAll(
      ".home_showcase_wrap_slider_card",
    );

    if (
      !sliderEl ||
      !prevEl ||
      !nextEl ||
      !scrollbarEl ||
      slideEls.length <= 1
    ) {
      return;
    }

    section.dataset.sliderInited = "true";

    const syncSliderState = (swiperInstance) => {
      if (!swiperInstance) return;
      section.classList.toggle("is-locked", Boolean(swiperInstance.isLocked));
    };

    const syncSliderGlow = (swiperInstance) => {
      if (!swiperInstance) return;

      const isShiftedLeft =
        Math.abs(swiperInstance.translate || 0) > 2 &&
        !(
          swiperInstance.isBeginning ||
          Number(swiperInstance.progress || 0) <= 0.001
        );

      sliderEl.classList.toggle("is-active", isShiftedLeft);
    };

    new Swiper(sliderEl, {
      modules: [Navigation, Scrollbar],
      slidesPerView: "auto",
      speed: 800,
      watchOverflow: true,
      breakpoints: {
        1: {
          spaceBetween: 7,
        },
        1200: {
          spaceBetween: 10,
        },
      },
      navigation: {
        prevEl,
        nextEl,
      },
      scrollbar: {
        el: scrollbarEl,
        draggable: true,
      },
      on: {
        init(swiperInstance) {
          syncSliderState(swiperInstance);
          syncSliderGlow(swiperInstance);
        },
        lock(swiperInstance) {
          syncSliderState(swiperInstance);
          syncSliderGlow(swiperInstance);
        },
        unlock(swiperInstance) {
          syncSliderState(swiperInstance);
          syncSliderGlow(swiperInstance);
        },
        setTranslate(swiperInstance) {
          syncSliderGlow(swiperInstance);
        },
        resize(swiperInstance) {
          syncSliderState(swiperInstance);
          syncSliderGlow(swiperInstance);
        },
        update(swiperInstance) {
          syncSliderState(swiperInstance);
          syncSliderGlow(swiperInstance);
        },
        transitionEnd(swiperInstance) {
          syncSliderGlow(swiperInstance);
        },
        reachBeginning(swiperInstance) {
          syncSliderGlow(swiperInstance);
        },
        fromEdge(swiperInstance) {
          syncSliderGlow(swiperInstance);
        },
      },
    });
  });
};

const initHomeShowcaseReveal = () => {
  if (!window.gsap || !window.ScrollTrigger) return;

  const sectionEls = document.querySelectorAll(".home_showcase");
  if (!sectionEls.length) return;

  sectionEls.forEach((sectionEl) => {
    if (sectionEl.dataset.revealInited === "true") return;

    const cardEls = sectionEl.querySelectorAll(
      ".home_showcase_wrap_slider_card",
    );
    if (!cardEls.length) return;

    gsap.to(cardEls, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power2.out",
      stagger: 0.12,
      scrollTrigger: {
        trigger: sectionEl,
        start: "top 80%",
        once: true,
      },
    });

    sectionEl.dataset.revealInited = "true";
  });
};

const initProductRecommendationsReveal = () => {
  if (!window.gsap || !window.ScrollTrigger) return;

  const sectionEl = document.querySelector(".product_recommendations");
  if (!sectionEl || sectionEl.dataset.revealInited === "true") return;

  const cardEls = sectionEl.querySelectorAll(
    ".product_recommendations_slider_card",
  );
  if (!cardEls.length) return;

  gsap.to(cardEls, {
    opacity: 1,
    y: 0,
    duration: 0.8,
    ease: "power2.out",
    stagger: 0.12,
    scrollTrigger: {
      trigger: sectionEl,
      start: "top 80%",
      once: true,
    },
  });

  sectionEl.dataset.revealInited = "true";
};

const initCatalogContentReveal = (root = document) => {
  if (!window.gsap || !window.ScrollTrigger) return;

  const catalogContentEl =
    root instanceof Element
      ? root.matches(".catalog_page_wrap_content")
        ? root
        : root.querySelector(".catalog_page_wrap_content")
      : document.querySelector(".catalog_page_wrap_content");

  if (!catalogContentEl) return;

  const blockEls = Array.from(
    catalogContentEl.querySelectorAll(".catalog_page_wrap_content_block"),
  );
  if (blockEls.length <= 1) return;

  let hasNewTriggers = false;

  blockEls.forEach((blockEl, index) => {
    if (index === 0 || blockEl.dataset.revealInited === "true") return;

    const cardEls = Array.from(blockEl.querySelectorAll(".product_card"));
    if (!cardEls.length) return;

    const orderedCardEls = cardEls
      .map((cardEl) => ({
        cardEl,
        rect: cardEl.getBoundingClientRect(),
      }))
      .sort((a, b) => {
        const topDiff = Math.abs(a.rect.top - b.rect.top);

        if (topDiff > 10) {
          return a.rect.top - b.rect.top;
        }

        return a.rect.left - b.rect.left;
      })
      .map(({ cardEl }) => cardEl);

    orderedCardEls.forEach((cardEl) => {
      cardEl.classList.add("is-catalog-reveal-pending");
    });

    gsap.to(orderedCardEls, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power2.out",
      stagger: 0.12,
      scrollTrigger: {
        trigger: blockEl,
        start: "top 82%",
        once: true,
      },
      onComplete: () => {
        orderedCardEls.forEach((cardEl) => {
          cardEl.classList.remove("is-catalog-reveal-pending");
        });
      },
    });

    blockEl.dataset.revealInited = "true";
    hasNewTriggers = true;
  });

  if (hasNewTriggers) {
    ScrollTrigger.refresh();
  }
};

const initProductPageGallery = () => {
  const galleryEl = document.querySelector(".product_page_gallery");
  if (!galleryEl || galleryEl.dataset.galleryInited === "true") return;

  const thumbsEl = galleryEl.querySelector(
    ".product_page_gallery_thumbs.swiper",
  );
  const imageEl = galleryEl.querySelector(".product_page_gallery_image.swiper");

  if (!thumbsEl || !imageEl) return;

  galleryEl.dataset.galleryInited = "true";
  const mobileMediaQuery = window.matchMedia("(max-width: 767px)");
  const resizeTimeoutIds = new Set();
  const THUMB_IMAGE_RATIO = 216 / 144;
  let thumbsSwiper = null;
  let imageSwiper = null;
  let resizeObserver = null;
  let currentMode = "";
  let syncFrameId = 0;
  let postSyncFrameId = 0;

  const clearThumbsSizing = () => {
    thumbsEl.style.height = "";
    thumbsEl.style.maxHeight = "";

    thumbsEl.querySelectorAll(".swiper-slide").forEach((slideEl) => {
      slideEl.style.height = "";
    });
  };

  const getImageHeight = () => {
    return imageEl.getBoundingClientRect().height;
  };

  const syncThumbsHeight = () => {
    const imageHeight = getImageHeight();
    if (!imageHeight) return;

    thumbsEl.style.height = `${Math.round(imageHeight)}px`;
    thumbsEl.style.maxHeight = `${Math.round(imageHeight)}px`;
  };

  const syncThumbSlidesHeight = () => {
    const thumbWidth =
      thumbsEl.clientWidth || thumbsEl.getBoundingClientRect().width;
    if (!thumbWidth) return;

    const thumbHeight = Math.round(thumbWidth * THUMB_IMAGE_RATIO);

    thumbsEl.querySelectorAll(".swiper-slide").forEach((slideEl) => {
      slideEl.style.height = `${thumbHeight}px`;
    });
  };

  const syncThumbsHeightWithUpdate = () => {
    if (!thumbsSwiper || !imageSwiper || currentMode !== "desktop") return;

    clearThumbsSizing();
    imageSwiper.update();
    syncThumbsHeight();
    syncThumbSlidesHeight();
    thumbsSwiper.update();
  };

  const queueDelayedSync = (delay) => {
    const timeoutId = window.setTimeout(() => {
      resizeTimeoutIds.delete(timeoutId);
      syncThumbsHeightWithUpdate();
    }, delay);

    resizeTimeoutIds.add(timeoutId);
  };

  const scheduleThumbsSync = () => {
    if (syncFrameId) {
      window.cancelAnimationFrame(syncFrameId);
    }

    if (postSyncFrameId) {
      window.cancelAnimationFrame(postSyncFrameId);
    }

    resizeTimeoutIds.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    resizeTimeoutIds.clear();

    syncFrameId = window.requestAnimationFrame(() => {
      syncFrameId = 0;

      syncThumbsHeightWithUpdate();

      postSyncFrameId = window.requestAnimationFrame(() => {
        postSyncFrameId = 0;
        syncThumbsHeightWithUpdate();
      });
    });

    queueDelayedSync(80);
    queueDelayedSync(180);
  };

  const destroyGallerySwipers = () => {
    thumbsSwiper?.destroy(true, true);
    imageSwiper?.destroy(true, true);
    thumbsSwiper = null;
    imageSwiper = null;
  };

  const disconnectResizeObserver = () => {
    resizeObserver?.disconnect();
    resizeObserver = null;
  };

  const connectResizeObserver = () => {
    if (!("ResizeObserver" in window) || currentMode !== "desktop") return;

    disconnectResizeObserver();

    resizeObserver = new ResizeObserver(() => {
      scheduleThumbsSync();
    });

    resizeObserver.observe(imageEl);
    resizeObserver.observe(galleryEl);
  };

  const bindDesktopSwiperEvents = () => {
    imageSwiper?.on("resize", scheduleThumbsSync);
    imageSwiper?.on("imagesReady", scheduleThumbsSync);
    imageSwiper?.on("slideChangeTransitionEnd", scheduleThumbsSync);
    thumbsSwiper?.on("resize", scheduleThumbsSync);
  };

  const initDesktopGallery = () => {
    currentMode = "desktop";
    clearThumbsSizing();

    thumbsSwiper = new Swiper(thumbsEl, {
      modules: [FreeMode, Mousewheel, Thumbs],
      direction: "vertical",
      slidesPerView: "auto",
      freeMode: true,
      mousewheel: {
        forceToAxis: true,
        releaseOnEdges: false,
      },
      breakpoints: {
        1: {
          spaceBetween: 7,
        },
        1200: {
          spaceBetween: 10,
        },
      },
      watchSlidesProgress: true,
      slideToClickedSlide: true,
    });

    imageSwiper = new Swiper(imageEl, {
      modules: [EffectFade, Thumbs],
      effect: "fade",
      fadeEffect: {
        crossFade: true,
      },
      speed: 500,
      allowTouchMove: false,
      thumbs: {
        swiper: thumbsSwiper,
      },
    });

    bindDesktopSwiperEvents();
    connectResizeObserver();
    scheduleThumbsSync();
  };

  const initMobileGallery = () => {
    currentMode = "mobile";
    clearThumbsSizing();
    disconnectResizeObserver();

    imageSwiper = new Swiper(imageEl, {
      speed: 800,
      slidesPerView: "auto",
      spaceBetween: 7,
      allowTouchMove: true,
    });
  };

  const syncGalleryMode = () => {
    const nextMode = mobileMediaQuery.matches ? "mobile" : "desktop";
    if (nextMode === currentMode) {
      if (nextMode === "desktop") {
        scheduleThumbsSync();
      } else {
        imageSwiper?.update();
      }
      return;
    }

    destroyGallerySwipers();
    clearThumbsSizing();

    if (nextMode === "mobile") {
      initMobileGallery();
      return;
    }

    initDesktopGallery();
  };

  window.addEventListener("resize", syncGalleryMode);
  window.addEventListener("orientationchange", syncGalleryMode);
  window.addEventListener("load", syncGalleryMode);
  window.addEventListener("pageshow", syncGalleryMode);
  window.visualViewport?.addEventListener("resize", syncGalleryMode);
  mobileMediaQuery.addEventListener("change", syncGalleryMode);

  imageEl.querySelectorAll("img").forEach((imageNode) => {
    if (imageNode.complete) return;

    imageNode.addEventListener("load", syncGalleryMode, {
      once: true,
    });
  });

  syncGalleryMode();
};

const initProductRecommendationsSlider = () => {
  const sectionEl = document.querySelector(".product_recommendations");
  if (!sectionEl || sectionEl.dataset.sliderInited === "true") return;

  const sliderEl = sectionEl.querySelector(
    ".product_recommendations_slider.swiper",
  );
  const prevEl = sectionEl.querySelector(
    ".product_recommendations_head_navigation_prev",
  );
  const nextEl = sectionEl.querySelector(
    ".product_recommendations_head_navigation_next",
  );
  const scrollbarEl = sectionEl.querySelector(
    ".product_recommendations_scrollbar",
  );

  if (!sliderEl || !prevEl || !nextEl || !scrollbarEl) return;

  sectionEl.dataset.sliderInited = "true";

  new Swiper(sliderEl, {
    modules: [Navigation, Scrollbar],
    speed: 800,
    watchOverflow: true,
    navigation: {
      prevEl,
      nextEl,
    },
    breakpoints: {
      1: {
        spaceBetween: 7,
        slidesPerView: "auto",
      },
      1200: {
        slidesPerView: 4,
        spaceBetween: 10,
      },
    },
    scrollbar: {
      el: scrollbarEl,
      draggable: true,
    },
  });
};

const headerCounterState = {
  wishlist: 0,
  basket: 0,
};

const parseCounterValue = (text) => {
  const match = String(text || "").match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
};

const updateHeaderCountersUi = () => {
  const wishlistCounterEls = document.querySelectorAll(".wishlist-counter");
  const basketCounterEls = document.querySelectorAll(".product-counter");
  const wishlistTextEl = document.querySelector(
    'a[href="/wishlist/"] .header_wrap_nav_link_text',
  );
  const basketTextEl = document.querySelector(
    'a[href="/basket/"] .header_wrap_nav_link_text',
  );

  wishlistCounterEls.forEach((element) => {
    element.textContent = String(headerCounterState.wishlist);
  });

  basketCounterEls.forEach((element) => {
    element.textContent = String(headerCounterState.basket);
  });

  if (wishlistTextEl) {
    wishlistTextEl.textContent = `Избранное (${headerCounterState.wishlist})`;
  }

  if (basketTextEl) {
    basketTextEl.textContent = `Корзина (${headerCounterState.basket})`;
  }
};

const initHeaderCountersState = () => {
  const wishlistCounterEl = document.querySelector(".wishlist-counter");
  const basketCounterEl = document.querySelector(".product-counter");

  headerCounterState.wishlist = parseCounterValue(
    wishlistCounterEl?.textContent,
  );
  headerCounterState.basket = parseCounterValue(basketCounterEl?.textContent);

  updateHeaderCountersUi();
};

const initProductCartAction = () => {
  const cartLink = document.querySelector(".product_page_form_actions_cart");
  const sizeSelect = document.querySelector("#product-size");
  const noticeEl = document.querySelector(".product_page_form_actions_notice");
  if (
    !cartLink ||
    !sizeSelect ||
    !noticeEl ||
    cartLink.dataset.cartActionInited === "true"
  ) {
    return;
  }

  const textEl = cartLink.querySelector(".product_page_form_actions_cart_text");
  if (!textEl) return;

  cartLink.dataset.cartActionInited = "true";
  const addedSizes = new Set();

  let noticeTimeoutId = 0;

  const syncCartState = () => {
    const selectedSize = sizeSelect.value;
    const hasSelectedSize = Boolean(selectedSize);
    const isAddedSize = hasSelectedSize && addedSizes.has(selectedSize);

    cartLink.classList.remove("is-loading");

    if (isAddedSize) {
      cartLink.classList.add("is-added");
      cartLink.setAttribute("href", "/cart/");
      cartLink.setAttribute("aria-label", "Перейти в корзину");
      textEl.textContent = "Перейти в корзину";
      return;
    }

    cartLink.classList.remove("is-added");
    cartLink.setAttribute("href", "#");
    cartLink.setAttribute("aria-label", "Добавить товар в корзину");
    textEl.textContent = "Добавить в корзину";
  };

  const showSizeNotice = () => {
    if (noticeTimeoutId) {
      window.clearTimeout(noticeTimeoutId);
    }

    noticeEl.classList.add("is-visible");

    noticeTimeoutId = window.setTimeout(() => {
      noticeEl.classList.remove("is-visible");
      noticeTimeoutId = 0;
    }, 2200);
  };

  const handleSizeStateChange = () => {
    noticeEl.classList.remove("is-visible");
    syncCartState();
  };

  sizeSelect.addEventListener("change", handleSizeStateChange);
  sizeSelect.addEventListener("input", handleSizeStateChange);

  if (window.$) {
    window
      .$(sizeSelect)
      .on("select2:select select2:clear select2:close", () => {
        window.requestAnimationFrame(() => {
          handleSizeStateChange();
        });
      });
  }

  syncCartState();

  cartLink.addEventListener("click", (event) => {
    if (cartLink.classList.contains("is-added")) return;

    event.preventDefault();

    if (cartLink.classList.contains("is-loading")) return;

    if (!sizeSelect.value) {
      showSizeNotice();
      return;
    }

    cartLink.classList.add("is-loading");

    window.setTimeout(() => {
      addedSizes.add(sizeSelect.value);
      headerCounterState.basket += 1;
      updateHeaderCountersUi();
      syncCartState();
    }, 1200);
  });
};

const initFavoriteButtons = () => {
  const favoriteButtons = document.querySelectorAll(
    ".product_page_form_actions_favorite, .basket_page_list_item_media_favorite, .product_card_media_favorite",
  );
  if (!favoriteButtons.length) return;

  favoriteButtons.forEach((favoriteButton) => {
    if (favoriteButton.dataset.favoriteActionInited === "true") return;

    favoriteButton.dataset.favoriteActionInited = "true";

    favoriteButton.addEventListener("click", (event) => {
      event.preventDefault();

      if (favoriteButton.classList.contains("is-added")) {
        favoriteButton.classList.remove("is-added");
        headerCounterState.wishlist = Math.max(
          0,
          headerCounterState.wishlist - 1,
        );
        updateHeaderCountersUi();
        return;
      }

      favoriteButton.classList.add("is-added");
      headerCounterState.wishlist += 1;
      updateHeaderCountersUi();
    });
  });
};

const initProductFavoriteAction = initFavoriteButtons;

const initModals = () => {
  const cartModalNodes = document.querySelectorAll(".cart_modal[data-modal]");
  if (!cartModalNodes.length || modalsInitialized) return;

  const getModal = (modalSelector) => {
    if (!modalSelector) return null;
    return document.querySelector(`.cart_modal[data-modal="${modalSelector}"]`);
  };

  const setModalPageState = (isOpen) => {
    document.documentElement.classList.toggle("is-modal", isOpen);
    setPageScrollLocked("modal", isOpen);
  };

  const syncModalPageState = () => {
    const hasActiveCartModal = Boolean(
      document.querySelector(".cart_modal.active"),
    );
    setModalPageState(hasActiveCartModal);
  };

  const closeAllModals = () => {
    document.querySelectorAll(".cart_modal.active").forEach((modal) => {
      modal.classList.remove("active");
      modal.setAttribute("aria-hidden", "true");
    });

    syncModalPageState();
  };

  const openModal = (modalSelector) => {
    const modalEl = getModal(modalSelector);
    if (!modalEl) return;

    closeAllModals();
    modalEl.classList.add("active");
    modalEl.setAttribute("aria-hidden", "false");
    setModalPageState(true);
  };

  const closeModal = (modalSelector) => {
    const modalEl = getModal(modalSelector);
    if (!modalEl) return;

    modalEl.classList.remove("active");
    modalEl.setAttribute("aria-hidden", "true");
    syncModalPageState();
  };

  document.addEventListener("click", (event) => {
    const openBtn = event.target.closest(
      ".open-modal, [data-modal-open], .data-open-modal, [data-open-modal]",
    );
    if (openBtn) {
      event.preventDefault();
      event.stopPropagation();
      openModal(
        openBtn.dataset.modal ||
          openBtn.dataset.modalOpen ||
          openBtn.dataset.openModal,
      );
      return;
    }

    const closeBtn = event.target.closest(
      ".close-modal, [data-modal-close], .data-close-modal, [data-close-modal]",
    );
    if (closeBtn) {
      event.preventDefault();
      event.stopPropagation();
      closeModal(
        closeBtn.dataset.modal ||
          closeBtn.dataset.modalClose ||
          closeBtn.dataset.closeModal,
      );
      return;
    }
  });

  document.addEventListener("mousedown", (event) => {
    const openedCartModal = document.querySelector(".cart_modal.active");
    if (!openedCartModal) return;
    if (event.target.closest(".cart_modal_wrap")) return;

    closeModal(openedCartModal.dataset.modal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllModals();
    }
  });

  window.appModal = {
    open: openModal,
    close: closeModal,
    closeAll: closeAllModals,
  };

  modalsInitialized = true;
};

const formatPriceRangeValue = (value) =>
  Math.round(Number(value) || 0).toLocaleString("ru-RU");

const parsePriceRangeValue = (value) => {
  const normalizedValue = String(value ?? "").replace(/[^\d]/g, "");
  return Number(normalizedValue || 0);
};

const initCartFilterPriceSlider = () => {
  const priceSliderNodes = document.querySelectorAll("[data-filter-price-slider]");
  if (!priceSliderNodes.length) return;

  priceSliderNodes.forEach((sliderNode) => {
    if (!sliderNode || sliderNode.noUiSlider) return;

    const priceBlock = sliderNode.closest("[data-filter-price]");
    const minInput = priceBlock?.querySelector("[data-filter-price-min]");
    const maxInput = priceBlock?.querySelector("[data-filter-price-max]");
    const min = Number(sliderNode.dataset.min);
    const max = Number(sliderNode.dataset.max);
    const step = Number(sliderNode.dataset.step || 100);
    const startMin = Number(sliderNode.dataset.startMin || min);
    const startMax = Number(sliderNode.dataset.startMax || max);

    if (
      !minInput ||
      !maxInput ||
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      typeof noUiSlider?.create !== "function"
    ) {
      return;
    }

    noUiSlider.create(sliderNode, {
      start: [startMin, startMax],
      connect: true,
      step,
      range: { min, max },
    });

    sliderNode.noUiSlider.on("update", (values) => {
      minInput.value = formatPriceRangeValue(values[0]);
      maxInput.value = formatPriceRangeValue(values[1]);
    });

    const syncSliderInputs = () => {
      if (!sliderNode.noUiSlider) return;

      const nextMin = Math.max(
        min,
        Math.min(max, parsePriceRangeValue(minInput.value)),
      );
      const nextMax = Math.max(
        min,
        Math.min(max, parsePriceRangeValue(maxInput.value)),
      );

      sliderNode.noUiSlider.set([
        Math.min(nextMin, nextMax),
        Math.max(nextMin, nextMax),
      ]);
    };

    [minInput, maxInput].forEach((input) => {
      input.addEventListener("change", syncSliderInputs);
      input.addEventListener("blur", syncSliderInputs);
    });
  });
};

const animateCartFilterGroup = (group, shouldOpen) => {
  const body = group?.querySelector(".cart_filter_group_body");
  const inner = body?.querySelector(".cart_filter_group_inner");
  if (!group || !body) return;

  gsap.killTweensOf(body);

  if (shouldOpen) {
    group.classList.add("is-open");
    gsap.set(body, {
      display: "block",
      height: 0,
    });
    gsap.to(body, {
      height: inner?.offsetHeight || 0,
      duration: 0.42,
      ease: "power2.out",
      onComplete: () => {
        gsap.set(body, { height: "auto" });

        const slider = body.querySelector("[data-filter-price-slider]");
        if (slider?.noUiSlider) {
          window.requestAnimationFrame(() => {
            slider.noUiSlider.set(slider.noUiSlider.get());
          });
        }
      },
    });
    return;
  }

  gsap.set(body, { height: body.offsetHeight });
  group.classList.remove("is-open");
  gsap.to(body, {
    height: 0,
    duration: 0.36,
    ease: "power2.out",
    onComplete: () => {
      gsap.set(body, {
        clearProps: "height",
        display: "none",
      });
    },
  });
};

const initCartFilterAccordion = () => {
  const filterGroups = document.querySelectorAll(".cart_filter_group");
  if (!filterGroups.length) return;

  filterGroups.forEach((group) => {
    if (group.dataset.cartFilterAccordionInited === "true") return;

    const trigger = group.querySelector(".cart_filter_group_summary");
    const body = group.querySelector(".cart_filter_group_body");
    if (!trigger || !body) return;

    if (!body.querySelector(".cart_filter_group_inner")) {
      const inner = document.createElement("div");
      inner.className = "cart_filter_group_inner";

      while (body.firstChild) {
        inner.appendChild(body.firstChild);
      }

      body.appendChild(inner);
    }

    group.dataset.cartFilterAccordionInited = "true";

    if (group.classList.contains("is-open")) {
      gsap.set(body, {
        display: "block",
        height: "auto",
      });
    } else {
      gsap.set(body, {
        display: "none",
        clearProps: "height",
      });
    }

    trigger.addEventListener("click", () => {
      animateCartFilterGroup(group, !group.classList.contains("is-open"));
    });
  });
};

const getCatalogFilterUi = () => {
  const chipsRoot = document.querySelector("[data-catalog-filter-chips]");
  const chipsWrapper = chipsRoot?.querySelector(".swiper-wrapper");

  return {
    chipsRoot,
    chipsWrapper,
    countNode: document.querySelector("[data-catalog-filter-count]"),
    headerResetButton: document.querySelector("[data-catalog-filter-reset]"),
    modalResetButton: document.querySelector("[data-cart-filter-reset]"),
  };
};

const getFilterGroupTitle = (input) =>
  input
    ?.closest(".cart_filter_group")
    ?.querySelector(".cart_filter_group_title")
    ?.textContent?.trim() || "";

const getFilterOptionLabel = (input) =>
  input
    ?.closest(".cart_filter_option")
    ?.querySelector(".cart_filter_option_text")
    ?.textContent?.trim() || "";

const buildCatalogFilterChips = () => {
  const chips = [];

  document
    .querySelectorAll(".cart_filter_option_input:checked")
    .forEach((checkedInput) => {
      const groupTitle = getFilterGroupTitle(checkedInput);
      const optionLabel = getFilterOptionLabel(checkedInput);
      if (!groupTitle || !optionLabel) return;

      chips.push({
        id: checkedInput.id,
        label: `${groupTitle}: ${optionLabel}`,
        type: "option",
      });
    });

  const priceSlider = document.querySelector("[data-filter-price-slider]");
  const priceMinInput = document.querySelector("[data-filter-price-min]");
  const priceMaxInput = document.querySelector("[data-filter-price-max]");

  if (priceSlider && priceMinInput && priceMaxInput) {
    const defaultMin = Number(priceSlider.dataset.startMin || priceSlider.dataset.min);
    const defaultMax = Number(priceSlider.dataset.startMax || priceSlider.dataset.max);
    const currentMin = parsePriceRangeValue(priceMinInput.value);
    const currentMax = parsePriceRangeValue(priceMaxInput.value);

    if (currentMin !== defaultMin || currentMax !== defaultMax) {
      chips.push({
        id: "price",
        label: `Цена: ${formatPriceRangeValue(currentMin)} - ${formatPriceRangeValue(currentMax)}`,
        type: "price",
      });
    }
  }

  return chips;
};

const syncCatalogFilterChipsSwiper = () => {
  const { chipsRoot } = getCatalogFilterUi();
  if (!chipsRoot) return;

  if (catalogFilterChipsSwiper) {
    catalogFilterChipsSwiper.update();
    return;
  }

  catalogFilterChipsSwiper = new Swiper(chipsRoot, {
    modules: [FreeMode],
    slidesPerView: "auto",
    spaceBetween: 7,
    freeMode: true,
    watchOverflow: true,
    breakpoints: {
      1200: {
        spaceBetween: 10,
      },
    },
  });
};

const animateCatalogFilterChipsIn = (chipSlides) => {
  if (!chipSlides?.length) return;

  gsap.killTweensOf(chipSlides);
  gsap.fromTo(
    chipSlides,
    {
      autoAlpha: 0,
      scale: 0.96,
      y: 6,
    },
    {
      autoAlpha: 1,
      scale: 1,
      y: 0,
      duration: 0.28,
      ease: "power2.out",
      stagger: 0.035,
      overwrite: true,
    },
  );
};

const animateCatalogFilterChipsOut = (chipsRoot, onComplete) => {
  if (!chipsRoot) {
    onComplete?.();
    return;
  }

  gsap.killTweensOf(chipsRoot);
  gsap.to(chipsRoot, {
    autoAlpha: 0,
    y: -4,
    duration: 0.18,
    ease: "power2.out",
    onComplete: () => {
      gsap.set(chipsRoot, { clearProps: "opacity,visibility,transform" });
      onComplete?.();
    },
  });
};

const animateCatalogFilterChipRemoval = (chipButton, onComplete) => {
  const chipSlide = chipButton?.closest(".swiper-slide");
  if (!chipSlide) {
    onComplete?.();
    return;
  }

  gsap.killTweensOf(chipSlide);
  gsap.to(chipSlide, {
    autoAlpha: 0,
    scale: 0.92,
    y: -4,
    duration: 0.18,
    ease: "power2.out",
    onComplete,
  });
};

const animateCatalogFilterChipSlidesRemoval = (chipSlides, onComplete) => {
  const normalizedSlides = chipSlides.filter(Boolean);
  if (!normalizedSlides.length) {
    onComplete?.();
    return;
  }

  gsap.killTweensOf(normalizedSlides);
  gsap.to(normalizedSlides, {
    autoAlpha: 0,
    scale: 0.92,
    y: -4,
    duration: 0.18,
    ease: "power2.out",
    stagger: 0.03,
    onComplete,
  });
};

const renderCatalogFilterChips = ({ skipRemovalAnimation = false } = {}) => {
  const { chipsRoot, chipsWrapper, countNode, headerResetButton, modalResetButton } =
    getCatalogFilterUi();
  if (!chipsRoot || !chipsWrapper) return;

  const previousChipIds = Array.from(
    chipsWrapper.querySelectorAll("[data-filter-chip]"),
  ).map((chipNode) => chipNode.dataset.filterChip);
  const chips = buildCatalogFilterChips();
  const priceFilterBlock = document.querySelector("[data-filter-price]");
  const hasActivePriceFilter = chips.some((chip) => chip.id === "price");
  const hasActiveFilters = chips.length > 0;
  const hadActiveFilters = chipsRoot.classList.contains("is-active");
  const nextChipIds = chips.map((chip) => chip.id);
  const removedChipIds = previousChipIds.filter(
    (chipId) => !nextChipIds.includes(chipId),
  );

  priceFilterBlock?.classList.toggle("is-active", hasActivePriceFilter);

  headerResetButton?.classList.toggle("is-active", hasActiveFilters);
  modalResetButton?.classList.toggle("is-active", hasActiveFilters);

  if (countNode) {
    countNode.textContent = hasActiveFilters ? `(${chips.length})` : "";
    countNode.classList.toggle("is-active", hasActiveFilters);
  }

  const nextMarkup = chips
    .map(
      (chip) => `
        <div class="swiper-slide">
          <button type="button" class="catalog_page_wrap_head_filters_chip" data-filter-chip="${chip.id}">
            <span>${chip.label}</span>
            <span class="catalog_page_wrap_head_filters_chip_icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 10.6948L4.85182 15.843C4.76022 15.9346 4.64769 15.9836 4.51423 15.9902C4.38077 15.9967 4.26169 15.9477 4.15702 15.843C4.05234 15.7383 4 15.6225 4 15.4956C4 15.3687 4.05234 15.2529 4.15702 15.1482L9.3052 10L4.15702 4.85182C4.06542 4.76022 4.01636 4.64769 4.00981 4.51423C4.00327 4.38077 4.05234 4.26169 4.15702 4.15702C4.26169 4.05234 4.37749 4 4.50442 4C4.63134 4 4.74714 4.05234 4.85182 4.15702L10 9.3052L15.1482 4.15702C15.2398 4.06542 15.3526 4.01636 15.4868 4.00981C15.6196 4.00327 15.7383 4.05234 15.843 4.15702C15.9477 4.26169 16 4.37749 16 4.50442C16 4.63134 15.9477 4.74714 15.843 4.85182L10.6948 10L15.843 15.1482C15.9346 15.2398 15.9836 15.3526 15.9902 15.4868C15.9967 15.6196 15.9477 15.7383 15.843 15.843C15.7383 15.9477 15.6225 16 15.4956 16C15.3687 16 15.2529 15.9477 15.1482 15.843L10 10.6948Z" fill="#FFF"/>
              </svg>
            </span>
          </button>
        </div>
      `,
    )
    .join("");

  if (
    removedChipIds.length &&
    hadActiveFilters &&
    !skipRemovalAnimation &&
    !catalogFilterChipRenderLocked
  ) {
    const chipSlidesToRemove = removedChipIds
      .map((chipId) =>
        chipsWrapper
          .querySelector(`[data-filter-chip="${CSS.escape(chipId)}"]`)
          ?.closest(".swiper-slide"),
      )
      .filter(Boolean);

    if (chipSlidesToRemove.length) {
      catalogFilterChipRenderLocked = true;
      animateCatalogFilterChipSlidesRemoval(chipSlidesToRemove, () => {
        catalogFilterChipRenderLocked = false;
        renderCatalogFilterChips({ skipRemovalAnimation: true });
      });
      return;
    }
  }

  if (!hasActiveFilters) {
    if (skipRemovalAnimation) {
      chipsRoot.classList.remove("is-active");
      chipsWrapper.innerHTML = "";
      catalogFilterChipsSwiper?.update();
      return;
    }

    if (!hadActiveFilters) {
      chipsRoot.classList.remove("is-active");
      chipsWrapper.innerHTML = "";
      catalogFilterChipsSwiper?.update();
      return;
    }

    animateCatalogFilterChipsOut(chipsRoot, () => {
      chipsRoot.classList.remove("is-active");
      chipsWrapper.innerHTML = "";
      catalogFilterChipsSwiper?.update();
    });
    return;
  }

  chipsRoot.classList.add("is-active");
  chipsWrapper.innerHTML = nextMarkup;
  syncCatalogFilterChipsSwiper();

  const addedChipIds = chips
    .map((chip) => chip.id)
    .filter((chipId) => !previousChipIds.includes(chipId));

  const chipSlidesToAnimate = hadActiveFilters
    ? addedChipIds
        .map((chipId) =>
          chipsWrapper
            .querySelector(`[data-filter-chip="${CSS.escape(chipId)}"]`)
            ?.closest(".swiper-slide"),
        )
        .filter(Boolean)
    : Array.from(chipsWrapper.querySelectorAll(".swiper-slide"));

  animateCatalogFilterChipsIn(chipSlidesToAnimate);
};

const resetCartFilterInputs = () => {
  document.querySelectorAll(".cart_filter_option_input:checked").forEach((input) => {
    input.checked = false;
  });

  const priceSlider = document.querySelector("[data-filter-price-slider]");
  const priceMinInput = document.querySelector("[data-filter-price-min]");
  const priceMaxInput = document.querySelector("[data-filter-price-max]");

  if (priceSlider?.noUiSlider) {
    const startMin = Number(priceSlider.dataset.startMin || priceSlider.dataset.min);
    const startMax = Number(priceSlider.dataset.startMax || priceSlider.dataset.max);
    priceSlider.noUiSlider.set([startMin, startMax]);
  } else {
    if (priceMinInput) {
      priceMinInput.value = formatPriceRangeValue(
        Number(priceSlider?.dataset.startMin || priceSlider?.dataset.min || 0),
      );
    }

    if (priceMaxInput) {
      priceMaxInput.value = formatPriceRangeValue(
        Number(priceSlider?.dataset.startMax || priceSlider?.dataset.max || 0),
      );
    }
  }
};

const resetCartFilterPrice = () => {
  const priceSlider = document.querySelector("[data-filter-price-slider]");
  const priceMinInput = document.querySelector("[data-filter-price-min]");
  const priceMaxInput = document.querySelector("[data-filter-price-max]");

  if (priceSlider?.noUiSlider) {
    const startMin = Number(priceSlider.dataset.startMin || priceSlider.dataset.min);
    const startMax = Number(priceSlider.dataset.startMax || priceSlider.dataset.max);
    priceSlider.noUiSlider.set([startMin, startMax]);
  } else {
    if (priceMinInput) {
      priceMinInput.value = formatPriceRangeValue(
        Number(priceSlider?.dataset.startMin || priceSlider?.dataset.min || 0),
      );
    }

    if (priceMaxInput) {
      priceMaxInput.value = formatPriceRangeValue(
        Number(priceSlider?.dataset.startMax || priceSlider?.dataset.max || 0),
      );
    }
  }
};

const initCatalogFilterUi = () => {
  const { chipsRoot, headerResetButton, modalResetButton } = getCatalogFilterUi();
  if (!chipsRoot) return;

  const syncFiltersUi = () => {
    renderCatalogFilterChips();
  };

  document.querySelectorAll(".cart_filter_option_input").forEach((input) => {
    if (input.dataset.catalogFilterBound === "true") return;
    input.dataset.catalogFilterBound = "true";
    input.addEventListener("change", syncFiltersUi);
  });

  document
    .querySelectorAll("[data-filter-price-min], [data-filter-price-max]")
    .forEach((input) => {
      if (input.dataset.catalogFilterBound === "true") return;
      input.dataset.catalogFilterBound = "true";
      input.addEventListener("change", syncFiltersUi);
      input.addEventListener("blur", syncFiltersUi);
    });

  const priceSlider = document.querySelector("[data-filter-price-slider]");
  if (priceSlider?.noUiSlider && priceSlider.dataset.catalogFilterBound !== "true") {
    priceSlider.dataset.catalogFilterBound = "true";
    priceSlider.noUiSlider.on("change", syncFiltersUi);
  }

  [headerResetButton, modalResetButton].forEach((button) => {
    if (!button || button.dataset.catalogFilterBound === "true") return;
    button.dataset.catalogFilterBound = "true";
    button.addEventListener("click", () => {
      resetCartFilterInputs();
      syncFiltersUi();
    });
  });

  if (chipsRoot.dataset.catalogFilterBound !== "true") {
    chipsRoot.dataset.catalogFilterBound = "true";
    chipsRoot.addEventListener("click", (event) => {
      const chipButton = event.target.closest("[data-filter-chip]");
      if (!chipButton) return;

      const chipId = chipButton.dataset.filterChip;
      if (!chipId) return;

      if (chipId === "price") {
        animateCatalogFilterChipRemoval(chipButton, () => {
          resetCartFilterPrice();
          renderCatalogFilterChips({ skipRemovalAnimation: true });
        });
        return;
      }

      const input = document.getElementById(chipId);
      if (!(input instanceof HTMLInputElement)) return;

      animateCatalogFilterChipRemoval(chipButton, () => {
        input.checked = false;
        renderCatalogFilterChips({ skipRemovalAnimation: true });
      });
    });
  }

  syncFiltersUi();
};

const formatOrderItemsLabel = (count) => {
  const normalizedCount = Math.abs(Number(count) || 0);
  const mod10 = normalizedCount % 10;
  const mod100 = normalizedCount % 100;

  if (mod100 >= 11 && mod100 <= 14) {
    return `${normalizedCount} товаров`;
  }

  if (mod10 === 1) {
    return `${normalizedCount} товар`;
  }

  if (mod10 >= 2 && mod10 <= 4) {
    return `${normalizedCount} товара`;
  }

  return `${normalizedCount} товаров`;
};

const formatOrderCurrency = (value) => {
  return `${new Intl.NumberFormat("ru-RU").format(Math.max(0, value))} ₽`;
};

const animateOrderPromoAccordion = (group, shouldOpen) => {
  const body = group?.querySelector("[data-order-promo-body]");
  const inner =
    body?.querySelector(
      ".basket_page_wrap_sidebar_promo_body_inner, .checkout_page_wrap_sidebar_promo_body_inner, .basket_page_sidebar_promo_body_inner",
    ) || body?.firstElementChild;
  const toggle = group?.querySelector("[data-order-promo-toggle]");

  if (!group || !body || !toggle) return;

  gsap.killTweensOf(body);
  toggle.setAttribute("aria-expanded", String(shouldOpen));

  if (shouldOpen) {
    group.classList.add("is-open");
    body.hidden = false;
    gsap.set(body, {
      display: "block",
      height: 0,
    });
    gsap.to(body, {
      height: inner?.offsetHeight || 0,
      duration: 0.36,
      ease: "power2.out",
      onComplete: () => {
        gsap.set(body, { height: "auto" });
      },
    });
    return;
  }

  gsap.set(body, { height: body.offsetHeight });
  group.classList.remove("is-open");
  gsap.to(body, {
    height: 0,
    duration: 0.32,
    ease: "power2.out",
    onComplete: () => {
      gsap.set(body, {
        clearProps: "height",
        display: "none",
      });
      body.hidden = true;
    },
  });
};

const initOrderPromoAccordion = () => {
  const promoNodes = document.querySelectorAll("[data-order-promo]");
  if (!promoNodes.length) return;

  promoNodes.forEach((promoNode) => {
    if (promoNode.dataset.orderPromoInited === "true") return;

    const toggle = promoNode.querySelector("[data-order-promo-toggle]");
    const body = promoNode.querySelector("[data-order-promo-body]");

    if (!toggle || !body) return;

    promoNode.dataset.orderPromoInited = "true";
    toggle.setAttribute("aria-expanded", "false");
    body.hidden = true;

    gsap.set(body, {
      display: "none",
      height: 0,
    });

    toggle.addEventListener("click", () => {
      const shouldOpen = toggle.getAttribute("aria-expanded") !== "true";
      animateOrderPromoAccordion(promoNode, shouldOpen);
    });
  });
};

const initBasketPage = () => {
  const basketPage = document.querySelector(".basket_page");
  if (!basketPage || basketPage.dataset.basketPageInited === "true") return;

  const listEl = basketPage.querySelector("[data-basket-list]");
  const subtotalEls = basketPage.querySelectorAll("[data-basket-subtotal]");
  const discountEls = basketPage.querySelectorAll("[data-basket-discount]");
  const totalEls = basketPage.querySelectorAll("[data-basket-total]");
  const checkoutButton = basketPage.querySelector(".basket_page_sidebar_button");

  if (!listEl) return;

  basketPage.dataset.basketPageInited = "true";

  const itemEls = Array.from(listEl.querySelectorAll("[data-basket-item]"));
  if (!itemEls.length) return;

  const basketPriceLayoutState = itemEls
    .map((itemEl) => {
      const contentEl = itemEl.querySelector(".basket_page_list_item_content");
      const priceEl = itemEl.querySelector(".basket_page_list_item_price");

      if (!contentEl || !priceEl || !priceEl.parentNode) return null;

      return {
        contentEl,
        priceEl,
        originalParent: priceEl.parentNode,
        originalNextSibling: priceEl.nextSibling,
      };
    })
    .filter(Boolean);

  const syncBasketPriceLayout = () => {
    const shouldMovePriceIntoContent = window.innerWidth <= 767;

    basketPriceLayoutState.forEach((state) => {
      const { contentEl, priceEl, originalParent, originalNextSibling } = state;

      if (shouldMovePriceIntoContent) {
        if (priceEl.parentNode !== contentEl) {
          contentEl.append(priceEl);
        }
        return;
      }

      if (priceEl.parentNode === originalParent) return;

      if (
        originalNextSibling &&
        originalNextSibling.parentNode === originalParent
      ) {
        originalParent.insertBefore(priceEl, originalNextSibling);
        return;
      }

      originalParent.append(priceEl);
    });
  };

  let basketPriceLayoutFrame = 0;
  const handleBasketPriceLayoutResize = () => {
    if (basketPriceLayoutFrame) return;

    basketPriceLayoutFrame = window.requestAnimationFrame(() => {
      basketPriceLayoutFrame = 0;
      syncBasketPriceLayout();
    });
  };

  const basketPriceLayoutMedia = window.matchMedia("(max-width: 767px)");
  const handleBasketPriceLayoutBreakpointChange = () => {
    handleBasketPriceLayoutResize();
  };

  const parseBasketAnimatedNumber = (value) => {
    const normalizedValue = String(value || "").replace(/\s+/g, "");
    const sign = normalizedValue.startsWith("-") ? -1 : 1;
    const digits = normalizedValue.replace(/[^\d]/g, "");

    if (!digits) return 0;

    return Number.parseInt(digits, 10) * sign;
  };

  const renderBasketAnimatedValue = (element, nextValue, shouldAnimate = true) => {
    if (!element) return;

    const normalizedValue = String(nextValue).trim();
    const targetNumber = parseBasketAnimatedNumber(normalizedValue);
    const hasCurrency = normalizedValue.includes("₽");
    const nextRenderedValue = hasCurrency
      ? `${targetNumber < 0 ? "-" : ""}${new Intl.NumberFormat("ru-RU").format(
          Math.abs(targetNumber),
        )} ₽`
      : `${targetNumber}`;
    const currentStoredValue = Number.parseInt(
      element.dataset.animatedNumber ?? `${parseBasketAnimatedNumber(element.textContent)}`,
      10,
    );

    if (currentStoredValue === targetNumber && element.dataset.animatedReady === "true") {
      return;
    }

    if (!shouldAnimate) {
      element.textContent = nextRenderedValue;
      element.dataset.animatedNumber = String(targetNumber);
      element.dataset.animatedReady = "true";
      return;
    }

    if (!element._basketAnimatedState) {
      element._basketAnimatedState = {
        value: Number.isFinite(currentStoredValue) ? currentStoredValue : 0,
      };
    }

    gsap.killTweensOf(element._basketAnimatedState);

    element.classList.remove("is-value-changing");
    void element.offsetWidth;
    element.classList.add("is-value-changing");

    gsap.to(element._basketAnimatedState, {
      value: targetNumber,
      duration: 0.55,
      ease: "power3.out",
      onUpdate: () => {
        const currentValue = Math.round(element._basketAnimatedState.value);
        element.textContent = hasCurrency
          ? `${currentValue < 0 ? "-" : ""}${new Intl.NumberFormat(
              "ru-RU",
            ).format(Math.abs(currentValue))} ₽`
          : `${currentValue}`;
      },
      onComplete: () => {
        element.textContent = nextRenderedValue;
        element.dataset.animatedNumber = String(targetNumber);
        element.classList.remove("is-value-changing");
      },
    });

    element.dataset.animatedReady = "true";
    element.dataset.animatedNumber = String(targetNumber);
  };

  const clampBasketItemValue = (input) => {
    const parsedValue = Number.parseInt(input.value, 10);
    const nextValue = Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1;

    input.value = String(nextValue);
    return nextValue;
  };

  const updateBasketSummary = () => {
    let itemsCount = 0;
    let subtotal = 0;
    let discount = 0;

    itemEls.forEach((itemEl) => {
      const input = itemEl.querySelector("[data-basket-input]");
      const currentPriceEl = itemEl.querySelector("[data-basket-item-current]");
      const oldPriceEl = itemEl.querySelector("[data-basket-item-old]");
      const itemPrice = Number.parseInt(itemEl.dataset.price || "0", 10) || 0;
      const itemOldPrice =
        Number.parseInt(itemEl.dataset.oldPrice || "0", 10) || 0;
      const quantity = input ? clampBasketItemValue(input) : 1;
      const currentTotal = itemPrice * quantity;
      const oldTotal = itemOldPrice * quantity;

      if (currentPriceEl) {
        renderBasketAnimatedValue(
          currentPriceEl,
          formatOrderCurrency(currentTotal),
        );
      }

      if (oldPriceEl) {
        renderBasketAnimatedValue(oldPriceEl, formatOrderCurrency(oldTotal));
      }

      itemsCount += quantity;
      subtotal += currentTotal;
      discount += Math.max(0, oldTotal - currentTotal);
    });

    const baseTotal = subtotal + discount;
    const total = subtotal;

    subtotalEls.forEach((element) => {
      renderBasketAnimatedValue(element, formatOrderCurrency(baseTotal));
    });

    discountEls.forEach((element) => {
      renderBasketAnimatedValue(
        element,
        `-${formatOrderCurrency(discount)}`,
      );
    });

    totalEls.forEach((element) => {
      renderBasketAnimatedValue(element, formatOrderCurrency(total));
    });

    if (checkoutButton) {
      checkoutButton.classList.remove("is-disabled");
      checkoutButton.setAttribute("aria-disabled", "false");
      checkoutButton.tabIndex = 0;
    }

    headerCounterState.basket = itemsCount;
    updateHeaderCountersUi();
  };

  itemEls.forEach((itemEl) => {
    const minusButton = itemEl.querySelector("[data-basket-minus]");
    const plusButton = itemEl.querySelector("[data-basket-plus]");
    const input = itemEl.querySelector("[data-basket-input]");
    const stockEl = itemEl.querySelector(".basket_page_list_item_actions_stock");

    if (!input) return;

    const parsedStock = Number.parseInt(
      stockEl?.textContent?.match(/\d+/)?.[0] || "",
      10,
    );
    const maxStock = Number.isFinite(parsedStock) && parsedStock > 0 ? parsedStock : Infinity;

    if (Number.isFinite(maxStock)) {
      input.max = String(maxStock);
    }

    const clampBasketItemInputValue = () => {
      const currentValue = clampBasketItemValue(input);
      const nextValue = Math.min(currentValue, maxStock);

      input.value = String(nextValue);
      return nextValue;
    };

    minusButton?.addEventListener("click", () => {
      const currentValue = clampBasketItemInputValue();
      input.value = String(Math.max(1, currentValue - 1));
      updateBasketSummary();
    });

    plusButton?.addEventListener("click", () => {
      const currentValue = clampBasketItemInputValue();
      input.value = String(Math.min(maxStock, currentValue + 1));
      updateBasketSummary();
    });

    input.addEventListener("change", () => {
      clampBasketItemInputValue();
      updateBasketSummary();
    });

    input.addEventListener("blur", () => {
      clampBasketItemInputValue();
      updateBasketSummary();
    });
  });

  itemEls.forEach((itemEl) => {
    renderBasketAnimatedValue(
      itemEl.querySelector("[data-basket-item-current]"),
      itemEl.querySelector("[data-basket-item-current]")?.textContent || "",
      false,
    );

    renderBasketAnimatedValue(
      itemEl.querySelector("[data-basket-item-old]"),
      itemEl.querySelector("[data-basket-item-old]")?.textContent || "",
      false,
    );
  });

  subtotalEls.forEach((element) => {
    renderBasketAnimatedValue(element, element.textContent || "", false);
  });

  discountEls.forEach((element) => {
    renderBasketAnimatedValue(element, element.textContent || "", false);
  });

  totalEls.forEach((element) => {
    renderBasketAnimatedValue(element, element.textContent || "", false);
  });

  syncBasketPriceLayout();
  window.addEventListener("resize", handleBasketPriceLayoutResize);
  window.addEventListener("orientationchange", handleBasketPriceLayoutResize);
  window.addEventListener("pageshow", handleBasketPriceLayoutResize);

  if (typeof basketPriceLayoutMedia.addEventListener === "function") {
    basketPriceLayoutMedia.addEventListener(
      "change",
      handleBasketPriceLayoutBreakpointChange,
    );
  } else if (typeof basketPriceLayoutMedia.addListener === "function") {
    basketPriceLayoutMedia.addListener(handleBasketPriceLayoutBreakpointChange);
  }

  window.visualViewport?.addEventListener(
    "resize",
    handleBasketPriceLayoutResize,
  );
  updateBasketSummary();
};

const initCookiesNotice = () => {
  const cookiesBlock = document.querySelector(".cookies_block");
  if (!cookiesBlock) return;
  if (cookiesBlock.dataset.cookiesInited === "true") return;

  cookiesBlock.dataset.cookiesInited = "true";

  const cookiesAcceptedKey = "addictedCookiesAcceptedUntil";
  const cookiesAcceptedDuration = 30 * 24 * 60 * 60 * 1000;

  const isAccepted = () => {
    try {
      const acceptedUntil = Number.parseInt(
        window.localStorage.getItem(cookiesAcceptedKey) || "",
        10,
      );

      return Number.isFinite(acceptedUntil) && acceptedUntil > Date.now();
    } catch {
      return false;
    }
  };

  const setAccepted = () => {
    try {
      window.localStorage.setItem(
        cookiesAcceptedKey,
        `${Date.now() + cookiesAcceptedDuration}`,
      );
    } catch {
      return;
    }
  };

  const syncVisibility = () => {
    cookiesBlock.classList.toggle("is-visible", !isAccepted());
  };

  cookiesBlock
    .querySelectorAll(".cookies_block_wrap_btn")
    .forEach((cookiesBlockWrapBtn) => {
      cookiesBlockWrapBtn.addEventListener("click", () => {
        setAccepted();
        cookiesBlock.classList.remove("is-visible");
      });
    });

  syncVisibility();
};

const initCheckoutPage = () => {
  const checkoutPage = document.querySelector(".checkout_page");
  if (!checkoutPage || checkoutPage.dataset.checkoutPageInited === "true") return;

  checkoutPage.dataset.checkoutPageInited = "true";

  const staticCount = Number.parseInt(
    checkoutPage.querySelector("[data-order-static-count]")?.dataset.orderStaticCount || "0",
    10,
  );

  if (staticCount > 0) {
    headerCounterState.basket = staticCount;
    updateHeaderCountersUi();
  }

  const deliveryInputs = checkoutPage.querySelectorAll('input[name="delivery"]');
  const paymentInputs = checkoutPage.querySelectorAll('input[name="payment"]');
  const deliveryPickupEl = checkoutPage.querySelector(
    ".checkout_page_form_delivery_pickup",
  );
  const deliveryExtraEl = checkoutPage.querySelector(
    ".checkout_page_form_delivery_extra",
  );
  const paymentNoteEls = checkoutPage.querySelectorAll(
    ".checkout_page_form_payment_note",
  );

  const syncCheckoutDeliveryState = () => {
    const activeDeliveryInput = checkoutPage.querySelector(
      'input[name="delivery"]:checked',
    );
    const isPickup = activeDeliveryInput?.value === "pickup";
    const shouldShowDeliveryExtra = !isPickup;

    if (deliveryPickupEl) {
      deliveryPickupEl.hidden = !isPickup;
    }

    if (deliveryExtraEl) {
      deliveryExtraEl.hidden = !shouldShowDeliveryExtra;
    }
  };

  const syncCheckoutPaymentState = () => {
    const activePaymentInput = checkoutPage.querySelector(
      'input[name="payment"]:checked',
    );
    const activePaymentValue = activePaymentInput?.value || "";

    paymentNoteEls.forEach((noteEl) => {
      noteEl.hidden = noteEl.dataset.paymentNote !== activePaymentValue;
    });
  };

  deliveryInputs.forEach((input) => {
    input.addEventListener("change", syncCheckoutDeliveryState);
  });

  paymentInputs.forEach((input) => {
    input.addEventListener("change", syncCheckoutPaymentState);
  });

  syncCheckoutDeliveryState();
  syncCheckoutPaymentState();
};

const initApp = () => {
  initHeaderCountersState();
  initHeaderMenuToggle();
  initHeroIntro();
  initLocomotiveScroll();
  initHeaderScrollState();
  initFancybox();
  initSelect2();
  initPhoneMasks();
  initGlobalSelect2LenisGuard();
  initHomeShowcaseSliders();
  initHomeCategoriesParallax();
  initHomeShowcaseReveal();
  initProductRecommendationsReveal();
  initCatalogContentReveal();
  initProductPageGallery();
  initProductRecommendationsSlider();
  initProductCartAction();
  initFavoriteButtons();
  initModals();
  initCartFilterAccordion();
  initCartFilterPriceSlider();
  initCatalogFilterUi();
  initOrderPromoAccordion();
  initBasketPage();
  initCookiesNotice();
  initCheckoutPage();
};

if (typeof window !== "undefined") {
  window.$ = $;
  window.jQuery = $;
  window.LocomotiveScroll = LocomotiveScroll;
  window.gsap = gsap;
  window.ScrollTrigger = ScrollTrigger;
  window.Swiper = Swiper;
  window.Fancybox = Fancybox;
  window.app = {
    init: initApp,
    initHeaderMenuToggle,
    initLocomotiveScroll,
    initHeaderScrollState,
    initFancybox,
    initSelect2,
    initGlobalSelect2LenisGuard,
    initHomeShowcaseSliders,
    initHomeCategoriesParallax,
    initHomeShowcaseReveal,
    initProductRecommendationsReveal,
    initCatalogContentReveal,
    initProductPageGallery,
    initProductRecommendationsSlider,
    initProductCartAction,
    initProductFavoriteAction,
    initModals,
    initCartFilterAccordion,
    initCartFilterPriceSlider,
    initCatalogFilterUi,
    initOrderPromoAccordion,
    initBasketPage,
    initCookiesNotice,
    initCheckoutPage,
  };
}

onReady(initApp);
