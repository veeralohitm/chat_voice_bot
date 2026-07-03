import { useEffect, useRef, useState } from 'react';
import { sendMessage } from './api';

const SESSION_KEY = 'mortgage-chat-session-id';
const MESSAGES_KEY_PREFIX = 'mortgage-chat-messages-';

function loadSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function loadMessages(sessionId) {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY_PREFIX + sessionId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const WELCOME_MESSAGE = {
  role: 'assistant',
  text: "Hi! I'm the virtual assistant for XYZ Mortgage Company. Send a message to get started - I'll ask a couple of quick questions to verify your identity before pulling up your loan details.",
};

function ChatBubbleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
    </svg>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '4px 2px' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--text-muted)',
            animation: 'bounce 1.1s infinite',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(loadSessionId);
  const [messages, setMessages] = useState(() => {
    const saved = loadMessages(sessionId);
    return saved.length ? saved : [WELCOME_MESSAGE];
  });
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(MESSAGES_KEY_PREFIX + sessionId, JSON.stringify(messages));
  }, [messages, sessionId]);

  useEffect(() => {
    if (isOpen) scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, isOpen]);

  const submit = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setDraft('');
    setSending(true);
    setError(null);

    try {
      const data = await sendMessage({ sessionId, message: text });
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }]);
      setVerified(Boolean(data.verified));
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const startOver = () => {
    const newId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, newId);
    setSessionId(newId);
    setMessages([WELCOME_MESSAGE]);
    setVerified(false);
    setError(null);
  };

  return (
    <>
      {isOpen && (
        <div className="chat-panel">
          <div
            style={{
              padding: '16px 18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: `linear-gradient(135deg, var(--accent), var(--accent-hover))`,
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                XM
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>XYZ Mortgage Company</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, opacity: 0.9 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: verified ? '#5be05b' : 'rgba(255,255,255,0.6)',
                    }}
                  />
                  {verified ? 'Identity verified' : 'Not yet verified'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={startOver}
                title="New chat"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '7px 8px',
                  cursor: 'pointer',
                  color: '#fff',
                }}
              >
                <RefreshIcon />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  padding: 6,
                  cursor: 'pointer',
                  color: '#fff',
                  opacity: 0.9,
                }}
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--page-plane)' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '80%',
                    background: m.role === 'user' ? 'var(--accent)' : 'var(--surface-1)',
                    color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: m.role === 'user' ? 'none' : 'var(--shadow-md)',
                    padding: '10px 14px',
                    fontSize: 14,
                    lineHeight: 1.45,
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {sending && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: 'var(--surface-1)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', padding: '8px 16px' }}>
                  <TypingIndicator />
                </div>
              </div>
            )}
            {error && (
              <div
                style={{
                  color: 'var(--status-critical)',
                  background: 'var(--status-critical-wash)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          <form onSubmit={submit} style={{ display: 'flex', gap: 8, padding: 14, borderTop: '1px solid var(--border)', background: 'var(--surface-1)' }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message…"
              disabled={sending}
              style={{
                flex: 1,
                border: '1px solid var(--border)',
                borderRadius: 999,
                padding: '10px 16px',
                fontSize: 14,
                background: 'var(--page-plane)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label="Send"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                flexShrink: 0,
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                opacity: sending || !draft.trim() ? 0.5 : 1,
                transition: 'opacity 0.12s ease',
              }}
            >
              <SendIcon />
            </button>
          </form>
        </div>
      )}

      <button className="chat-launcher" onClick={() => setIsOpen((v) => !v)} aria-label={isOpen ? 'Close chat' : 'Open chat'}>
        {!isOpen && <span className="chat-launcher-ring" />}
        {isOpen ? <CloseIcon /> : <ChatBubbleIcon />}
      </button>
    </>
  );
}
