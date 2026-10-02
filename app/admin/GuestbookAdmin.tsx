"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { formatGuestbookDate, getGuestbookClient, guestbookConfigured, type AdminGuestbookEntry } from "../lib/guestbook";

type Filter = "all" | "public" | "secret" | "hidden";
const filters: { value: Filter; label: string }[] = [{ value: "all", label: "전체" }, { value: "public", label: "공개글" }, { value: "secret", label: "비밀글" }, { value: "hidden", label: "숨긴 글" }];
const pageSize = 30;
const homePath = `${(process.env.NEXT_PUBLIC_SITE_BASE_PATH ?? "").replace(/\/$/, "")}/`;

export default function GuestbookAdmin() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(guestbookConfigured);
  const [authorized, setAuthorized] = useState(false);
  const [denied, setDenied] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [mailSent, setMailSent] = useState(false);
  const [entries, setEntries] = useState<AdminGuestbookEntry[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const requestId = useRef(0);
  const mounted = useRef(false);
  const actionLock = useRef(false);
  const userId = session?.user.id;

  useEffect(() => {
    mounted.current = true;
    const client = getGuestbookClient();
    if (!client) return () => { mounted.current = false; };
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.has("error") || hash.has("error_code")) {
      // Reflect the authentication provider's callback URL in the login UI.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("로그인 링크가 만료되었거나 유효하지 않아요. 인증 메일을 다시 받아주세요.");
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }
    let authRevision = 0;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      authRevision += 1;
      if (!mounted.current) return;
      setSession(nextSession);
      setCheckingAuth(false);
      if (!nextSession) {
        requestId.current += 1;
        setEntries([]);
        setAuthorized(false);
        setDenied(false);
        setLoading(false);
        setDeleteId(null);
      }
    });
    const revision = authRevision;
    void client.auth.getSession().then(({ data, error: authError }) => {
      if (!mounted.current || authRevision !== revision) return;
      if (authError) setError("로그인을 확인하지 못했어요. 인증 메일을 다시 받아주세요.");
      setSession(data.session);
      setCheckingAuth(false);
    }).catch(() => {
      if (mounted.current) { setError("로그인을 확인하지 못했어요. 잠시 후 다시 시도해 주세요."); setCheckingAuth(false); }
    });
    return () => { mounted.current = false; requestId.current += 1; subscription.unsubscribe(); };
  }, []);

  const loadEntries = useCallback(async (offset = 0) => {
    const client = getGuestbookClient();
    if (!client || !userId) return;
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    setDeleteId(null);
    try {
      const { data: isAdmin, error: permissionError } = await client.rpc("is_guestbook_admin");
      if (!mounted.current || currentRequest !== requestId.current) return;
      if (permissionError) throw permissionError;
      if (!isAdmin) {
        setAuthorized(false);
        setDenied(true);
        setEntries([]);
        return;
      }
      setAuthorized(true);
      setDenied(false);
      let query = client.from("guestbook_entries").select("id,name,message,is_secret,is_hidden,created_at", { count: "exact" });
      if (filter === "public") query = query.eq("is_secret", false);
      if (filter === "secret") query = query.eq("is_secret", true);
      if (filter === "hidden") query = query.eq("is_hidden", true);
      const { data, error: queryError, count } = await query.order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + pageSize);
      if (!mounted.current || currentRequest !== requestId.current) return;
      if (queryError) throw queryError;
      const rows = data ?? [];
      setTotal(count ?? 0);
      setHasMore(rows.length > pageSize);
      setEntries((previous) => offset === 0 ? rows.slice(0, pageSize) : [...previous, ...rows.slice(0, pageSize).filter((entry) => !previous.some((old) => old.id === entry.id))]);
    } catch {
      if (mounted.current && currentRequest === requestId.current) {
        setEntries([]);
        setError("방명록을 불러오지 못했어요. 연결과 관리자 권한 설정을 확인한 뒤 다시 시도해 주세요.");
      }
    } finally {
      if (mounted.current && currentRequest === requestId.current) setLoading(false);
    }
  }, [filter, userId]);

  useEffect(() => {
    // Clear previous account/filter data before synchronizing with Supabase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries([]);
    setHasMore(false);
    setTotal(0);
    setNotice("");
    setAuthorized(false);
    setDenied(false);
    if (userId) void loadEntries();
    return () => { requestId.current += 1; };
  }, [userId, loadEntries]);

  async function sendLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (actionLock.current) return;
    const client = getGuestbookClient();
    if (!client) return;
    actionLock.current = true;
    setSending(true);
    setError("");
    setMailSent(false);
    try {
      const redirect = new URL(window.location.href);
      redirect.hash = "";
      redirect.search = "";
      redirect.pathname = redirect.pathname.replace(/\/?$/, "/");
      const { error: authError } = await client.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false, emailRedirectTo: redirect.href } });
      if (authError) throw authError;
      if (mounted.current) setMailSent(true);
    } catch {
      if (mounted.current) setError("인증 메일을 보내지 못했어요. 등록된 관리자 이메일인지 확인하고 잠시 후 다시 시도해 주세요.");
    } finally {
      actionLock.current = false;
      if (mounted.current) setSending(false);
    }
  }

  async function signOut() {
    if (actionLock.current) return;
    const client = getGuestbookClient();
    if (!client) return;
    actionLock.current = true;
    setSigningOut(true);
    // Remove private content from the screen before the request starts.
    requestId.current += 1;
    setEntries([]);
    setAuthorized(false);
    setLoading(false);
    setHasMore(false);
    setTotal(0);
    setDeleteId(null);
    setNotice("");
    try {
      const { error: authError } = await client.auth.signOut({ scope: "local" });
      if (authError) throw authError;
      if (mounted.current) { setSession(null); setError(""); setMailSent(false); }
    } catch {
      if (mounted.current) setError("로그아웃하지 못했어요. 다시 시도해 주세요.");
    } finally {
      actionLock.current = false;
      if (mounted.current) setSigningOut(false);
    }
  }

  async function moderate(entry: AdminGuestbookEntry, action: "hide" | "delete") {
    if (actionLock.current || !authorized) return;
    const client = getGuestbookClient();
    if (!client) return;
    actionLock.current = true;
    setBusyId(entry.id);
    setError("");
    setNotice("");
    try {
      const query = action === "delete"
        ? client.from("guestbook_entries").delete().eq("id", entry.id)
        : client.from("guestbook_entries").update({ is_hidden: !entry.is_hidden }).eq("id", entry.id);
      const { data, error: mutationError } = await query.select("id");
      if (mutationError || data?.length !== 1) throw mutationError ?? new Error("No authorized row");
      if (!mounted.current) return;
      setNotice(action === "delete" ? "방명록을 삭제했어요." : entry.is_hidden ? "방명록을 다시 공개했어요." : "방명록을 숨겼어요.");
      setDeleteId(null);
      await loadEntries();
    } catch {
      if (mounted.current) setError("변경 사항을 확인하지 못했어요. 새로고침 후 글 상태와 관리자 권한을 확인해 주세요.");
    } finally {
      actionLock.current = false;
      if (mounted.current) setBusyId(null);
    }
  }

  return (
    <main className="guestbook-admin-shell">
      <div className="guestbook-admin-container">
        <a className="guestbook-back" href={homePath}>← 청첩장으로</a>
        <header className="guestbook-admin-heading"><div><p>다연 ♡ 재훈</p><h1>방명록 관리</h1></div>{session && <button className="guestbook-secondary" onClick={() => void signOut()} disabled={signingOut || busyId !== null}>{signingOut ? "로그아웃 중…" : "로그아웃"}</button>}</header>
        {error && <p className="guestbook-error guestbook-notice" role="alert">{error}</p>}
        {notice && <p className="guestbook-success guestbook-notice" role="status">{notice}</p>}
        {!guestbookConfigured && <div className="guestbook-admin-card"><h2>연결 설정이 필요해요</h2><p>Supabase 연결 정보를 설정하면 관리자 로그인을 사용할 수 있어요.</p></div>}
        {checkingAuth && <p className="guestbook-empty" role="status">로그인을 확인하는 중…</p>}
        {guestbookConfigured && !checkingAuth && !session && <div className="guestbook-admin-card guestbook-login-card">
          <span className="guestbook-heart" aria-hidden>♡</span><h2>관리자 확인</h2><p>등록된 이메일로 받은 로그인 링크를 눌러주세요.</p>
          <form className="guestbook-form" onSubmit={sendLink}><label htmlFor="admin-email">관리자 이메일</label><input id="admin-email" type="email" name="email" autoComplete="email" required value={email} onChange={(event) => { setEmail(event.target.value); setMailSent(false); }} placeholder="이메일을 입력해 주세요" disabled={sending} /><button className="guestbook-primary" type="submit" disabled={sending}>{sending ? "인증 메일 보내는 중…" : "인증 메일 보내기"}</button></form>
          {mailSent && <p className="guestbook-success" role="status">인증 메일을 보냈어요. 메일함과 스팸함을 확인해 주세요.</p>}
        </div>}
        {session && denied && <div className="guestbook-admin-card"><h2>관리자 권한이 없는 계정이에요</h2><p>관리자로 등록된 이메일로 다시 로그인해 주세요.</p></div>}
        {session && !denied && <section className="guestbook-admin-list" aria-label="방명록 관리 목록" aria-busy={loading}>
          <div className="guestbook-admin-toolbar"><div className="guestbook-filters" aria-label="방명록 분류">{filters.map((item) => <button key={item.value} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)} disabled={busyId !== null || signingOut}>{item.label}</button>)}</div><button className="guestbook-text-button" disabled={loading || busyId !== null || signingOut} onClick={() => void loadEntries()}>새로고침</button></div>
          {authorized && <p className="guestbook-admin-count">{filters.find((item) => item.value === filter)?.label} {total}개</p>}
          {entries.map((entry) => <article className={`guestbook-entry ${entry.is_hidden ? "is-hidden" : ""}`} key={entry.id}>
            <header><strong>{entry.name}</strong><time dateTime={entry.created_at}>{formatGuestbookDate(entry.created_at)}</time></header>
            <div className="guestbook-badges"><span>{entry.is_secret ? "🔒 비밀글" : "공개글"}</span>{entry.is_hidden && <span>숨김</span>}</div>
            <p className="guestbook-message">{entry.message}</p>
            <div className="guestbook-admin-actions"><button className="guestbook-secondary" onClick={() => void moderate(entry, "hide")} disabled={busyId !== null || loading || signingOut}>{busyId === entry.id ? "처리 중…" : entry.is_hidden ? "숨김 해제" : "숨기기"}</button><button className="guestbook-delete" onClick={() => setDeleteId(entry.id)} disabled={busyId !== null || loading || signingOut}>삭제</button></div>
            {deleteId === entry.id && <div className="guestbook-delete-confirm" role="group" aria-label={`${entry.name}의 방명록 삭제 확인`}><p>이 글을 삭제할까요? 삭제한 글은 되돌릴 수 없어요.</p><button className="guestbook-secondary" onClick={() => setDeleteId(null)} disabled={busyId !== null}>취소</button><button className="guestbook-delete" onClick={() => void moderate(entry, "delete")} disabled={busyId !== null}>{busyId === entry.id ? "삭제 중…" : "삭제 확인"}</button></div>}
          </article>)}
          {loading && <p className="guestbook-empty" role="status">방명록을 불러오는 중…</p>}
          {!loading && !error && authorized && entries.length === 0 && <p className="guestbook-empty">아직 등록된 글이 없어요.</p>}
          {hasMore && <button className="guestbook-secondary guestbook-more" onClick={() => void loadEntries(entries.length)} disabled={loading || busyId !== null || signingOut}>더 보기</button>}
        </section>}
      </div>
    </main>
  );
}
