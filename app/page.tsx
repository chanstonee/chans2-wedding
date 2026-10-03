"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEventHandler, type ReactNode } from "react";
import Guestbook from "./components/Guestbook";
import { defaultTheme, themeAsset, themeBrowserColors, themeLabels, themeStorageKey, type InvitationTheme } from "./lib/themes";

type PageKey = "home" | "story" | "location" | "alert" | "gallery" | "guestbook" | "dinner";
type PanelKey = Exclude<PageKey, "home"> | "menu";
type SplashStep = 1 | 2 | 3;

const pageKeys: PageKey[] = ["home", "story", "location", "alert", "gallery", "guestbook", "dinner"];
const splashPassword = "20270515";

const naverMapUrl = "https://naver.me/G6Rqydqw";
const mapPreviewUrl = "https://www.openstreetmap.org/export/embed.html?bbox=126.7891923%2C37.7266412%2C126.7991923%2C37.7366412&layer=mapnik&marker=37.7316412%2C126.7941923";
const naverDirectionsUrl = "https://map.naver.com/p/directions/-/3z9Y9h,2AT075,%EA%B2%BD%EA%B8%B0%20%ED%8C%8C%EC%A3%BC%EC%8B%9C%20%ED%83%91%EC%82%AD%EA%B3%A8%EA%B8%B8%20260,,ADDRESS_POI/-/car?c=16.44,0,0,0,dh";

const homeQuickLinks: Array<{ label: string; image: string; page: PageKey; symbol?: string }> = [
  { label: "오시는 길", image: "/assets/doodle-location.png", page: "location", symbol: "location_on" },
  { label: "날짜", image: "/assets/doodle-calendar.png", page: "alert", symbol: "calendar_month" },
  { label: "식사", image: "/assets/doodle-dinner.png", page: "dinner", symbol: "restaurant" },
  { label: "두 사람의 이야기", image: "/assets/doodle-message.png", page: "story" },
  { label: "사진첩", image: "/assets/doodle-picture.png", page: "gallery" },
  { label: "방명록", image: "/assets/doodle-thanks.png", page: "guestbook" },
];

const galleryImages = [
  "/assets/photo-1.png",
  "/assets/photo-2.png",
  "/assets/photo-3.png",
  "/assets/photo-4.png",
  "/assets/photo-5.png",
  "/assets/photo-2.png",
];

const galleryTabs = [
  { label: "Ceremony", icon: "/assets/doodle-check.png" },
  { label: "Snap", icon: "/assets/doodle-picture.png" },
  { label: "Individual", icon: "/assets/doodle-call.png" },
];

const panelDetails: Record<PanelKey, { label: string; title: string; image?: string }> = {
  alert: { label: "예식 날짜", title: "SAVE THE DATE", image: "/assets/doodle-alert.png" },
  dinner: { label: "식사 안내", title: "DINNER", image: "/assets/doodle-dinner.png" },
  story: { label: "두 사람의 이야기", title: "OUR STORY", image: "/assets/doodle-message.png" },
  location: { label: "오시는 길", title: "오시는 길" },
  gallery: { label: "사진첩", title: "사진첩" },
  guestbook: { label: "방명록", title: "방명록" },
  menu: { label: "전체메뉴", title: "전체메뉴" },
};

const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

function trapDialogFocus(event: KeyboardEvent, dialog: HTMLElement) {
  if (event.key !== "Tab") return;
  const controls = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => element.getClientRects().length > 0);
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (!first) { event.preventDefault(); dialog.focus(); return; }
  if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
    event.preventDefault(); first.focus();
  }
}

function PanelDialog({ panel, theme, onClose, suspended, children }: { panel: PanelKey; theme: InvitationTheme; onClose: () => void; suspended: boolean; children: ReactNode }) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dragStart = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const isSheet = panel === "location" || panel === "gallery" || panel === "guestbook" || panel === "menu";
  const details = panelDetails[panel];

  useEffect(() => { setDragOffset(0); closeRef.current?.focus({ preventScroll: true }); }, [panel]);
  useEffect(() => {
    if (suspended) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      else if (dialogRef.current) trapDialogFocus(event, dialogRef.current);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, suspended]);

  const startDrag: PointerEventHandler<HTMLDivElement> = (event) => {
    if (!isSheet || !window.matchMedia("(max-width: 700px)").matches || (event.target as HTMLElement).closest("button")) return;
    dragStart.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const moveDrag: PointerEventHandler<HTMLDivElement> = (event) => {
    if (dragStart.current !== null) setDragOffset(Math.max(0, event.clientY - dragStart.current));
  };
  const endDrag: PointerEventHandler<HTMLDivElement> = (event) => {
    const distance = dragStart.current === null ? 0 : event.clientY - dragStart.current;
    dragStart.current = null;
    setDragging(false);
    setDragOffset(0);
    if (distance > 80 && event.type !== "pointercancel") onClose();
  };

  return (
    <div className={`panel-backdrop ${isSheet ? "sheet-backdrop" : "modal-backdrop"}`} onClick={(event) => event.target === event.currentTarget && !suspended && onClose()}>
      <section ref={dialogRef} className={`hybrid-dialog panel-${panel} ${isSheet ? "sheet-dialog" : "info-modal"} ${dragging ? "is-dragging" : ""}`} role="dialog" aria-modal="true" aria-labelledby="panel-title" tabIndex={-1} inert={suspended} aria-hidden={suspended || undefined} style={isSheet ? { transform: `translateY(${dragOffset}px)` } : undefined}>
        {isSheet ? (
          <div className="sheet-heading" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
            <span className="sheet-handle" aria-hidden />
            <h2 id="panel-title">{details.title}</h2>
            <button ref={closeRef} className="panel-close" onClick={onClose} aria-label={`${details.label} 닫기`}><img src="/assets/close-circle2-filled.svg" alt="" /></button>
          </div>
        ) : (
          <>
            <img className="info-float-icon" src={themeAsset(details.image, theme)} alt="" />
            <button ref={closeRef} className="info-close" onClick={onClose} aria-label={`${details.label} 닫기`}><img src="/assets/close-circle2-filled.svg" alt="" /></button>
          </>
        )}
        <div className="panel-scroll">
          {!isSheet && <div className="title-frame info-title-frame"><img src={themeAsset("/assets/title-frame.png", theme)} alt="" /><h2 id="panel-title">{details.title}</h2></div>}
          {children}
        </div>
      </section>
    </div>
  );
}

function PhotoViewer({ index, onClose, onChange, returnFocus }: { index: number; onClose: () => void; onChange: (index: number) => void; returnFocus: HTMLElement | null }) {
  const viewerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    return () => returnFocus?.focus({ preventScroll: true });
  }, [returnFocus]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      else if (event.key === "ArrowLeft") onChange((index + galleryImages.length - 1) % galleryImages.length);
      else if (event.key === "ArrowRight") onChange((index + 1) % galleryImages.length);
      else if (viewerRef.current) trapDialogFocus(event, viewerRef.current);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [index, onClose, onChange]);
  return (
    <section ref={viewerRef} className="photo-viewer" role="dialog" aria-modal="true" aria-label={`웨딩 사진 ${index + 1} 크게 보기`} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <button ref={closeRef} className="photo-viewer-close" onClick={onClose} aria-label="사진 닫기"><span className="material-symbols-rounded" aria-hidden>close</span></button>
      <img src={galleryImages[index]} alt={`웨딩 사진 ${index + 1}`} />
      <button className="photo-viewer-prev" onClick={() => onChange((index + galleryImages.length - 1) % galleryImages.length)} aria-label="이전 사진"><span className="material-symbols-rounded" aria-hidden>chevron_left</span></button>
      <button className="photo-viewer-next" onClick={() => onChange((index + 1) % galleryImages.length)} aria-label="다음 사진"><span className="material-symbols-rounded" aria-hidden>chevron_right</span></button>
      <span className="photo-viewer-count" aria-live="polite">{index + 1} / {galleryImages.length}</span>
    </section>
  );
}

function GlassLayers() {
  return (
    <span className="glass-layers" aria-hidden="true">
      <span className="glass-filter" />
      <span className="glass-overlay" />
      <span className="glass-distortion-overlay" />
      <span className="glass-specular" />
    </span>
  );
}

function SplashGate({ step, password, theme, onEnter }: { step: SplashStep; password: string; theme: InvitationTheme; onEnter: () => void }) {
  const passwordReady = password === splashPassword;

  return (
    <section className={`splash-gate splash-step-${step}`} aria-label="웨딩 초대장 시작 화면">
      <picture className="splash-horse" aria-hidden>
        <source media="(max-width: 700px)" srcSet={themeAsset("/assets/doodle-message.png", theme)} />
        <img src={themeAsset("/assets/doodle-message.png", theme)} alt="" />
      </picture>

      <div className={`splash-stage splash-status ${step === 1 ? "is-active" : ""}`} role="status" aria-hidden={step !== 1}>
        <img className="splash-loader" src={themeAsset("/assets/splash-loader.svg", theme)} alt="" />
      </div>

      <div className={`splash-stage splash-status ${step === 2 ? "is-active" : ""}`} role="status" aria-live="polite" aria-hidden={step !== 2}>
        <img className="splash-loader" src={themeAsset("/assets/splash-loader.svg", theme)} alt="" />
        <span>Welcome</span>
      </div>

      <div className={`splash-stage splash-entry ${step === 3 ? "is-active" : ""}`} aria-hidden={step !== 3}>
        <div className="splash-mark">
          <img src={themeAsset("/assets/doodle-message.png", theme)} alt="" />
          <h1>wedding invitaion</h1>
        </div>
        <form className="splash-password-form" onSubmit={(event) => { event.preventDefault(); if (passwordReady) onEnter(); }}>
          <input
            type="password"
            value={password}
            readOnly
            tabIndex={-1}
            aria-label="자동 입력된 비밀번호"
            autoComplete="off"
          />
          <button type="submit" disabled={!passwordReady} tabIndex={step === 3 ? 0 : -1} aria-label="청첩장 메인으로 이동">
            <img src="/assets/arrow-right-filled.svg" alt="" aria-hidden />
          </button>
        </form>
      </div>
    </section>
  );
}

export default function Home() {
  const [theme, setTheme] = useState<InvitationTheme>(defaultTheme);
  const [panel, setPanel] = useState<PanelKey | null>(null);
  const [galleryTab, setGalleryTab] = useState("Ceremony");
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [splashStep, setSplashStep] = useState<SplashStep>(1);
  const [autoPassword, setAutoPassword] = useState("");
  const [splashComplete, setSplashComplete] = useState(false);
  const activeGlassRef = useRef<HTMLElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const photoOpenerRef = useRef<HTMLElement | null>(null);
  const homeScrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(themeStorageKey);
      // Restore the visitor's preference after the static page hydrates.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "blush" || saved === "blue-mint") setTheme(saved);
    } catch { /* Theme switching also works when browser storage is unavailable. */ }
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const previousTheme = root.getAttribute("data-invitation-theme");
    const meta = document.querySelector('meta[name="theme-color"]');
    const previous = meta?.getAttribute("content");
    root.setAttribute("data-invitation-theme", theme);
    meta?.setAttribute("content", themeBrowserColors[theme].top);
    return () => {
      if (previousTheme === null) root.removeAttribute("data-invitation-theme");
      else root.setAttribute("data-invitation-theme", previousTheme);
      if (previous) meta?.setAttribute("content", previous);
    };
  }, [theme]);

  const cycleTheme = () => {
    const nextTheme: InvitationTheme = theme === "blue-mint" ? "blush" : "blue-mint";
    setTheme(nextTheme);
    try { window.localStorage.setItem(themeStorageKey, nextTheme); } catch { /* Optional preference storage. */ }
  };

  const resetGlassPointer = () => {
    activeGlassRef.current?.style.removeProperty("--glass-x");
    activeGlassRef.current?.style.removeProperty("--glass-y");
    activeGlassRef.current = null;
    document.getElementById("glass-displacement-map")?.setAttribute("scale", "8");
  };

  const handleGlassPointerMove: PointerEventHandler<HTMLElement> = (event) => {
    if (event.pointerType === "touch") return;

    const card = (event.target as HTMLElement).closest<HTMLElement>(".glass-card");
    if (!card) {
      resetGlassPointer();
      return;
    }

    if (activeGlassRef.current && activeGlassRef.current !== card) {
      activeGlassRef.current.style.removeProperty("--glass-x");
      activeGlassRef.current.style.removeProperty("--glass-y");
    }

    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    card.style.setProperty("--glass-x", `${x}px`);
    card.style.setProperty("--glass-y", `${y}px`);
    activeGlassRef.current = card;

    const scaleX = (x / rect.width) * 100;
    const scaleY = (y / rect.height) * 100;
    const scale = Math.max(4, Math.min(14, Math.min(scaleX, scaleY)));
    document.getElementById("glass-displacement-map")?.setAttribute("scale", String(scale));
  };

  useEffect(() => {
    const welcomeTimer = window.setTimeout(() => setSplashStep(2), 900);
    const entryTimer = window.setTimeout(() => setSplashStep(3), 2100);

    return () => {
      window.clearTimeout(welcomeTimer);
      window.clearTimeout(entryTimer);
    };
  }, []);

  useEffect(() => {
    if (splashStep !== 3) return;

    let characterIndex = 0;
    setAutoPassword("");
    const typingTimer = window.setInterval(() => {
      characterIndex += 1;
      setAutoPassword(splashPassword.slice(0, characterIndex));
      if (characterIndex >= splashPassword.length) window.clearInterval(typingTimer);
    }, 90);

    return () => window.clearInterval(typingTimer);
  }, [splashStep]);

  const overlayOpen = panel !== null;
  useEffect(() => {
    if (!overlayOpen) return;
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    const homeOverflow = homeScrollRef.current?.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (homeScrollRef.current) homeScrollRef.current.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
      if (homeScrollRef.current) homeScrollRef.current.style.overflow = homeOverflow ?? "";
      openerRef.current?.focus({ preventScroll: true });
    };
  }, [overlayOpen]);

  useEffect(() => {
    if (!splashComplete) return;

    const syncFromHash = () => {
      const [hash, photoHash] = window.location.hash.slice(1).split("/");
      const number = Number(photoHash?.match(/^photo-(\d+)$/)?.[1]);
      setPhotoIndex(hash === "gallery" && number >= 1 && number <= galleryImages.length ? number - 1 : null);
      setPanel(hash === "menu" || (pageKeys.includes(hash as PageKey) && hash !== "home") ? hash as PanelKey : null);
    };
    syncFromHash();
    window.addEventListener("popstate", syncFromHash);
    window.addEventListener("hashchange", syncFromHash);
    return () => {
      window.removeEventListener("popstate", syncFromHash);
      window.removeEventListener("hashchange", syncFromHash);
    };
  }, [splashComplete]);

  const enterSite = () => {
    if (autoPassword !== splashPassword) return;
    setSplashComplete(true);
  };

  const openPanel = (nextPanel: PanelKey) => {
    if (!panel) openerRef.current = document.activeElement as HTMLElement | null;
    setPhotoIndex(null);
    setPanel(nextPanel);
    // A menu-to-card transition is one overlay visit, so Back returns to the home.
    const state = { ...window.history.state, weddingOverlay: panel ? window.history.state?.weddingOverlay === true : true, weddingPhoto: false };
    if (panel) window.history.replaceState(state, "", `#${nextPanel}`);
    else window.history.pushState(state, "", `#${nextPanel}`);
  };

  const closePanel = () => {
    setPhotoIndex(null);
    setPanel(null);
    if (window.history.state?.weddingOverlay) window.history.back();
    else window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  };

  const openPhoto = (index: number) => {
    photoOpenerRef.current = document.activeElement as HTMLElement | null;
    setPhotoIndex(index);
    window.history.pushState({ ...window.history.state, weddingPhoto: true }, "", `#gallery/photo-${index + 1}`);
  };
  const changePhoto = (index: number) => {
    setPhotoIndex(index);
    window.history.replaceState(window.history.state, "", `#gallery/photo-${index + 1}`);
  };
  const closePhoto = () => {
    setPhotoIndex(null);
    if (window.history.state?.weddingPhoto) window.history.back();
    else window.history.replaceState(window.history.state, "", "#gallery");
  };

  return (
    <>
    {/* Separate opaque edges let Safari resample each endpoint on theme changes. */}
    <div className="browser-edge browser-edge-top" aria-hidden="true" style={{ backgroundColor: themeBrowserColors[theme].top }} />
    <div className="browser-edge browser-edge-bottom" aria-hidden="true" style={{ backgroundColor: themeBrowserColors[theme].bottom }} />
    <main className="app-shell" data-theme={theme} onPointerMove={handleGlassPointerMove} onPointerLeave={resetGlassPointer}>
      <svg className="glass-filter-definitions" aria-hidden="true" focusable="false">
        <defs>
          {/* Palette-only filters leave the original drawing and alpha untouched. */}
          <filter id="theme-blue-art" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="
              0.268936 1.445890 -0.540179 0 -0.174647
              -0.085986 1.033767 0.004613 0 0.047606
              0.025925 -0.821340 1.404189 0 0.391226
              0 0 0 1 0" />
          </filter>
          <filter id="theme-blue-hero" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="
              0.280616 2.334735 -1.574683 0 -0.040667
              0.059949 0.805439 0.131224 0 0.003389
              0.413646 -1.342473 1.905443 0 0.023384
              0 0 0 1 0" />
          </filter>
          <filter id="glass-distortion" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="turbulence" baseFrequency="0.008" numOctaves="2" result="noise" />
            <feDisplacementMap id="glass-displacement-map" in="SourceGraphic" in2="noise" scale="8" />
          </filter>
        </defs>
      </svg>
      {!splashComplete && <SplashGate step={splashStep} password={autoPassword} theme={theme} onEnter={enterSite} />}
      <div className="app-scenes" inert={!splashComplete || overlayOpen} aria-hidden={!splashComplete || overlayOpen}>
        <header className="home-header glass-card">
          <GlassLayers />
          <button className="home-logo glass-content" onClick={() => openPanel("story")} aria-label="우리 이야기 보기" aria-haspopup="dialog">
            <img src={themeAsset("/assets/doodle-message.png", theme)} alt="" />
          </button>
          <span className="home-header-title glass-content">wedding invitaion</span>
          <button className="home-menu-trigger glass-content" onClick={() => openPanel("menu")} aria-label="전체 메뉴 열기" aria-haspopup="dialog" aria-expanded={panel === "menu"}>
            <span className="material-symbols-rounded" aria-hidden>menu</span>
          </button>
        </header>
      <section ref={homeScrollRef} className="app-screen home-screen active">
        <div className="home-content">
          <section className="home-hero" aria-labelledby="home-hero-title">
            <p>WE ARE GETTING MARRIED</p>
            <h1 id="home-hero-title" aria-label="다연과 재훈">다연 <i className="home-name-heart material-symbols-rounded" aria-hidden>favorite</i> 재훈</h1>
            <strong>2027. 05. 15 · PM 06:30</strong>
            <span>퍼스트가든, 해피가든</span>
            <div className="home-hero-art" aria-hidden>
              <img className="hero-couple" src={themeAsset("/assets/doodle-couple-main.png", theme)} alt="" />
            </div>
          </section>

          <section className="home-quick-grid" aria-label="주요 안내">
            {homeQuickLinks.map((item, index) => (
              <button key={item.page} className={`home-quick-card glass-card ${index > 2 ? "home-secondary-card" : ""}`} onClick={() => openPanel(item.page as PanelKey)} aria-haspopup="dialog">
                <GlassLayers />
                <span className="home-quick-art glass-content">
                  <img className="glass-content" src={themeAsset(item.image, theme)} alt="" />
                </span>
                <span className="home-quick-label glass-content">{item.symbol && <span className="material-symbols-rounded" aria-hidden>{item.symbol}</span>}{item.label}</span>
              </button>
            ))}
          </section>

        </div>

      </section>

        <nav className="home-bottom-nav glass-card" aria-label="빠른 메뉴">
          <GlassLayers />
          <button className="glass-content" onClick={() => openPanel("alert")} aria-haspopup="dialog"><span className="material-symbols-rounded" aria-hidden>mail</span><span>RSVP</span></button>
          <button className="glass-content" onClick={() => openPanel("menu")} aria-haspopup="dialog"><span className="material-symbols-rounded" aria-hidden>grid_view</span><span>전체메뉴</span></button>
          <button className="glass-content theme-toggle" onClick={cycleTheme} aria-label={`테마 변경, 현재 ${themeLabels[theme]}`} aria-pressed={theme === "blue-mint"} title={`현재 ${themeLabels[theme]} · 눌러서 테마 변경`}><span className="material-symbols-rounded" aria-hidden>contrast</span><span>테마</span></button>
        </nav>

      </div>

      {splashComplete && panel && (
        <PanelDialog panel={panel} theme={theme} onClose={closePanel} suspended={photoIndex !== null}>
          {panel === "alert" && <div className="notice-card info-card"><h3 className="event-date"><span>2027. 05. 15</span><span>PM 06:30</span></h3><p>First Garden · Paju, Korea</p><hr /><p>따뜻한 축복으로 함께해 주세요.</p></div>}
          {panel === "dinner" && <div className="notice-card info-card"><h3>Wedding Dinner</h3><p>예식 후 First Garden 연회장에서<br />따뜻한 저녁 식사가 준비됩니다.</p><hr /><p>17:30 · Garden Hall</p></div>}
          {panel === "story" && <div className="notice-card info-card story-copy"><h3>Two lives,<br />one beautiful beginning.</h3><p>소중한 분들과 함께 새로운 시작을 나누고 싶습니다.</p><strong>다연 <i>♥</i> 재훈</strong></div>}

          {panel === "location" && <div className="sheet-location-content">
            <div className="map-card map-preview">
              <iframe className="map-preview-frame" src={mapPreviewUrl} title="First Garden 위치 지도" loading="lazy" />
              <a className="map-preview-copy" href={naverMapUrl} target="_blank" rel="noreferrer" aria-label="네이버 지도에서 First Garden 위치 열기"><strong>First Garden</strong><span>경기도 파주시 탑삭골길 260</span><em>네이버 지도에서 보기 ↗</em></a>
            </div>
            <div className="location-copy"><h3>퍼스트가든, 해피가든</h3><p>경기도 파주시 탑삭골길 260</p><a href={naverDirectionsUrl} target="_blank" rel="noreferrer">자세히 <span aria-hidden>↗</span></a></div>
          </div>}

          {panel === "gallery" && <div className="sheet-gallery-content">
            <div className="gallery-tabs" aria-label="갤러리 분류">
              {galleryTabs.map((tab) => <button key={tab.label} className={galleryTab === tab.label ? "active" : ""} onClick={() => setGalleryTab(tab.label)} aria-pressed={galleryTab === tab.label}><img src={themeAsset(tab.icon, theme)} alt="" />{tab.label}</button>)}
            </div>
            <div className={`gallery-grid tab-${galleryTab.toLowerCase()}`}>
              {galleryImages.map((src, index) => <button className={`gallery-photo photo-${index + 1}`} key={index} onClick={() => openPhoto(index)} aria-label={`웨딩 사진 ${index + 1} 크게 보기`}><img src={src} alt={`${galleryTab} 웨딩 사진 ${index + 1}`} loading="lazy" /></button>)}
            </div>
          </div>}

          {panel === "guestbook" && <Guestbook />}

          {panel === "menu" && <div className="home-menu-grid">
            {homeQuickLinks.map((item) => <button className="glass-card" key={item.page} onClick={() => openPanel(item.page as PanelKey)} aria-haspopup="dialog"><GlassLayers /><img className="glass-content" src={themeAsset(item.image, theme)} alt="" /><span className="glass-content">{item.label}</span></button>)}
          </div>}
        </PanelDialog>
      )}
      {photoIndex !== null && <PhotoViewer index={photoIndex} onClose={closePhoto} onChange={changePhoto} returnFocus={photoOpenerRef.current} />}
    </main>
    </>
  );
}
