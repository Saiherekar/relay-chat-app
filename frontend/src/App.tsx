import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./services/api";
import { connectSocket, disconnectSocket } from "./services/socket";
import type { ApiResponse, ChatItem, ChatMessage, User } from "./types";
import {
  MessageCircle,
  Search,
  Plus,
  Settings,
  Users,
  Inbox,
  Send,
  Paperclip,
  Smile,
  Phone,
  Video,
  MoreHorizontal,
  CheckCheck,
  Check,
  ArrowLeft,
  LogOut,
  Moon,
  Sun,
  Sparkles,
  X,
  PanelLeftClose,
} from "lucide-react";

const initials = (name: string) =>
  name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
const timeLabel = (date?: string | null) => {
  if (!date) return "";
  const d = new Date(date);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
};
function Avatar({
  name,
  online = false,
  small = false,
}: {
  name: string;
  online?: boolean;
  small?: boolean;
}) {
  return (
    <div className={`avatar ${small ? "small" : ""}`}>
      <span>{initials(name)}</span>
      {online && <i />}
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("relay_token") ?? "");
  const [me, setMe] = useState<User | null>(
    JSON.parse(localStorage.getItem("relay_user") ?? "null"),
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [register, setRegister] = useState(false);
  const [authError, setAuthError] = useState("");
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [selected, setSelected] = useState<ChatItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [dark, setDark] = useState(false);
  const [mobileChat, setMobileChat] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [notice, setNotice] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<ReturnType<typeof connectSocket> | null>(null);
  const filtered = useMemo(
    () =>
      chats.filter(
        (c) =>
          c.otherUserName.toLowerCase().includes(search.toLowerCase()) ||
          (c.latestMessage?.text ?? "")
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [chats, search],
  );

  useEffect(() => {
    if (!token) return;
    void loadChats();
    const s = connectSocket(token);
    socketRef.current = s;
    s.on("receive_message", (m: ChatMessage) => {
      setMessages((old) =>
        old.some((x) => x.id === m.id) ? old : [...old, m],
      );
      setChats((old) =>
        old
          .map((c) => (c.chatId === m.chatId ? { ...c, latestMessage: m } : c))
          .sort(
            (a, b) =>
              new Date(b.latestMessage?.timestamp ?? 0).getTime() -
              new Date(a.latestMessage?.timestamp ?? 0).getTime(),
          ),
      );
    });
    s.on("user_online", ({ userId }: { userId: number }) =>
      setChats((old) =>
        old.map((c) => (c.otherUserId === userId ? { ...c, isOnline: 1 } : c)),
      ),
    );
    s.on("user_offline", ({ userId }: { userId: number }) =>
      setChats((old) =>
        old.map((c) => (c.otherUserId === userId ? { ...c, isOnline: 0 } : c)),
      ),
    );
    return () => {
      s.off("receive_message");
      disconnectSocket();
    };
  }, [token]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selected]);
  async function loadChats() {
    try {
      const r = await api.get<ApiResponse<ChatItem[]>>("/user/chats");
      setChats(r.data.data);
    } catch {
      setNotice(
        "Could not load conversations. Check your API and database configuration.",
      );
    }
  }
  async function authenticate(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    try {
      const endpoint = register ? "/user/register" : "/user/login";
      const r = await api.post<ApiResponse<{ token: string; user: User }>>(
        endpoint,
        register ? { name, email, password } : { email, password },
      );
      localStorage.setItem("relay_token", r.data.data.token);
      localStorage.setItem("relay_user", JSON.stringify(r.data.data.user));
      setToken(r.data.data.token);
      setMe(r.data.data.user);
    } catch (err) {
      setAuthError(
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Unable to authenticate. Is the backend running?",
      );
    }
  }
  async function openChat(chat: ChatItem) {
    setSelected(chat);
    setMobileChat(true);
    setMessages([]);
    setLoading(true);
    socketRef.current?.emit("join_chat", { chatId: chat.chatId });
    try {
      const r = await api.get<
        ApiResponse<{
          messages: ChatMessage[];
          hasMore: boolean;
          nextCursor: string | null;
        }>
      >(`/chat/${chat.chatId}/messages?limit=40`);
      setMessages(r.data.data.messages);
    } catch {
      setNotice("Unable to load messages.");
    } finally {
      setLoading(false);
    }
  }
  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    if (!selected || !draft.trim() || sending) return;
    const text = draft.trim();
    const clientId = crypto.randomUUID();
    setDraft("");
    setSending(true);
    try {
      const r = await api.post<ApiResponse<ChatMessage>>(
        `/chat/${selected.chatId}/message/send`,
        { text, clientId },
      );
      setMessages((old) =>
        old.some((m) => m.id === r.data.data.id) ? old : [...old, r.data.data],
      );
      setChats((old) =>
        old.map((c) =>
          c.chatId === selected.chatId
            ? { ...c, latestMessage: r.data.data }
            : c,
        ),
      );
    } catch {
      setDraft(text);
      setNotice("Message could not be sent. Please retry.");
    } finally {
      setSending(false);
    }
  }
  async function createChat(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await api
        .get<ApiResponse<User>>(`/user/${encodeURIComponent("0")}/profile`)
        .catch(() => null);
      void r;
      const searchResult = await api.post<ApiResponse<{ chatId: string }>>(
        "/chat/create",
        { userAId: me?.id, userBId: Number(newEmail) },
      );
      await loadChats();
      setShowNew(false);
      setNewEmail("");
      setNotice(
        `Conversation ${searchResult.data.data.chatId} created. Refresh the list if it is not visible.`,
      );
    } catch (err) {
      setNotice(
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Enter the other person's numeric user ID.",
      );
    }
  }
  function logout() {
    localStorage.removeItem("relay_token");
    localStorage.removeItem("relay_user");
    disconnectSocket();
    setToken("");
    setMe(null);
    setSelected(null);
    setChats([]);
  }
  if (!token || !me)
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="brand-mark">
            <MessageCircle size={23} />
          </div>
          <div className="eyebrow">YOUR WORKSPACE, IN SYNC</div>
          <h1>{register ? "Create your account" : "Welcome back"}</h1>
          <p className="muted">
            A calmer place for conversations that move work forward.
          </p>
          <form onSubmit={authenticate} className="auth-form">
            {register && (
              <label>
                Your name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  required
                />
              </label>
            )}
            <label>
              Work email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 10 characters"
                minLength={register ? 10 : 1}
                required
              />
            </label>
            {authError && <div className="error">{authError}</div>}
            <button className="primary wide">
              {register ? "Create account" : "Sign in"} <span>→</span>
            </button>
          </form>
          <div className="auth-switch">
            {register ? "Already have an account?" : "New to Relay?"}{" "}
            <button onClick={() => setRegister(!register)}>
              {register ? "Sign in" : "Create an account"}
            </button>
          </div>
        </div>
        <div className="auth-side">
          <div className="side-quote">
            <Sparkles size={18} />
            <h2>
              Good conversations
              <br />
              make great work.
            </h2>
            <p>
              Bring your people, ideas and decisions into one thoughtful space.
            </p>
          </div>
          <div className="side-bottom">
            RELAY <span>MESSAGING, MADE CLEAR.</span>
          </div>
        </div>
      </div>
    );
  return (
    <main className={dark ? "app dark" : "app"}>
      <aside className={`rail ${mobileChat ? "mobile-hide" : ""}`}>
        <div className="rail-brand">
          <div className="brand-mark compact">
            <MessageCircle size={20} />
          </div>
        </div>
        <button className="rail-active" title="Messages">
          <MessageCircle />
        </button>
        <button title="Contacts">
          <Users />
        </button>
        <button title="Inbox">
          <Inbox />
        </button>
        <div className="rail-spacer" />
        <button onClick={() => setDark(!dark)} title="Toggle theme">
          {dark ? <Sun /> : <Moon />}
        </button>
        <button title="Settings">
          <Settings />
        </button>
        <button onClick={logout} title="Sign out">
          <LogOut />
        </button>
        <div className="rail-avatar">
          <Avatar name={me.name} />
        </div>
      </aside>
      <section
        className={`conversation-panel ${mobileChat ? "mobile-hide" : ""}`}
      >
        <header className="panel-heading">
          <div>
            <div className="eyebrow">WORKSPACE</div>
            <h2>
              Messages <span className="count">{chats.length}</span>
            </h2>
          </div>
          <button
            className="icon-button add-button"
            onClick={() => setShowNew(true)}
            title="New conversation"
          >
            <Plus size={19} />
          </button>
        </header>
        <div className="search-box">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
          />
          <kbd>⌘ K</kbd>
        </div>
        <div className="list-label">
          <span>RECENT</span>
          <button onClick={() => setShowNew(true)}>+ New</button>
        </div>
        <div className="chat-list">
          {filtered.map((chat) => (
            <button
              key={chat.chatId}
              className={`chat-row ${selected?.chatId === chat.chatId ? "selected" : ""}`}
              onClick={() => void openChat(chat)}
            >
              <Avatar name={chat.otherUserName} online={!!chat.isOnline} />
              <div className="chat-row-copy">
                <div className="chat-row-top">
                  <b>{chat.otherUserName}</b>
                  <time>{timeLabel(chat.latestMessage?.timestamp)}</time>
                </div>
                <div className="chat-row-bottom">
                  <span>
                    {chat.latestMessage?.text ?? "Start a conversation"}
                  </span>
                  {chat.unreadCount > 0 && <i>{chat.unreadCount}</i>}
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="list-empty">
              <div className="empty-icon">
                <MessageCircle />
              </div>
              <b>No conversations yet</b>
              <p>Start a new conversation with a teammate.</p>
              <button onClick={() => setShowNew(true)}>Start a chat</button>
            </div>
          )}
        </div>
        <footer className="profile-strip">
          <Avatar name={me.name} online />
          <div>
            <b>{me.name}</b>
            <small>Available</small>
          </div>
          <button onClick={logout} title="Sign out">
            <LogOut size={17} />
          </button>
        </footer>
      </section>
      <section className={`chat-panel ${mobileChat ? "mobile-visible" : ""}`}>
        {selected ? (
          <>
            <header className="chat-header">
              <button
                className="icon-button mobile-back"
                onClick={() => {
                  setMobileChat(false);
                  socketRef.current?.emit("leave_chat", {
                    chatId: selected.chatId,
                  });
                }}
              >
                <ArrowLeft />
              </button>
              <Avatar
                name={selected.otherUserName}
                online={!!selected.isOnline}
              />
              <div className="header-person">
                <b>{selected.otherUserName}</b>
                <small>
                  <i
                    className={selected.isOnline ? "online-dot" : "offline-dot"}
                  />
                  {selected.isOnline
                    ? "Active now"
                    : `Last seen ${timeLabel(selected.lastSeen)}`}
                </small>
              </div>
              <div className="header-actions">
                <button className="icon-button" title="Audio call">
                  <Phone />
                </button>
                <button className="icon-button" title="Video call">
                  <Video />
                </button>
                <span className="action-divider" />
                <button className="icon-button" title="More">
                  <MoreHorizontal />
                </button>
              </div>
            </header>
            <div className="message-area">
              {loading ? (
                <div className="loading-lines">
                  <i />
                  <i />
                  <i />
                </div>
              ) : messages.length === 0 ? (
                <div className="conversation-empty">
                  <div className="empty-illustration">
                    <MessageCircle size={30} />
                    <Sparkles size={16} />
                  </div>
                  <h3>It's a fresh conversation</h3>
                  <p>
                    Say hello to {selected.otherUserName} and get things moving.
                  </p>
                </div>
              ) : (
                <>
                  <div className="date-divider">
                    <span>TODAY</span>
                  </div>
                  {messages.map((m, i) => {
                    const mine = m.senderId === me.id;
                    return (
                      <div
                        key={m.id}
                        className={`message-line ${mine ? "mine" : ""}`}
                      >
                        <div className="message-content">
                          {!mine && (
                            <Avatar name={selected.otherUserName} small />
                          )}
                          <div className="message-stack">
                            <div className="bubble">
                              {m.deletedAt
                                ? "This message was deleted"
                                : m.text}
                            </div>
                            <div className="message-meta">
                              {timeLabel(m.timestamp)}{" "}
                              {mine &&
                                (i === messages.length - 1 ? (
                                  <CheckCheck
                                    size={13}
                                    className="read-check"
                                  />
                                ) : (
                                  <Check size={13} />
                                ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </>
              )}
            </div>
            <form className="composer" onSubmit={sendMessage}>
              <div className="composer-tools">
                <button
                  type="button"
                  title="Attach file"
                  onClick={() =>
                    setNotice("File attachments are not enabled in this build.")
                  }
                >
                  <Paperclip />
                </button>
                <button
                  type="button"
                  title="Emoji"
                  onClick={() => setDraft((d) => d + " 😊")}
                >
                  <Smile />
                </button>
              </div>
              <input
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (selected)
                    socketRef.current?.emit("typing", {
                      chatId: selected.chatId,
                    });
                }}
                placeholder={`Message ${selected.otherUserName}…`}
                maxLength={5000}
              />
              <button
                className="send-button"
                disabled={!draft.trim() || sending}
                title="Send message"
              >
                <Send size={17} />
              </button>
              <div className="composer-hint">
                Enter to send · Shift + Enter for a new line
              </div>
            </form>
          </>
        ) : (
          <div className="welcome-panel">
            <div className="welcome-art">
              <div className="art-orbit orbit-one" />
              <div className="art-orbit orbit-two" />
              <div className="art-core">
                <MessageCircle size={34} />
              </div>
              <div className="art-dot dot-one" />
              <div className="art-dot dot-two" />
              <div className="art-dot dot-three" />
            </div>
            <div className="eyebrow">A BETTER WAY TO CONNECT</div>
            <h1>
              Make room for
              <br />
              <em>good conversations.</em>
            </h1>
            <p>
              Choose a conversation from your inbox, or start a new one to bring
              your team together.
            </p>
            <button className="primary" onClick={() => setShowNew(true)}>
              <Plus size={17} /> Start a conversation
            </button>
            <div className="welcome-foot">
              PRIVATE BY DESIGN <span /> BUILT FOR MOMENTUM
            </div>
          </div>
        )}
      </section>
      {showNew && (
        <div className="modal-backdrop" onClick={() => setShowNew(false)}>
          <form
            className="modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={createChat}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowNew(false)}
            >
              <X />
            </button>
            <div className="eyebrow">NEW MESSAGE</div>
            <h2>Start a conversation</h2>
            <p>
              Enter the numeric user ID of the teammate you want to message.
            </p>
            <label>
              Teammate user ID
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e.g. 2"
                inputMode="numeric"
                required
              />
            </label>
            <button className="primary wide">
              Create conversation <span>→</span>
            </button>
          </form>
        </div>
      )}
      {notice && (
        <div className="toast" onClick={() => setNotice("")}>
          {notice}
          <button>
            <X size={14} />
          </button>
        </div>
      )}
    </main>
  );
}
