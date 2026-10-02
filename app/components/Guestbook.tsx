"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { formatGuestbookDate, getGuestbookClient, guestbookConfigured, GUESTBOOK_PAGE_SIZE, type GuestbookEntry } from "../lib/guestbook";

export default function Guestbook() {
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [loading, setLoading] = useState(guestbookConfigured);
  const [submitting, setSubmitting] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [listError, setListError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const requestId = useRef(0);
  const submitLock = useRef(false);
  const mounted = useRef(false);
  const retryOffset = useRef(0);

  const loadEntries = useCallback(async (offset = 0) => {
    const client = getGuestbookClient();
    if (!client) return;
    const currentRequest = ++requestId.current;
    retryOffset.current = offset;
    setLoading(true);
    setListError("");
    try {
      const { data, error } = await client.rpc("list_guestbook_entries", { p_limit: GUESTBOOK_PAGE_SIZE + 1, p_offset: offset });
      if (!mounted.current || currentRequest !== requestId.current) return;
      if (error) throw error;
      const rows = data ?? [];
      setHasMore(rows.length > GUESTBOOK_PAGE_SIZE);
      setEntries((previous) => {
        const next = rows.slice(0, GUESTBOOK_PAGE_SIZE);
        return offset === 0 ? next : [...previous, ...next.filter((entry) => !previous.some((old) => old.id === entry.id))];
      });
    } catch {
      if (mounted.current && currentRequest === requestId.current) setListError("방명록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      if (mounted.current && currentRequest === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    // The initial request synchronizes the component with the external DB.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadEntries();
    return () => { mounted.current = false; requestId.current += 1; };
  }, [loadEntries]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    setFormError("");
    setSuccess("");
    if (!name.trim() || !message.trim()) {
      setFormError("이름과 축하 메시지를 모두 입력해 주세요.");
      return;
    }
    const client = getGuestbookClient();
    if (!client) return;
    submitLock.current = true;
    setSubmitting(true);
    try {
      const { error } = await client.rpc("submit_guestbook_entry", { p_name: name.trim(), p_message: message.trim(), p_is_secret: isSecret });
      if (error) throw error;
      if (!mounted.current) return;
      setSuccess(isSecret ? "비밀글을 남겼어요. 두 사람에게만 메시지가 전달됩니다." : "따뜻한 마음을 남겨주셔서 감사합니다!");
      setName("");
      setMessage("");
      setIsSecret(false);
      await loadEntries();
    } catch {
      if (mounted.current) setFormError("메시지 저장을 확인하지 못했어요. 새로고침으로 등록 여부를 확인한 뒤 다시 시도해 주세요.");
    } finally {
      submitLock.current = false;
      if (mounted.current) setSubmitting(false);
    }
  }

  return (
    <div className="guestbook-content">
      <div className="guestbook-intro"><span className="guestbook-heart" aria-hidden>♡</span><p>두 사람의 시작에<br /><strong>따뜻한 마음을 남겨주세요.</strong></p></div>
      {!guestbookConfigured && <p className="guestbook-notice" role="status">방명록을 준비하고 있어요. 조금만 기다려 주세요.</p>}
      <form className="guestbook-form" onSubmit={submit} aria-label="방명록 작성">
        <label htmlFor="guestbook-name">이름</label>
        <input id="guestbook-name" name="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={30} required autoComplete="name" placeholder="이름을 알려주세요" disabled={!guestbookConfigured || submitting} />
        <label htmlFor="guestbook-message">축하 메시지</label>
        <textarea id="guestbook-message" name="message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} rows={4} required placeholder="오래도록 간직할 축하의 한마디" aria-describedby="guestbook-character-count" disabled={!guestbookConfigured || submitting} />
        <span className="guestbook-character-count" id="guestbook-character-count">{message.length} / 1,000</span>
        <label className="guestbook-secret" htmlFor="guestbook-secret"><input id="guestbook-secret" type="checkbox" checked={isSecret} onChange={(event) => setIsSecret(event.target.checked)} disabled={!guestbookConfigured || submitting} /><span>비밀글로 남기기<small>메시지는 두 사람만 볼 수 있어요. 이름은 공개됩니다.</small></span></label>
        {formError && <p className="guestbook-error" role="alert">{formError}</p>}
        {success && <p className="guestbook-success" role="status">{success}</p>}
        <button className="guestbook-primary" type="submit" disabled={!guestbookConfigured || submitting}>{submitting ? "마음을 전하는 중…" : "축하 메시지 남기기"}</button>
      </form>
      <section className="guestbook-list" aria-label="축하 메시지 목록" aria-busy={loading}>
        <div className="guestbook-list-heading"><h3>전해주신 마음</h3>{guestbookConfigured && <button type="button" className="guestbook-text-button" disabled={loading || submitting} onClick={() => void loadEntries()}>새로고침</button>}</div>
        {entries.map((entry) => <article className="guestbook-entry" key={entry.id}>
          <header><strong>{entry.name}</strong><time dateTime={entry.created_at}>{formatGuestbookDate(entry.created_at)}</time></header>
          {entry.is_secret ? <p className="guestbook-locked"><span aria-hidden>🔒</span> 비밀글입니다.</p> : <p className="guestbook-message">{entry.message}</p>}
        </article>)}
        {loading && <p className="guestbook-empty" role="status">마음을 불러오는 중…</p>}
        {!loading && !listError && entries.length === 0 && guestbookConfigured && <p className="guestbook-empty">첫 번째 축하 메시지를 남겨주세요.</p>}
        {listError && <div className="guestbook-list-error"><p className="guestbook-error" role="alert">{listError}</p><button className="guestbook-secondary" type="button" disabled={loading || submitting} onClick={() => void loadEntries(retryOffset.current)}>다시 불러오기</button></div>}
        {hasMore && !listError && <button className="guestbook-secondary guestbook-more" type="button" onClick={() => void loadEntries(entries.length)} disabled={loading || submitting}>메시지 더 보기</button>}
      </section>
    </div>
  );
}
