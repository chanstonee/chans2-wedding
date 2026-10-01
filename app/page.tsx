"use client";

import { useEffect, useRef, useState, type PointerEventHandler } from "react";

type PageKey = "home" | "story" | "location" | "alert" | "gallery" | "dinner" | "thanks";
type SplashStep = 1 | 2 | 3;

const pageKeys: PageKey[] = ["home", "story", "location", "alert", "gallery", "dinner", "thanks"];
const splashPassword = "20270515";

const naverMapUrl = "https://naver.me/G6Rqydqw";
const mapPreviewUrl = "https://www.openstreetmap.org/export/embed.html?bbox=126.7891923%2C37.7266412%2C126.7991923%2C37.7366412&layer=mapnik&marker=37.7316412%2C126.7941923";
const naverDirectionsUrl = "https://map.naver.com/p/directions/-/3z9Y9h,2AT075,%EA%B2%BD%EA%B8%B0%20%ED%8C%8C%EC%A3%BC%EC%8B%9C%20%ED%83%91%EC%82%AD%EA%B3%A8%EA%B8%B8%20260,,ADDRESS_POI/-/car?c=16.44,0,0,0,dh";

const iconItems: Array<{ label: string; image: string; page: PageKey }> = [
  { label: "Story", image: "/assets/doodle-message.png", page: "story" },
  { label: "Adress", image: "/assets/doodle-map.png", page: "location" },
  { label: "Alert", image: "/assets/doodle-alert.png", page: "alert" },
  { label: "Gallery", image: "/assets/doodle-picture.png", page: "gallery" },
  { label: "Dinner", image: "/assets/doodle-dinner.png", page: "dinner" },
  { label: "Thanks to", image: "/assets/doodle-thanks.png", page: "thanks" },
];

const homeQuickLinks: Array<{ label: string; image: string; page: PageKey; symbol?: string }> = [
  { label: "오시는 길", image: "/assets/doodle-location.png", page: "location", symbol: "location_on" },
  { label: "날짜", image: "/assets/doodle-calendar.png", page: "alert", symbol: "calendar_month" },
  { label: "식사", image: "/assets/doodle-dinner.png", page: "dinner", symbol: "restaurant" },
  { label: "두 사람의 이야기", image: "/assets/doodle-message.png", page: "story" },
  { label: "사진첩", image: "/assets/doodle-picture.png", page: "gallery" },
  { label: "감사의 마음", image: "/assets/doodle-thanks.png", page: "thanks" },
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

function Header({ page, navigate, openInfo }: { page: PageKey; navigate: (page: PageKey) => void; openInfo: () => void }) {
  const isHome = page === "home";

  return (
    <header className="app-header">
      <button className={`header-back ${isHome ? "hidden" : ""}`} onClick={() => navigate("home")} aria-label="홈으로 돌아가기">
        <span aria-hidden>←</span> Back
      </button>
      <button className="app-brand" onClick={() => navigate("home")}>wedding invitaion</button>
      <button className="header-info" onClick={(event) => { event.currentTarget.blur(); openInfo(); }} aria-label="예식 안내 팝업 열기" aria-haspopup="dialog">
        Info <span aria-hidden>ⓘ</span>
      </button>
    </header>
  );
}

function ScreenTitle({ image, title }: { image: string; title: string }) {
  return (
    <div className="screen-title">
      <img className="screen-icon" src={image} alt="" />
      <div className="title-frame">
        <img src="/assets/title-frame.png" alt="" />
        <h1>{title}</h1>
      </div>
    </div>
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

function SplashGate({ step, password, onEnter }: { step: SplashStep; password: string; onEnter: () => void }) {
  const passwordReady = password === splashPassword;

  return (
    <section className={`splash-gate splash-step-${step}`} aria-label="웨딩 초대장 시작 화면">
      <picture className="splash-horse" aria-hidden>
        <source media="(max-width: 700px)" srcSet="/assets/doodle-message.png" />
        <img src="/assets/doodle-message.png" alt="" />
      </picture>

      <div className={`splash-stage splash-status ${step === 1 ? "is-active" : ""}`} role="status" aria-hidden={step !== 1}>
        <img className="splash-loader" src="/assets/splash-loader.svg" alt="" />
      </div>

      <div className={`splash-stage splash-status ${step === 2 ? "is-active" : ""}`} role="status" aria-live="polite" aria-hidden={step !== 2}>
        <img className="splash-loader" src="/assets/splash-loader.svg" alt="" />
        <span>Welcome</span>
      </div>

      <div className={`splash-stage splash-entry ${step === 3 ? "is-active" : ""}`} aria-hidden={step !== 3}>
        <div className="splash-mark">
          <img src="/assets/doodle-message.png" alt="" />
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
  const [page, setPage] = useState<PageKey>("home");
  const [galleryTab, setGalleryTab] = useState("Ceremony");
  const [infoOpen, setInfoOpen] = useState(false);
  const [splashStep, setSplashStep] = useState<SplashStep>(1);
  const [autoPassword, setAutoPassword] = useState("");
  const [splashComplete, setSplashComplete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const activeGlassRef = useRef<HTMLElement | null>(null);

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

  useEffect(() => {
    if (!infoOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInfoOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [infoOpen]);

  useEffect(() => {
    if (!splashComplete) return;

    const syncFromHash = () => {
      const hash = window.location.hash.slice(1) as PageKey;
      setPage(pageKeys.includes(hash) ? hash : "home");
    };
    syncFromHash();
    window.addEventListener("popstate", syncFromHash);
    return () => window.removeEventListener("popstate", syncFromHash);
  }, [splashComplete]);

  const enterSite = () => {
    if (autoPassword !== splashPassword) return;
    setPage("home");
    setSplashComplete(true);
    window.history.replaceState({}, "", window.location.pathname);
  };

  const navigate = (nextPage: PageKey) => {
    setInfoOpen(false);
    setMenuOpen(false);
    setPage(nextPage);
    const nextHash = nextPage === "home" ? window.location.pathname : `#${nextPage}`;
    window.history.pushState({}, "", nextHash);
  };

  return (
    <main className="app-shell" onPointerMove={handleGlassPointerMove} onPointerLeave={resetGlassPointer}>
      <svg className="glass-filter-definitions" aria-hidden="true" focusable="false">
        <defs>
          <filter id="glass-distortion" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="turbulence" baseFrequency="0.008" numOctaves="2" result="noise" />
            <feDisplacementMap id="glass-displacement-map" in="SourceGraphic" in2="noise" scale="8" />
          </filter>
        </defs>
      </svg>
      {!splashComplete && <SplashGate step={splashStep} password={autoPassword} onEnter={enterSite} />}
      <div className="app-scenes" inert={!splashComplete} aria-hidden={!splashComplete}>
      {page === "home" && (
        <header className="home-header glass-card">
          <GlassLayers />
          <button className="home-logo glass-content" onClick={() => navigate("story")} aria-label="우리 이야기 보기">
            <img src="/assets/doodle-message.png" alt="" />
          </button>
          <span className="home-header-title glass-content">wedding invitaion</span>
          <button className="home-menu-trigger glass-content" onClick={() => setMenuOpen(true)} aria-label="전체 메뉴 열기" aria-expanded={menuOpen}>
            <span className="material-symbols-rounded" aria-hidden>menu</span>
          </button>
        </header>
      )}
      <section className={`app-screen home-screen ${page === "home" ? "active" : ""}`} aria-hidden={page !== "home"}>
        <div className="home-content">
          <section className="home-hero" aria-labelledby="home-hero-title">
            <p>WE ARE GETTING MARRIED</p>
            <h1 id="home-hero-title" aria-label="다연과 재훈">다연 <i className="home-name-heart material-symbols-rounded" aria-hidden>favorite</i> 재훈</h1>
            <strong>2027. 05. 15 · PM 06:30</strong>
            <span>퍼스트가든, 해피가든</span>
            <div className="home-hero-art" aria-hidden>
              <img className="hero-couple" src="/assets/doodle-couple.png" alt="" />
            </div>
          </section>

          <section className="home-quick-grid" aria-label="주요 안내">
            {homeQuickLinks.map((item, index) => (
              <button key={item.page} className={`home-quick-card glass-card ${index > 2 ? "home-secondary-card" : ""}`} onClick={() => navigate(item.page)}>
                <GlassLayers />
                <span className="home-quick-art glass-content">
                  <img className="glass-content" src={item.image} alt="" />
                </span>
                <span className="home-quick-label glass-content">{item.symbol && <span className="material-symbols-rounded" aria-hidden>{item.symbol}</span>}{item.label}</span>
              </button>
            ))}
          </section>

        </div>

      </section>

      {page === "home" && (
        <nav className="home-bottom-nav glass-card" aria-label="빠른 메뉴">
          <GlassLayers />
          <button className="glass-content" onClick={() => navigate("alert")}><span className="material-symbols-rounded" aria-hidden>mail</span><span>RSVP</span></button>
          <button className="glass-content" onClick={() => setMenuOpen(true)}><span className="material-symbols-rounded" aria-hidden>grid_view</span><span>전체메뉴</span></button>
          <button className="glass-content" onClick={() => setInfoOpen(true)}><span className="material-symbols-rounded" aria-hidden>info</span><span>안내</span></button>
        </nav>
      )}

      <section className={`app-screen detail-screen story-screen ${page === "story" ? "active" : ""}`} aria-hidden={page !== "story"}>
        <Header page="story" navigate={navigate} openInfo={() => setInfoOpen(true)} />
        <div className="center-detail">
          <ScreenTitle image="/assets/doodle-message.png" title="OUR STORY" />
          <div className="story-copy">
            <h2>Two lives,<br />one beautiful beginning.</h2>
            <p>소중한 분들과 함께 새로운 시작을 나누고 싶습니다.</p>
            <strong>다연 <i>♥</i> 재훈</strong>
          </div>
        </div>
      </section>

      <section className={`app-screen detail-screen gallery-screen ${page === "gallery" ? "active" : ""}`} aria-hidden={page !== "gallery"}>
        <Header page="gallery" navigate={navigate} openInfo={() => setInfoOpen(true)} />
        <div className="gallery-content">
          <ScreenTitle image="/assets/doodle-picture.png" title="Gallery" />
          <div className="gallery-tabs" role="tablist" aria-label="갤러리 분류">
            {galleryTabs.map((tab) => (
              <button key={tab.label} className={galleryTab === tab.label ? "active" : ""} onClick={() => setGalleryTab(tab.label)} role="tab" aria-selected={galleryTab === tab.label} tabIndex={page === "gallery" ? 0 : -1}>
                <img src={tab.icon} alt="" aria-hidden />
                {tab.label}
              </button>
            ))}
          </div>
          <div className={`gallery-grid tab-${galleryTab.toLowerCase()}`}>
            {galleryImages.map((src, index) => (
              <div className={`gallery-photo photo-${index + 1}`} key={`${galleryTab}-${index}`}>
                <img src={src} alt={`${galleryTab} 웨딩 사진 ${index + 1}`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`app-screen detail-screen location-screen ${page === "location" ? "active" : ""}`} aria-hidden={page !== "location"}>
        <Header page="location" navigate={navigate} openInfo={() => setInfoOpen(true)} />
        <div className="location-content">
          <ScreenTitle image="/assets/doodle-map.png" title="LOCATION" />
          <div className="location-layout">
            <div className="map-card map-preview">
              <iframe className="map-preview-frame" src={mapPreviewUrl} title="First Garden 위치 지도" loading="lazy" tabIndex={-1} />
              <a className="map-preview-copy" href={naverMapUrl} target="_blank" rel="noreferrer" aria-label="네이버 지도에서 First Garden 위치 열기">
                <strong>First Garden</strong>
                <span>경기도 파주시 탑삭골길 260</span>
                <em>네이버 지도에서 보기 ↗</em>
              </a>
            </div>
            <div className="location-copy">
              <h2>First Garden,<br />Paju Korea</h2>
              <p>경기도 파주시 탑삭골길 260</p>
              <a href={naverDirectionsUrl} target="_blank" rel="noreferrer">자세히 <span aria-hidden>↗</span></a>
            </div>
          </div>
        </div>
      </section>

      <section className={`app-screen detail-screen notice-screen ${page === "alert" ? "active" : ""}`} aria-hidden={page !== "alert"}>
        <Header page="alert" navigate={navigate} openInfo={() => setInfoOpen(true)} />
        <div className="center-detail">
          <ScreenTitle image="/assets/doodle-alert.png" title="SAVE THE DATE" />
          <div className="notice-card">
            <h2 className="event-date"><span>2027. 05. 15</span>{" "}<span>PM 06:30</span></h2>
            <p>First Garden · Paju, Korea</p>
            <hr />
            <p>따뜻한 축복으로 함께해 주세요.</p>
          </div>
        </div>
      </section>

      <section className={`app-screen detail-screen dinner-screen ${page === "dinner" ? "active" : ""}`} aria-hidden={page !== "dinner"}>
        <Header page="dinner" navigate={navigate} openInfo={() => setInfoOpen(true)} />
        <div className="center-detail">
          <ScreenTitle image="/assets/doodle-dinner.png" title="DINNER" />
          <div className="notice-card">
            <h2>Wedding Dinner</h2>
            <p>예식 후 First Garden 연회장에서<br />따뜻한 저녁 식사가 준비됩니다.</p>
            <hr />
            <p>17:30 · Garden Hall</p>
          </div>
        </div>
      </section>

      <section className={`app-screen detail-screen thanks-screen ${page === "thanks" ? "active" : ""}`} aria-hidden={page !== "thanks"}>
        <Header page="thanks" navigate={navigate} openInfo={() => setInfoOpen(true)} />
        <div className="center-detail thanks-content">
          <ScreenTitle image="/assets/doodle-thanks.png" title="THANKS TO" />
          <div className="notice-card">
            <h2>With love and gratitude</h2>
            <p>저희의 시작을 축복해 주시는<br />모든 분께 진심으로 감사드립니다.</p>
            <strong>다연 ♥ 재훈</strong>
          </div>
        </div>
      </section>

      {menuOpen && (
        <div className="home-menu-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setMenuOpen(false)}>
          <section className="home-menu-panel glass-card" role="dialog" aria-modal="true" aria-label="전체 메뉴">
            <GlassLayers />
            <div className="home-menu-heading">
              <div><small>wedding invitaion</small><strong>다연 ♥ 재훈</strong></div>
              <button onClick={() => setMenuOpen(false)} aria-label="전체 메뉴 닫기"><span className="material-symbols-rounded" aria-hidden>close</span></button>
            </div>
            <div className="home-menu-grid">
              {iconItems.map((item) => (
                <button className="glass-card" key={item.page} onClick={() => navigate(item.page)}>
                  <GlassLayers />
                  <img className="glass-content" src={item.image} alt="" />
                  <span className="glass-content">{item.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {infoOpen && (
        <div className="info-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setInfoOpen(false)}>
          <section className="info-modal" role="dialog" aria-modal="true" aria-labelledby="info-modal-title">
            <img className="info-float-icon" src="/assets/doodle-alert.png" alt="" />
            <button className="info-close" onClick={() => setInfoOpen(false)} aria-label="팝업 닫기">
              <img src="/assets/close-circle2-filled.svg" alt="" />
            </button>
            <div className="title-frame info-title-frame">
              <img src="/assets/title-frame.png" alt="" />
              <h2 id="info-modal-title">SAVE THE DATE</h2>
            </div>
            <div className="notice-card info-card">
              <h2 className="event-date"><span>2027. 05. 15</span>{" "}<span>PM 06:30</span></h2>
              <p>First Garden · Paju, Korea</p>
              <hr />
              <p>따뜻한 축복으로 함께해 주세요.</p>
            </div>
          </section>
        </div>
      )}
      </div>
    </main>
  );
}
