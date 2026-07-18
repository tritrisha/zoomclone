"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Video, Plus, CalendarDays, Clock3, Copy, ChevronRight, HelpCircle, Bell, Search, Users, MoreHorizontal, Home, X, LogOut } from "lucide-react";
import Modal from "../components/Modal";
import { api, AuthUser, Meeting } from "../lib/api";

type ModalName = "join" | "schedule" | null;

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<{upcoming: Meeting[]; recent: Meeting[]}>({ upcoming: [], recent: [] });
  const [modal, setModal] = useState<ModalName>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joinId, setJoinId] = useState("");
  const [name, setName] = useState("tara barma");
  const [form, setForm] = useState({ title: "", description: "", scheduled_at: "", duration_minutes: 30 });
  const [query, setQuery] = useState("");
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [toast, setToast] = useState("");
  const [user, setUser] = useState<AuthUser|null>(null);

  const load = () => api.meetings().then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { const saved=localStorage.getItem("zooma_demo_user");if(!saved){router.replace("/auth");return}const u=JSON.parse(saved) as AuthUser;setUser(u);setName(u.name);load(); }, []);

  async function newMeeting() {
    try { setError(""); const m = await api.instant(); router.push(`/meeting/${m.meeting_id}?name=${encodeURIComponent(user?.name||"Host")}&host=1`); }
    catch (e) { setError((e as Error).message); }
  }
  function extractId(value: string) {
    const match = value.match(/meeting\/([0-9-]+)/); return (match?.[1] || value).replace(/\s/g, "");
  }
  async function join(e: React.FormEvent) {
    e.preventDefault();
    try { const id = extractId(joinId); await api.meeting(id); router.push(`/meeting/${id}?name=${encodeURIComponent(name)}`); }
    catch (e) { setError((e as Error).message); }
  }
  async function schedule(e: React.FormEvent) {
    e.preventDefault();
    try { await api.schedule(form); setModal(null); setForm({ title: "", description: "", scheduled_at: "", duration_minutes: 30 }); load(); }
    catch (e) { setError((e as Error).message); }
  }
  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2200); }
  function logout(){localStorage.removeItem("zooma_demo_user");router.replace("/auth");}
  function scrollTo(section: string) { document.getElementById(section)?.scrollIntoView({ behavior: "smooth" }); }
  const matches = (m: Meeting) => `${m.title} ${m.description} ${m.meeting_id}`.toLowerCase().includes(query.toLowerCase());
  const upcoming = data.upcoming.filter(matches).slice(0, showAllUpcoming || query ? undefined : 3);
  const recent = data.recent.filter(matches).slice(0, showAllRecent || query ? undefined : 4);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Video size={20}/></span><span>zooma</span></div>
      <nav><button className="active" onClick={() => window.scrollTo({top:0,behavior:"smooth"})}><Home/> Home</button><button onClick={() => router.push("/meetings")}><CalendarDays/> Meetings</button><button onClick={() => router.push("/contacts")}><Users/> Contacts</button><button onClick={() => router.push("/recordings")}><Clock3/> Recordings</button></nav>
      <div className="sidebar-bottom"><button onClick={() => notify("Support: support@zooma.local")}><HelpCircle/> Help & Support</button><button onClick={logout}><LogOut/> Change profile</button></div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div className="mobile-brand">zooma</div>
        <div className="search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search meetings..."/>{query&&<button className="icon-btn" onClick={()=>setQuery("")}><X size={15}/></button>}</div>
        <div className="top-actions"><button className="icon-btn" onClick={() => notify("You're all caught up!")} aria-label="Notifications"><Bell size={20}/><i/></button><button className="profile-button" onClick={() => notify(`Signed in as ${user?.email||"user"}`)}><div className="avatar">{(user?.name||"U").split(" ").map(x=>x[0]).join("").slice(0,2)}</div><div className="profile"><b>{user?.name||"Loading…"}</b><span>{user?.email||""}</span></div><ChevronRight size={17}/></button></div>
      </header>
      <section className="content">
        <div className="welcome"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Good morning, {user?.name?.split(" ")[0]||"there"} <span>👋</span></h1><p>Ready to connect? Start or join a meeting in seconds.</p></div><div className="date-chip"><CalendarDays size={18}/>{new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" })}</div></div>
        {error && <div className="error" onClick={() => setError("")}>{error}<span>×</span></div>}
        <div className="quick-grid">
          <button className="quick-card orange" onClick={newMeeting}><div className="quick-icon"><Video/></div><div><h3>New Meeting</h3><p>Start an instant meeting</p></div><ChevronRight/></button>
          <button className="quick-card blue" onClick={() => setModal("join")}><div className="quick-icon"><Plus/></div><div><h3>Join Meeting</h3><p>Enter a meeting ID</p></div><ChevronRight/></button>
          <button className="quick-card purple" onClick={() => setModal("schedule")}><div className="quick-icon"><CalendarDays/></div><div><h3>Schedule</h3><p>Plan a meeting for later</p></div><ChevronRight/></button>
        </div>
        <div className="section-head" id="upcoming"><div><h2>Upcoming meetings</h2><p>Your scheduled meetings for the next few days</p></div><button className="text-btn" onClick={()=>setShowAllUpcoming(v=>!v)}>{showAllUpcoming?"Show less":"View all"} <ChevronRight size={16}/></button></div>
        {loading ? <div className="loading">Loading your meetings…</div> : upcoming.length ? <div className="meeting-list">{upcoming.map((m, i) => <MeetingCard key={m.meeting_id} meeting={m} featured={i === 0} onCopied={()=>notify("Invite link copied")} onJoin={() => router.push(`/meeting/${m.meeting_id}?name=${encodeURIComponent(user?.name||"Host")}&host=1`)}/>)}</div> : <div className="empty"><CalendarDays/><h3>No meetings found</h3><p>{query?"Try a different search.":"Schedule one and it will appear here."}</p></div>}
        <div className="section-head recent-head" id="recent"><div><h2>Recent meetings</h2><p>Meetings you joined recently</p></div><button className="text-btn" onClick={()=>setShowAllRecent(v=>!v)}>{showAllRecent?"Show less":"View all"} <ChevronRight size={16}/></button></div>
        <div className="recent-grid">{recent.map(m => <div className="recent-card" key={m.meeting_id}><div className="recent-icon"><Video/></div><div><h3>{m.title}</h3><p>{new Date(m.scheduled_at).toLocaleDateString()} · {m.duration_minutes} min</p></div><button title="Meeting details" className="icon-btn" onClick={()=>notify(`${m.title} · ${m.duration_minutes} minutes · ${m.status}`)}><MoreHorizontal/></button></div>)}</div>
      </section>
    </main>
    {toast && <div className="toast">{toast}</div>}
    {modal === "join" && <Modal title="Join a meeting" onClose={() => setModal(null)}><form onSubmit={join} className="form"><label>Meeting ID or personal link<input autoFocus required value={joinId} onChange={e => setJoinId(e.target.value)} placeholder="Enter meeting ID or paste invite link"/></label><label>Your display name<input required value={name} onChange={e => setName(e.target.value)} /></label><p className="form-note">By joining, you agree to our Terms of Service and Privacy Statement.</p><button className="primary" type="submit">Join meeting</button></form></Modal>}
    {modal === "schedule" && <Modal title="Schedule a meeting" onClose={() => setModal(null)}><form onSubmit={schedule} className="form"><label>Meeting title<input required value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="e.g. Weekly product sync"/></label><label>Description<textarea value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="Add an agenda (optional)"/></label><div className="form-row"><label>Date & time<input type="datetime-local" required value={form.scheduled_at} onChange={e => setForm({...form,scheduled_at:e.target.value})}/></label><label>Duration<select value={form.duration_minutes} onChange={e => setForm({...form,duration_minutes:Number(e.target.value)})}><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">1 hour</option><option value="90">1.5 hours</option></select></label></div><button className="primary" type="submit">Schedule meeting</button></form></Modal>}
  </div>;
}

function MeetingCard({ meeting: m, featured, onJoin, onCopied }: { meeting: Meeting; featured: boolean; onJoin: () => void; onCopied: () => void }) {
  const d = new Date(m.scheduled_at);
  const copy = async () => { await navigator.clipboard.writeText(`${location.origin}/meeting/${m.meeting_id}`); onCopied(); };
  return <article className={`meeting-card ${featured ? "featured" : ""}`}><div className="meeting-time"><strong>{d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}</strong><span>{d.toLocaleDateString([], { month:"short", day:"numeric" })}</span></div><div className="divider"/><div className="meeting-info"><div className="meeting-status">{featured ? "NEXT UP" : "SCHEDULED"}</div><h3>{m.title}</h3><p><Clock3 size={15}/> {m.duration_minutes} min <span>•</span> <Users size={15}/> {m.participant_count} invited</p></div><div className="meeting-actions"><button className="copy-btn" onClick={copy}><Copy size={16}/> Copy invite</button><button className="join-btn" onClick={onJoin}><Video size={17}/> Start</button></div></article>;
}
