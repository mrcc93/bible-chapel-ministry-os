import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BarChart3, BookOpen, CalendarDays, CheckCircle2, ChevronDown, Church,
  ClipboardList, Copy, Download, Edit3, HeartHandshake, Home, Mail, Map,
  Megaphone, Plus, Search, Settings, Target, Trash2, UserMinus, Users, X
} from 'lucide-react';
import PptxGenJS from 'pptxgenjs';
import { jsPDF } from 'jspdf';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import './styles.css';
import { COLLECTIONS, assertCollectionName } from './data/collections.js';
import { ROLE_LABELS, ROLE_OPTIONS, ROLES, SENSITIVE_ACCESS_AREAS } from './auth/authConfig.js';
import bcLogo from './assets/bc-logo.webp';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso, opts = { month: 'short', day: 'numeric', year: 'numeric' }) => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.valueOf()) ? iso : d.toLocaleDateString(undefined, opts);
};
const nextSundayISO = () => {
  const d = new Date();
  const add = (7 - d.getDay()) % 7;
  d.setDate(d.getDate() + add);
  return d.toISOString().slice(0, 10);
};
const money = n => `$${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const clamp = n => Math.max(0, Math.min(100, n));
const sortDateAsc = (rows, key = 'date') => [...rows].sort((a, b) => String(a[key] || '').localeCompare(String(b[key] || '')));
const sortDateDesc = (rows, key = 'date') => sortDateAsc(rows, key).reverse();
const move = (arr, index, dir) => {
  const next = [...arr];
  const to = index + dir;
  if (to < 0 || to >= arr.length) return arr;
  [next[index], next[to]] = [next[to], next[index]];
  return next;
};

function useLocalStorage(key, initialValue) {
  const collectionName = assertCollectionName(key);
  const storageKey = COLLECTIONS[collectionName].storageKey;
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });
  const setStored = updater => {
    setValue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };
  return [value, setStored];
}

const starterRhythm = [
  { id: uid(), day: 'Sunday', title: 'Ministry day', focus: 'Serve at Bible Chapel, guest experience, worship/service flow, photos/video, conversations, follow-up notes, and anything connected to the Sunday gathering.', protectedRest: false },
  { id: uid(), day: 'Monday', title: 'Sabbath', focus: 'No church work, podcast work, planning, editing, or quick posts. Rest, family, worship, recovery, and being present.', protectedRest: true },
  { id: uid(), day: 'Tuesday', title: 'Sunday review and follow-up', focus: 'Talk with Josh, review Sunday, follow up with guests, update follow-up list, plan next steps.', protectedRest: false },
  { id: uid(), day: 'Wednesday', title: 'Bible study / content / ministry night', focus: 'Help with Wednesday Bible study, prepare podcast topics, create midweek posts, capture content if appropriate.', protectedRest: false },
  { id: uid(), day: 'Thursday', title: 'Creative and systems day', focus: 'Graphics, event planning, Schoolhouse planning, volunteer systems, signage, guest experience improvements, sermon series support.', protectedRest: false },
  { id: uid(), day: 'Friday', title: 'Podcast, communication, and slides', focus: 'Record/edit podcast, create clips, finish communication, finalize service slides, bulletin, and Sunday materials.', protectedRest: false },
  { id: uid(), day: 'Saturday', title: 'Final prep and family margin', focus: 'Only essential checks: Sunday readiness, volunteer confirmations, personal preparation, and protecting home life.', protectedRest: false }
];

const roadmap = [
  ['Month 1', 'Vision and Prayer', 'Hold a vision meeting, start weekly renewal prayer, name A New Chapter at Bible Chapel, create revitalization team.', '12–15'],
  ['Month 2', 'Worship Bridge and Projector', 'Tasteful projector/screen, project Scripture and lyrics, introduce fresh hymn arrangements.', '15–20'],
  ['Month 3', 'Sunday Experience System', 'Greeters, coffee, connection cards, tighter service flow and start time.', '18–25'],
  ['Month 4', 'Public Identity', 'Update Facebook and Google Business Profile, Plan Your Visit post, weekly Josh video.', '20–30'],
  ['Month 5', 'Chapel Night Launch', 'Monthly Chapel Night with acoustic worship, Scripture, prayer, coffee/dessert.', '25–35'],
  ['Month 6', 'Open the Schoolhouse', 'Clean, stage, name The Schoolhouse at Bible Chapel, host first Dinner at the Schoolhouse.', '30–40'],
  ['Month 7', 'Back to Church Sunday', 'First major invite Sunday with cards, event, local ad, and follow-up.', '50–75 event'],
  ['Month 8', 'Retention Month', 'Contact guests, New to Bible Chapel group, invite newcomers into rhythms.', '35–50'],
  ['Month 9', 'Worship Team Growth', 'Add vocalist/keys if ready, test new songs at Chapel Night.', '45–60'],
  ['Month 10', 'Families and Kids', 'Activity bags, clean kids area, safety process, family Schoolhouse event.', '50–65'],
  ['Month 11', 'Major Seasonal Sunday', 'Easter/Christmas push with 4–6 weeks promotion and strong follow-up.', '100 event'],
  ['Month 12', 'Lock In the Next Stage', 'Next-steps lunch, review metrics, set Year 2 priorities.', '60–75'],
  ['Month 18', 'Community Partnerships', 'Serve teachers, first responders, foster families, single parents, and local needs.', '80–95'],
  ['Month 23', '100-Average Push', 'Invite series, re-engage previous guests, add serving pathways.', '100 average'],
  ['Month 24', 'Commission the Future', 'Celebration Sunday, testimonies, thank legacy members, publish Year 3 vision.', '100+']
].map(([month, title, action, goal]) => ({ id: uid(), month, title, action, goal, status: 'Not started' }));

const blankServiceOrder = [
  'Welcome & announcements', 'Opening hymn', 'Scripture reading', 'Prayer', 'Worship set', 'Sermon', 'Response / altar prayer', 'Benediction'
].map(label => ({ id: uid(), label, note: '' }));

function App() {
  const [view, setView] = useState('dashboard');
  const [demoUser, setDemoUser] = useState(null);
  const [settings, setSettings] = useLocalStorage('settings', { churchName: 'Bible Chapel', pastor: 'Josh Bailey', theme: 'A New Chapter at Bible Chapel' });
  const [rhythm, setRhythm] = useLocalStorage('rhythm', starterRhythm);
  const [tasks, setTasks] = useLocalStorage('tasks', []);
  const [stats, setStats] = useLocalStorage('stats', []);
  const [events, setEvents] = useLocalStorage('events', []);
  const [annualPlan, setAnnualPlan] = useLocalStorage('annualPlan', []);
  const [services, setServices] = useLocalStorage('services', []);
  const [people, setPeople] = useLocalStorage('people', []);
  const [absences, setAbsences] = useLocalStorage('absences', []);
  const [visitors, setVisitors] = useLocalStorage('visitors', []);
  const [prayers, setPrayers] = useLocalStorage('prayers', []);
  const [contacts, setContacts] = useLocalStorage('contacts', []);
  const [series, setSeries] = useLocalStorage('series', []);
  const [bulletin, setBulletin] = useLocalStorage('bulletin', { announcements: [] });
  const [goals, setGoals] = useLocalStorage('goals', [
    { id: uid(), label: 'Average weekly attendance', target: 100, current: 12, horizon: '24 months' },
    { id: uid(), label: 'Monthly Chapel Night rhythm', target: 12, current: 0, horizon: 'Year 1' }
  ]);
  const [plan, setPlan] = useLocalStorage('roadmap', roadmap);
  const [toast, setToast] = useState('');

  const flash = msg => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2400);
  };

  const ctx = { settings, setSettings, rhythm, setRhythm, tasks, setTasks, stats, setStats, events, setEvents, annualPlan, setAnnualPlan, services, setServices, people, setPeople, absences, setAbsences, visitors, setVisitors, prayers, setPrayers, contacts, setContacts, series, setSeries, bulletin, setBulletin, goals, setGoals, plan, setPlan, flash, setView, demoUser };

  const nav = [
    ['dashboard', Home, 'Dashboard'], ['rhythm', ClipboardList, 'Weekly Rhythm'], ['planning', CalendarDays, 'Planning'], ['sunday', BookOpen, 'Sunday'], ['care', HeartHandshake, 'Care'], ['stats', BarChart3, 'Statistics'], ['bulletin', Mail, 'Bulletin'], ['settings', Settings, 'Settings']
  ];

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-logo-card"><img className="brand-logo" src={bcLogo} alt="Bible Chapel Church logo"/></div><div className="brand-title"><span>Ministry OS</span><strong>{settings.churchName}</strong></div></div>
      <nav>{nav.map(([id, Icon, label]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon size={18}/>{label}</button>)}</nav>
      <AuthPanel user={demoUser} setUser={setDemoUser}/>
      <p className="sidebar-note">Saved in this browser. Move to D1 + auth before real pastoral use.</p>
    </aside>
    <main className="main">
      {view === 'dashboard' && <Dashboard {...ctx}/>} {view === 'rhythm' && <Rhythm {...ctx}/>} {view === 'planning' && <Planning {...ctx}/>} {view === 'sunday' && <Sunday {...ctx}/>} {view === 'care' && <Care {...ctx}/>} {view === 'stats' && <Stats {...ctx}/>} {view === 'bulletin' && <Bulletin {...ctx}/>} {view === 'settings' && <SettingsPage {...ctx}/>} 
    </main>
    <nav className="mobile-nav">{nav.slice(0, 5).map(([id, Icon, label]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon size={19}/><span>{label}</span></button>)}</nav>
    {toast && <div className="toast">{toast}</div>}
  </div>;
}


function AuthPanel({ user, setUser }) {
  const [draftRole, setDraftRole] = useState(ROLES.PASTOR_LEADER);
  const login = () => setUser({ name: 'Bible Chapel Demo User', email: 'demo@biblechapel.local', role: draftRole });
  const logout = () => setUser(null);

  return <section className="auth-panel" aria-label="Authentication status">
    <div className="auth-panel-head"><UserMinus size={15}/><strong>Auth foundation</strong></div>
    {user ? <>
      <p className="auth-user">{user.name}<span>{user.email}</span></p>
      <StatusPill tone={user.role === ROLES.ADMIN ? 'gold' : 'green'}>{ROLE_LABELS[user.role]}</StatusPill>
      <button className="auth-link" onClick={logout}>Log out demo session</button>
    </> : <>
      <p>This placeholder stores no secrets. Cloudflare Access will provide the real session.</p>
      <select value={draftRole} onChange={e => setDraftRole(e.target.value)}>{ROLE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      <button className="auth-link primary" onClick={login}>Start demo session</button>
    </>}
  </section>;
}

function Page({ eyebrow, title, description, children, actions }) {
  return <section className="page">
    <header className="page-head"><div><p>{eyebrow}</p><h1>{title}</h1>{description && <span>{description}</span>}</div>{actions && <div className="page-actions">{actions}</div>}</header>
    {children}
  </section>;
}
function Card({ title, subtitle, children, actions, className = '' }) {
  return <section className={`card ${className}`}><header className="card-head"><div>{title && <h2>{title}</h2>}{subtitle && <p>{subtitle}</p>}</div>{actions}</header>{children}</section>;
}
function Button({ children, icon: Icon, variant = 'secondary', ...props }) { return <button className={`btn ${variant}`} {...props}>{Icon && <Icon size={16}/>} {children}</button>; }
function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label>; }
function Input(props) { return <input className="input" {...props}/>; }
function Textarea(props) { return <textarea className="input textarea" {...props}/>; }
function Select(props) { return <select className="input" {...props}/>; }
function Empty({ title, text }) { return <div className="empty"><h3>{title}</h3><p>{text}</p></div>; }
function StatusPill({ children, tone = 'neutral' }) { return <span className={`pill ${tone}`}>{children}</span>; }

function Dashboard({ settings, stats, events, services, visitors, prayers, contacts, tasks, goals, plan, setView }) {
  const latest = sortDateDesc(stats)[0];
  const attendance = latest ? Number(latest.adults || 0) + Number(latest.kids || 0) + Number(latest.online || 0) : 0;
  const upcomingEvents = sortDateAsc(events.filter(e => e.date >= todayISO())).slice(0, 4);
  const openTasks = tasks.filter(t => !t.done).slice(0, 6);
  const activePrayers = prayers.filter(p => p.status !== 'Answered').length;
  const newVisitors = visitors.filter(v => v.status !== 'Joined').length;
  const nextService = sortDateAsc(services.filter(s => s.date >= todayISO()))[0] || sortDateDesc(services)[0];
  const currentRoadmap = plan.find(p => p.status !== 'Done') || plan[0];
  return <Page eyebrow="Command Center" title="Good to see you" description={`${settings.theme} — a simple place to run the week, plan the month, and keep the mission in front of you.`}>
    <div className="stat-grid">
      <Metric label="Last attendance" value={latest ? attendance : '—'} meta={latest ? fmtDate(latest.date) : 'No Sundays logged'}/>
      <Metric label="Last offering" value={latest ? money(latest.offering) : '—'} meta="Most recent Sunday"/>
      <Metric label="Open visitor follow-up" value={newVisitors || '—'} meta="Needs attention"/>
      <Metric label="Active prayer requests" value={activePrayers || '—'} meta="Currently ongoing"/>
    </div>
    <div className="grid two">
      <Card title="This week" subtitle="Sunday readiness and current work" actions={<Button icon={ClipboardList} onClick={() => setView('rhythm')}>Open rhythm</Button>}>
        {openTasks.length ? <div className="list">{openTasks.map(t => <TaskRow key={t.id} task={t} readonly/>)}</div> : <Empty title="No open tasks" text="Add work from the Weekly Rhythm page so nothing lives only in your head."/>}
      </Card>
      <Card title="This Sunday" subtitle={nextService ? fmtDate(nextService.date, { weekday: 'long', month: 'long', day: 'numeric' }) : 'No service planned'} actions={<Button icon={BookOpen} onClick={() => setView('sunday')}>Plan service</Button>}>
        {nextService ? <OrderPreview service={nextService}/> : <Empty title="No service yet" text="Create this Sunday's order, songs, slides, and notes."/>}
      </Card>
      <Card title="Next 30 days" subtitle="Events and ministry pushes" actions={<Button icon={CalendarDays} onClick={() => setView('planning')}>Open planning</Button>}>
        {upcomingEvents.length ? <div className="list compact">{upcomingEvents.map(e => <InfoRow key={e.id} title={e.title} meta={`${fmtDate(e.date)}${e.time ? ` · ${e.time}` : ''}${e.owner ? ` · ${e.owner}` : ''}`}/>)}</div> : <Empty title="Nothing scheduled" text="Add Chapel Night, Schoolhouse dinners, invite Sundays, meetings, and outreach moments."/>}
      </Card>
      <Card title="Roadmap focus" subtitle="What stage are we building right now?">
        {currentRoadmap ? <div className="roadmap-focus"><StatusPill tone="gold">{currentRoadmap.month}</StatusPill><h3>{currentRoadmap.title}</h3><p>{currentRoadmap.action}</p><small>Goal: {currentRoadmap.goal}</small></div> : <Empty title="Roadmap complete" text="Celebrate and write the next chapter."/>}
      </Card>
    </div>
    <Card title="Goals" subtitle="Keep the scoreboard visible.">
      <div className="goal-grid">{goals.map(g => <GoalBar key={g.id} goal={g}/>)}</div>
    </Card>
  </Page>;
}
function Metric({ label, value, meta }) { return <div className="metric"><span>{label}</span><strong>{value}</strong><p>{meta}</p></div>; }
function GoalBar({ goal }) { const pct = clamp(Math.round((Number(goal.current) || 0) / (Number(goal.target) || 1) * 100)); return <div className="goal"><div><strong>{goal.label}</strong><span>{goal.current} / {goal.target} · {goal.horizon}</span></div><div className="bar"><i style={{ width: `${pct}%` }}/></div></div>; }
function InfoRow({ title, meta, children }) { return <div className="info-row"><div><strong>{title}</strong><p>{meta}</p>{children}</div></div>; }

function Rhythm({ rhythm, setRhythm, tasks, setTasks }) {
  const [task, setTask] = useState({ title: '', day: 'Tuesday', lane: 'Follow-up', due: todayISO() });
  const addTask = () => { if (!task.title.trim()) return; setTasks(rows => [{ ...task, id: uid(), done: false }, ...rows]); setTask({ title: '', day: task.day, lane: task.lane, due: task.due }); };
  const updateDay = (id, patch) => setRhythm(rows => rows.map(r => r.id === id ? { ...r, ...patch } : r));
  const grouped = rhythm.map(day => ({ ...day, tasks: tasks.filter(t => t.day === day.day && !t.done) }));
  return <Page eyebrow="Weekly Rhythm" title="Run the ministry on purpose" description="The weekly cadence turns Bible Chapel from reactive to prepared: Sunday ministry, Monday Sabbath, Tuesday follow-up, Wednesday ministry night, Thursday systems, Friday communications.">
    <Card title="Add a ministry task" subtitle="Assign it to a day so the work has a home.">
      <div className="form-grid four"><Field label="Task"><Input value={task.title} onChange={e => setTask({ ...task, title: e.target.value })} placeholder="Call first-time guest"/></Field><Field label="Day"><Select value={task.day} onChange={e => setTask({ ...task, day: e.target.value })}>{rhythm.map(r => <option key={r.id}>{r.day}</option>)}</Select></Field><Field label="Lane"><Select value={task.lane} onChange={e => setTask({ ...task, lane: e.target.value })}>{['Follow-up','Sunday','Creative','Podcast','Schoolhouse','Care','Admin','Prayer'].map(x => <option key={x}>{x}</option>)}</Select></Field><Field label="Due"><Input type="date" value={task.due} onChange={e => setTask({ ...task, due: e.target.value })}/></Field></div>
      <Button variant="primary" icon={Plus} onClick={addTask}>Add task</Button>
    </Card>
    <div className="week-grid">{grouped.map(day => <Card key={day.id} className={day.protectedRest ? 'rest-card' : ''} title={day.day} subtitle={day.title} actions={day.protectedRest && <StatusPill tone="green">Protected rest</StatusPill>}>
      <Textarea value={day.focus} onChange={e => updateDay(day.id, { focus: e.target.value })}/>
      <div className="list compact">{day.tasks.length ? day.tasks.map(t => <TaskRow key={t.id} task={t} setTasks={setTasks}/>) : <p className="muted">No open tasks for {day.day}.</p>}</div>
    </Card>)}</div>
  </Page>;
}
function TaskRow({ task, setTasks, readonly = false }) { return <div className={`task ${task.done ? 'done' : ''}`}><div><strong>{task.title}</strong><p>{task.day} · {task.lane} · due {fmtDate(task.due)}</p></div>{!readonly && <button className="icon-button" onClick={() => setTasks(rows => rows.map(t => t.id === task.id ? { ...t, done: !t.done } : t))}><CheckCircle2 size={18}/></button>}</div>; }

function Planning({ events, setEvents, annualPlan, setAnnualPlan, series, setSeries, goals, setGoals, plan, setPlan }) {
  const [tab, setTab] = useState('month');
  return <Page eyebrow="Planning" title="Weekly, monthly, yearly" description="Use this view for the bigger ministry picture: monthly ministry pushes, annual planning, sermon series, goals, and the revitalization roadmap.">
    <Tabs active={tab} setActive={setTab} items={[["month","Monthly Plan"],["annual","Annual Plan"],["roadmap","Roadmap"],["series","Sermon Series"],["goals","Goals"]]}/>
    {tab === 'month' && <MonthlyPlan events={events} setEvents={setEvents}/>}
    {tab === 'annual' && <AnnualPlan annualPlan={annualPlan} setAnnualPlan={setAnnualPlan}/>}
    {tab === 'roadmap' && <YearRoadmap plan={plan} setPlan={setPlan}/>}
    {tab === 'series' && <SeriesPlan series={series} setSeries={setSeries}/>}
    {tab === 'goals' && <Goals goals={goals} setGoals={setGoals}/>}
  </Page>;
}
function Tabs({ items, active, setActive }) { return <div className="tabs">{items.map(([id, label]) => <button key={id} className={active === id ? 'active' : ''} onClick={() => setActive(id)}>{label}</button>)}</div>; }
function MonthlyPlan({ events, setEvents }) {
  const [form, setForm] = useState({ title: '', date: todayISO(), time: '', type: 'Service', owner: '', notes: '' });
  const add = () => {
    if (!form.title.trim()) return;
    setEvents(rows => sortDateAsc([...rows, { ...form, title: form.title.trim(), id: uid() }]));
    setForm({ title: '', date: form.date, time: '', type: form.type, owner: '', notes: '' });
  };
  const upcoming = sortDateAsc(events.filter(e => e.date >= todayISO()));
  return <div className="grid two"><Card title="Add event / ministry push" subtitle="Chapel Night, Schoolhouse dinner, invite Sunday, volunteer meeting, outreach.">
    <div className="form-grid two"><Field label="Title"><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}/></Field><Field label="Type"><Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{['Service','Chapel Night','Schoolhouse','Outreach','Meeting','Family','Seasonal'].map(x => <option key={x}>{x}</option>)}</Select></Field><Field label="Date"><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}/></Field><Field label="Time"><Input value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} placeholder="6:00 PM"/></Field><Field label="Owner"><Input value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })}/></Field></div><Field label="Notes"><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}/></Field><Button variant="primary" icon={Plus} onClick={add}>Add event</Button>
  </Card><Card title="Upcoming" subtitle="Next ministry calendar items">{upcoming.length ? <div className="list">{upcoming.map(e => <div className="info-row" key={e.id}><div><strong>{e.title}</strong><p>{fmtDate(e.date)}{e.time ? ` · ${e.time}` : ''} · {e.type}{e.owner ? ` · ${e.owner}` : ''}</p>{e.notes && <small>{e.notes}</small>}</div><button className="icon-button danger" onClick={() => setEvents(rows => rows.filter(x => x.id !== e.id))}><Trash2 size={16}/></button></div>)}</div> : <Empty title="No events yet" text="Start by adding the next Chapel Night or Schoolhouse dinner."/>}</Card></div>;
}
function AnnualPlan({ annualPlan, setAnnualPlan }) {
  const currentYear = String(new Date().getFullYear());
  const [form, setForm] = useState({ year: currentYear, season: 'Q1', title: '', lane: 'Worship', targetDate: '', owner: '', status: 'Idea', notes: '' });
  const add = () => {
    if (!form.title.trim()) return;
    setAnnualPlan(rows => sortDateAsc([...rows, { ...form, title: form.title.trim(), id: uid() }], 'targetDate'));
    setForm({ ...form, title: '', targetDate: '', owner: '', notes: '' });
  };
  const rows = [...annualPlan].sort((a, b) => String(a.year || '').localeCompare(String(b.year || '')) || String(a.targetDate || '').localeCompare(String(b.targetDate || '')) || String(a.season || '').localeCompare(String(b.season || '')));
  return <div className="grid two">
    <Card title="Add annual priority" subtitle="This is for the year plan: major Sundays, campaigns, systems, facility work, and leadership development.">
      <div className="form-grid two"><Field label="Year"><Input value={form.year} onChange={e => setForm({ ...form, year: e.target.value })}/></Field><Field label="Quarter / season"><Select value={form.season} onChange={e => setForm({ ...form, season: e.target.value })}>{['Q1','Q2','Q3','Q4','Easter season','Summer','Fall launch','Christmas season'].map(x => <option key={x}>{x}</option>)}</Select></Field><Field label="Priority"><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Back to Church Sunday campaign"/></Field><Field label="Lane"><Select value={form.lane} onChange={e => setForm({ ...form, lane: e.target.value })}>{['Worship','Guest Experience','Personal Invitation','Community Doorway','Follow-Up','Schoolhouse','Kids/Families','Leadership','Facilities','Communications'].map(x => <option key={x}>{x}</option>)}</Select></Field><Field label="Target date"><Input type="date" value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })}/></Field><Field label="Owner"><Input value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })}/></Field><Field label="Status"><Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{['Idea','Planned','In progress','Done','Paused'].map(x => <option key={x}>{x}</option>)}</Select></Field></div>
      <Field label="Notes"><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="What has to be true by then? Who needs to be involved?"/></Field>
      <Button variant="primary" icon={Plus} onClick={add}>Add annual priority</Button>
    </Card>
    <Card title="Annual priorities" subtitle="A yearly plan that sits above the monthly calendar, without replacing the 24-month roadmap.">
      {rows.length ? <div className="list">{rows.map(item => <div className="info-row" key={item.id}><div><strong>{item.title}</strong><p>{item.year} · {item.season} · {item.lane} · {item.status}{item.targetDate ? ` · target ${fmtDate(item.targetDate)}` : ''}{item.owner ? ` · ${item.owner}` : ''}</p>{item.notes && <small>{item.notes}</small>}</div><button className="icon-button danger" onClick={() => setAnnualPlan(all => all.filter(x => x.id !== item.id))}><Trash2 size={16}/></button></div>)}</div> : <Empty title="No annual priorities yet" text="Add the big rocks for the year: invite Sundays, Schoolhouse rhythms, systems, seasonal pushes, and leader development."/>}
    </Card>
  </div>;
}
function YearRoadmap({ plan, setPlan }) {
  return <Card title="24-month revitalization roadmap" subtitle="The long-range roadmap stays separate from annual planning so the yearly plan can change without losing the bigger arc.">
    <div className="roadmap-list">{plan.map(item => <div key={item.id} className="roadmap-item"><div><StatusPill tone="gold">{item.month}</StatusPill><h3>{item.title}</h3><p>{item.action}</p><small>Goal: {item.goal}</small></div><Select value={item.status} onChange={e => setPlan(rows => rows.map(r => r.id === item.id ? { ...r, status: e.target.value } : r))}>{['Not started','In progress','Done','Paused'].map(s => <option key={s}>{s}</option>)}</Select></div>)}</div>
  </Card>;
}
function SeriesPlan({ series, setSeries }) {
  const [form, setForm] = useState({ title: '', startDate: nextSundayISO(), scripture: '', theme: '' });
  const add = () => { if (!form.title) return; setSeries(rows => [...rows, { ...form, id: uid(), sermons: [] }]); setForm({ title: '', startDate: nextSundayISO(), scripture: '', theme: '' }); };
  return <div className="grid two"><Card title="New sermon series"><div className="form-grid two"><Field label="Title"><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}/></Field><Field label="Start"><Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}/></Field><Field label="Scripture"><Input value={form.scripture} onChange={e => setForm({ ...form, scripture: e.target.value })}/></Field></div><Field label="Theme"><Textarea value={form.theme} onChange={e => setForm({ ...form, theme: e.target.value })}/></Field><Button variant="primary" icon={Plus} onClick={add}>Create series</Button></Card><div className="stack">{series.length ? series.map(s => <SeriesCard key={s.id} series={s} setSeries={setSeries}/>) : <Card><Empty title="No series yet" text="Map sermons ahead so Sundays stop sneaking up on you."/></Card>}</div></div>;
}
function SeriesCard({ series, setSeries }) {
  const [sermon, setSermon] = useState({ date: series.startDate || nextSundayISO(), title: '', passage: '', bigIdea: '' });
  const add = () => { if (!sermon.title) return; setSeries(rows => rows.map(s => s.id === series.id ? { ...s, sermons: sortDateAsc([...s.sermons, { ...sermon, id: uid() }]) } : s)); setSermon({ date: sermon.date, title: '', passage: '', bigIdea: '' }); };
  return <Card title={series.title} subtitle={`${series.scripture || 'No passage'} · starts ${fmtDate(series.startDate)}`}><p className="muted">{series.theme}</p><div className="form-grid two"><Field label="Sermon title"><Input value={sermon.title} onChange={e => setSermon({ ...sermon, title: e.target.value })}/></Field><Field label="Date"><Input type="date" value={sermon.date} onChange={e => setSermon({ ...sermon, date: e.target.value })}/></Field><Field label="Passage"><Input value={sermon.passage} onChange={e => setSermon({ ...sermon, passage: e.target.value })}/></Field></div><Field label="Big idea"><Input value={sermon.bigIdea} onChange={e => setSermon({ ...sermon, bigIdea: e.target.value })}/></Field><Button icon={Plus} onClick={add}>Add sermon</Button><div className="list compact">{series.sermons.map(sm => <InfoRow key={sm.id} title={sm.title} meta={`${fmtDate(sm.date)} · ${sm.passage || 'No passage'} · ${sm.bigIdea || ''}`}/>)}</div></Card>;
}
function Goals({ goals, setGoals }) {
  const [form, setForm] = useState({ label: '', target: '', current: '', horizon: 'Year 1' });
  const add = () => { if (!form.label || !form.target) return; setGoals(rows => [...rows, { ...form, id: uid() }]); setForm({ label: '', target: '', current: '', horizon: 'Year 1' }); };
  return <Card title="Ministry goals" subtitle="Make growth visible without making numbers the mission."><div className="form-grid four"><Field label="Goal"><Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })}/></Field><Field label="Target"><Input type="number" value={form.target} onChange={e => setForm({ ...form, target: e.target.value })}/></Field><Field label="Current"><Input type="number" value={form.current} onChange={e => setForm({ ...form, current: e.target.value })}/></Field><Field label="Horizon"><Input value={form.horizon} onChange={e => setForm({ ...form, horizon: e.target.value })}/></Field></div><Button variant="primary" icon={Plus} onClick={add}>Add goal</Button><div className="goal-grid">{goals.map(g => <div className="editable-goal" key={g.id}><GoalBar goal={g}/><Input type="number" placeholder="Update current" onBlur={e => { if (e.target.value) { setGoals(rows => rows.map(x => x.id === g.id ? { ...x, current: e.target.value } : x)); e.target.value = ''; } }}/><button className="icon-button danger" onClick={() => setGoals(rows => rows.filter(x => x.id !== g.id))}><Trash2 size={16}/></button></div>)}</div></Card>;
}

function Sunday({ services, setServices, series, settings, flash }) {
  const [activeId, setActiveId] = useState(services[0]?.id || '');
  const active = services.find(s => s.id === activeId) || services[0];
  const sermonsByDate = useMemo(() => Object.fromEntries(series.flatMap(se => se.sermons.map(sm => [sm.date, { ...sm, seriesTitle: se.title }]))), [series]);
  const createService = () => { const date = nextSundayISO(); const sermon = sermonsByDate[date]; const svc = { id: uid(), date, title: sermon?.title || 'Sunday Service', order: blankServiceOrder, songs: [], slides: [] }; setServices(rows => [svc, ...rows]); setActiveId(svc.id); };
  const update = patch => setServices(rows => rows.map(s => s.id === active.id ? { ...s, ...patch } : s));
  return <Page eyebrow="Sunday" title="Service planner" description="Plan the order, songs, sermon notes, slides, and export a simple PowerPoint.">
    <div className="toolbar"><Button variant="primary" icon={Plus} onClick={createService}>New service</Button>{services.length > 0 && <Select value={active?.id || ''} onChange={e => setActiveId(e.target.value)}>{services.map(s => <option key={s.id} value={s.id}>{fmtDate(s.date)} — {s.title}</option>)}</Select>}</div>
    {!active ? <Card><Empty title="No service yet" text="Create a service for this Sunday."/></Card> : <div className="grid two"><Card title="Service details"><div className="form-grid two"><Field label="Title"><Input value={active.title} onChange={e => update({ title: e.target.value })}/></Field><Field label="Date"><Input type="date" value={active.date} onChange={e => update({ date: e.target.value })}/></Field></div></Card><OrderEditor service={active} update={update}/><SongsEditor service={active} update={update}/><SlidesEditor service={active} update={update} settings={settings} flash={flash}/></div>}
  </Page>;
}
function OrderPreview({ service }) { return <div className="order-preview">{service.order?.slice(0, 7).map((o, i) => <p key={o.id}><span>{i + 1}</span>{o.label}{o.note ? <small> — {o.note}</small> : null}</p>)}</div>; }
function OrderEditor({ service, update }) { const [label, setLabel] = useState(''); const add = () => { if (!label) return; update({ order: [...service.order, { id: uid(), label, note: '' }] }); setLabel(''); }; return <Card title="Order of service"><div className="list">{service.order.map((o, i) => <div key={o.id} className="edit-row"><div className="reorder"><button onClick={() => update({ order: move(service.order, i, -1) })}>↑</button><button onClick={() => update({ order: move(service.order, i, 1) })}>↓</button></div><Input value={o.label} onChange={e => update({ order: service.order.map(x => x.id === o.id ? { ...x, label: e.target.value } : x) })}/><Input value={o.note} placeholder="note" onChange={e => update({ order: service.order.map(x => x.id === o.id ? { ...x, note: e.target.value } : x) })}/><button className="icon-button danger" onClick={() => update({ order: service.order.filter(x => x.id !== o.id) })}><Trash2 size={16}/></button></div>)}</div><div className="inline-add"><Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Add element"/><Button icon={Plus} onClick={add}>Add</Button></div></Card>; }
function SongsEditor({ service, update }) { const [song, setSong] = useState({ title: '', key: '', ccli: '', author: '' }); const add = () => { if (!song.title) return; update({ songs: [...service.songs, { ...song, id: uid(), slide: true }] }); setSong({ title: '', key: '', ccli: '', author: '' }); }; return <Card title="Songs" subtitle="CCLI info is kept with the service."><div className="list compact">{service.songs.map(s => <InfoRow key={s.id} title={s.title} meta={`${s.key ? `Key ${s.key} · ` : ''}${s.ccli ? `CCLI #${s.ccli}` : 'No CCLI #'}${s.author ? ` · ${s.author}` : ''}`}/>)}</div><div className="form-grid two"><Field label="Song"><Input value={song.title} onChange={e => setSong({ ...song, title: e.target.value })}/></Field><Field label="Key"><Input value={song.key} onChange={e => setSong({ ...song, key: e.target.value })}/></Field><Field label="CCLI #"><Input value={song.ccli} onChange={e => setSong({ ...song, ccli: e.target.value })}/></Field><Field label="Author"><Input value={song.author} onChange={e => setSong({ ...song, author: e.target.value })}/></Field></div><Button icon={Plus} onClick={add}>Add song</Button></Card>; }
function SlidesEditor({ service, update, settings, flash }) { const [slide, setSlide] = useState({ type: 'Sermon point', title: '', body: '' }); const add = () => { if (!slide.title && !slide.body) return; update({ slides: [...service.slides, { ...slide, id: uid() }] }); setSlide({ type: 'Sermon point', title: '', body: '' }); }; const exportPptx = async () => { const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE'; const slides = [...service.slides, ...service.songs.filter(s => s.slide).map(s => ({ type: 'Song', title: s.title, body: [s.author, s.ccli ? `CCLI #${s.ccli}` : ''].filter(Boolean).join('\n') }))]; slides.forEach(s => { const sl = pptx.addSlide(); sl.background = { color: 'F7FBFF' }; sl.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: .13, fill: { color: 'FFDF2C' }, line: { color: 'FFDF2C' } }); sl.addText(s.title || '', { x: .65, y: .65, w: 12, h: .8, fontFace: 'Georgia', fontSize: 34, bold: true, color: '083967' }); sl.addText(s.body || '', { x: .8, y: 1.7, w: 11.7, h: 4.7, fontFace: 'Georgia', fontSize: 25, color: '5F7282', fit: 'shrink' }); sl.addText(`${settings.churchName} · ${fmtDate(service.date)}`, { x: .6, y: 6.95, w: 12, h: .3, fontSize: 10, color: '6D8EAE', align: 'center' }); }); await pptx.writeFile({ fileName: `${service.title.replace(/[^a-z0-9]+/gi, '-')}-${service.date}.pptx` }); flash('PowerPoint exported.'); }; return <Card title="Slides" actions={<Button variant="primary" icon={Download} onClick={exportPptx}>Export PPTX</Button>}><div className="list compact">{service.slides.map(s => <InfoRow key={s.id} title={s.title || s.type} meta={s.body}/>)}</div><div className="form-grid two"><Field label="Type"><Select value={slide.type} onChange={e => setSlide({ ...slide, type: e.target.value })}>{['Title','Scripture','Sermon point','Announcement','Song','Blank'].map(x => <option key={x}>{x}</option>)}</Select></Field><Field label="Title"><Input value={slide.title} onChange={e => setSlide({ ...slide, title: e.target.value })}/></Field></div><Field label="Body"><Textarea value={slide.body} onChange={e => setSlide({ ...slide, body: e.target.value })}/></Field><Button icon={Plus} onClick={add}>Add slide</Button></Card>; }

function personName(person) { return person?.name || ''; }
function normalizeName(name) { return String(name || '').trim().toLowerCase(); }
function contactSummary(row) {
  return [row.phone, row.email].filter(Boolean).join(' · ');
}
function PersonPicker({ people, value, onChange, listId, placeholder = 'Start typing a name' }) {
  return <><Input list={listId} value={value} onChange={onChange} placeholder={placeholder}/><datalist id={listId}>{people.map(p => <option key={p.id} value={personName(p)}/>)}</datalist></>;
}
function missingStreaks(people, absences) {
  const records = sortDateDesc(absences || []);
  return people.map(person => {
    let streak = 0;
    for (const record of records) {
      if ((record.missingIds || []).includes(person.id)) streak += 1;
      else break;
    }
    return { ...person, streak };
  }).sort((a, b) => b.streak - a.streak || personName(a).localeCompare(personName(b)));
}
function Care({ people, setPeople, absences, setAbsences, visitors, setVisitors, prayers, setPrayers, contacts, setContacts }) {
  const [tab, setTab] = useState('visitors');
  return <Page eyebrow="Care" title="Watch over the flock" description="Guest follow-up, absence tracking, prayer, people, and pastoral contacts in one place."><Tabs active={tab} setActive={setTab} items={[["visitors","Visitors"],["people","People"],["absences","Absences"],["prayer","Prayer"],["contacts","Contacts"]]}/>{tab === 'visitors' && <Visitors visitors={visitors} setVisitors={setVisitors} setPeople={setPeople}/>} {tab === 'people' && <People people={people} setPeople={setPeople}/>} {tab === 'absences' && <AbsenceTracker people={people} absences={absences} setAbsences={setAbsences}/>} {tab === 'prayer' && <Prayers prayers={prayers} setPrayers={setPrayers} people={people}/>} {tab === 'contacts' && <ContactLog contacts={contacts} setContacts={setContacts} people={people}/>}</Page>;
}
function Visitors({ visitors, setVisitors, setPeople }) {
  const blank = { name: '', date: todayISO(), phone: '', email: '', notes: '', status: 'New' };
  const [form, setForm] = useState(blank);
  const add = () => {
    if (!form.name.trim()) return;
    const visitor = { ...form, name: form.name.trim(), id: uid() };
    setVisitors(rows => [visitor, ...rows]);
    setPeople(rows => {
      const key = normalizeName(visitor.name);
      const existing = rows.find(p => normalizeName(p.name) === key);
      if (existing) {
        return rows.map(p => normalizeName(p.name) === key ? { ...p, phone: p.phone || visitor.phone, email: p.email || visitor.email, source: p.source || 'Visitor', firstVisited: p.firstVisited || visitor.date } : p);
      }
      return [...rows, { id: uid(), name: visitor.name, phone: visitor.phone, email: visitor.email, source: 'Visitor', firstVisited: visitor.date }];
    });
    setForm(blank);
  };
  return <Card title="Visitor follow-up" subtitle="Adding a visitor also adds them to the People tab so prayer, contacts, and absence tracking can reference them."><div className="form-grid two"><Field label="Name"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></Field><Field label="First visited"><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}/></Field><Field label="Phone"><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(618) 555-1234"/></Field><Field label="Email"><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@email.com"/></Field><Field label="Status"><Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{['New','Contacted','Returned','Joined'].map(x => <option key={x}>{x}</option>)}</Select></Field></div><Field label="Notes"><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}/></Field><Button variant="primary" icon={Plus} onClick={add}>Add visitor</Button><div className="list">{visitors.map(v => <div key={v.id} className="info-row"><div><strong>{v.name}</strong><p>{fmtDate(v.date)} · {v.status}{v.phone ? ` · ${v.phone}` : ''}{v.email ? ` · ${v.email}` : ''}{!v.phone && !v.email && v.contact ? ` · ${v.contact}` : ''}</p><small>{v.notes}</small></div><Select value={v.status} onChange={e => setVisitors(rows => rows.map(x => x.id === v.id ? { ...x, status: e.target.value } : x))}>{['New','Contacted','Returned','Joined'].map(x => <option key={x}>{x}</option>)}</Select></div>)}</div></Card>;
}
function People({ people, setPeople }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const add = () => {
    if (!form.name.trim()) return;
    const key = normalizeName(form.name);
    setPeople(rows => rows.some(p => normalizeName(p.name) === key) ? rows.map(p => normalizeName(p.name) === key ? { ...p, phone: form.phone || p.phone, email: form.email || p.email } : p) : [...rows, { ...form, name: form.name.trim(), id: uid(), source: 'Manual' }]);
    setForm({ name: '', phone: '', email: '' });
  };
  return <Card title="People list" subtitle="People entered here become searchable in prayer requests, contact logs, and absence tracking."><div className="form-grid three"><Field label="Name"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name"/></Field><Field label="Phone"><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone"/></Field><Field label="Email"><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email"/></Field></div><Button icon={Plus} variant="primary" onClick={add}>Add person</Button><div className="list compact">{people.length ? people.map(p => <div className="info-row" key={p.id}><div><strong>{p.name}</strong><p>{contactSummary(p) || 'Part of the church family'}{p.source ? ` · ${p.source}` : ''}{p.firstVisited ? ` · first visited ${fmtDate(p.firstVisited)}` : ''}</p></div><button className="icon-button danger" onClick={() => setPeople(rows => rows.filter(x => x.id !== p.id))}><Trash2 size={16}/></button></div>) : <Empty title="No people yet" text="Add regular attenders or add a visitor; both will appear here."/>}</div></Card>;
}
function AbsenceTracker({ people, absences, setAbsences }) {
  const [date, setDate] = useState(nextSundayISO());
  const [picked, setPicked] = useState([]);
  const [notes, setNotes] = useState('');
  const toggle = id => setPicked(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  const save = () => {
    if (!date) return;
    setAbsences(rows => sortDateDesc([...rows.filter(r => r.date !== date), { id: uid(), date, missingIds: picked, notes }]));
    setPicked([]);
    setNotes('');
  };
  const nameOf = id => people.find(p => p.id === id)?.name || 'Unknown';
  const recent = sortDateDesc(absences || []).slice(0, 8);
  const streaks = missingStreaks(people, absences).filter(p => p.streak > 0);
  return <div className="grid two"><Card title="Record who was missing" subtitle="Use this after Sunday so follow-up is based on people, not just numbers."><Field label="Sunday date"><Input type="date" value={date} onChange={e => setDate(e.target.value)}/></Field>{people.length ? <div className="check-grid">{people.map(p => <label key={p.id} className={`check-card ${picked.includes(p.id) ? 'on' : ''}`}><input type="checkbox" checked={picked.includes(p.id)} onChange={() => toggle(p.id)}/><span>{p.name}</span></label>)}</div> : <Empty title="No people yet" text="Add people first, or add visitors and they will appear here automatically."/>}<Field label="Notes"><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Travel, sickness, known reason, follow-up needed"/></Field><Button variant="primary" icon={UserMinus} onClick={save} disabled={!people.length}>Save absence record</Button></Card><Card title="Care signals" subtitle="People missing multiple Sundays should trigger a gentle check-in.">{streaks.length ? <div className="list">{streaks.map(p => <InfoRow key={p.id} title={p.name} meta={`${p.streak} Sunday${p.streak === 1 ? '' : 's'} in a row marked missing`}/>)}</div> : <Empty title="No current absence streaks" text="Once you save records, people who miss Sundays in a row will show here."/>}</Card><Card title="Recent absence records" className="span-two">{recent.length ? <div className="list">{recent.map(r => <div key={r.id} className="info-row"><div><strong>{fmtDate(r.date)}</strong><p>{(r.missingIds || []).length ? `Missing: ${(r.missingIds || []).map(nameOf).join(', ')}` : 'Everyone present'}{r.notes ? ` · ${r.notes}` : ''}</p></div><button className="icon-button danger" onClick={() => setAbsences(rows => rows.filter(x => x.id !== r.id))}><Trash2 size={16}/></button></div>)}</div> : <Empty title="No records yet" text="Save your first absence record after Sunday."/>}</Card></div>;
}
function Prayers({ prayers, setPrayers, people }) {
  const [form, setForm] = useState({ request: '', who: '', date: todayISO(), status: 'Ongoing' });
  const add = () => { if (!form.request.trim()) return; setPrayers(rows => [{ ...form, request: form.request.trim(), id: uid() }, ...rows]); setForm({ request: '', who: '', date: todayISO(), status: 'Ongoing' }); };
  return <Card title="Prayer requests"><Field label="Request"><Textarea value={form.request} onChange={e => setForm({ ...form, request: e.target.value })}/></Field><div className="form-grid two"><Field label="For whom"><PersonPicker people={people} listId="prayer-people" value={form.who} onChange={e => setForm({ ...form, who: e.target.value })}/></Field><Field label="Date"><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}/></Field></div><Button variant="primary" icon={Plus} onClick={add}>Add request</Button><div className="list">{prayers.map(p => <div key={p.id} className="info-row"><div><strong>{p.request}</strong><p>{p.who ? `${p.who} · ` : ''}${fmtDate(p.date)} · {p.status}</p></div><Button onClick={() => setPrayers(rows => rows.map(x => x.id === p.id ? { ...x, status: x.status === 'Answered' ? 'Ongoing' : 'Answered' } : x))}>{p.status === 'Answered' ? 'Reopen' : 'Answered'}</Button></div>)}</div></Card>;
}
function ContactLog({ contacts, setContacts, people }) {
  const [form, setForm] = useState({ who: '', date: todayISO(), method: 'Text', notes: '' });
  const add = () => { if (!form.who.trim()) return; setContacts(rows => [{ ...form, who: form.who.trim(), id: uid() }, ...rows]); setForm({ who: '', date: todayISO(), method: 'Text', notes: '' }); };
  return <Card title="Pastoral contact log"><div className="form-grid two"><Field label="Who"><PersonPicker people={people} listId="contact-people" value={form.who} onChange={e => setForm({ ...form, who: e.target.value })}/></Field><Field label="Date"><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}/></Field><Field label="Method"><Select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>{['In person','Text','Phone','Email','Visit'].map(x => <option key={x}>{x}</option>)}</Select></Field></div><Field label="Notes"><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}/></Field><Button icon={Plus} variant="primary" onClick={add}>Log contact</Button><div className="list compact">{contacts.map(c => <InfoRow key={c.id} title={c.who} meta={`${fmtDate(c.date)} · ${c.method} · ${c.notes}`}/>)}</div></Card>;
}
function Stats({ stats, setStats }) {
  const [form, setForm] = useState({ date: nextSundayISO(), adults: '', kids: '', online: '', visitors: '', offering: '', notes: '' });
  const add = () => { if (!form.date) return; setStats(rows => sortDateDesc([...rows.filter(x => x.date !== form.date), { ...form, id: uid() }])); };
  const sorted = sortDateAsc(stats);
  const totalGiving = stats.reduce((a, s) => a + Number(s.offering || 0), 0);
  const avg = stats.length ? Math.round(stats.reduce((a, s) => a + Number(s.adults || 0) + Number(s.kids || 0) + Number(s.online || 0), 0) / stats.length) : 0;
  const visitorTotal = stats.reduce((a,s)=>a+Number(s.visitors||0),0);
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } } };
  const labels = sorted.map(s => fmtDate(s.date, { month: 'short', day: 'numeric' }));
  const attendanceData = { labels, datasets: [
    { label: 'In person', data: sorted.map(s => Number(s.adults || 0) + Number(s.kids || 0)), borderColor: '#083967', backgroundColor: 'rgba(8,57,103,.12)', tension: .25, fill: true },
    { label: 'Online', data: sorted.map(s => Number(s.online || 0)), borderColor: '#6d8eae', backgroundColor: 'rgba(109,142,174,.20)', tension: .25, fill: true }
  ] };
  const givingData = { labels, datasets: [{ label: 'Giving', data: sorted.map(s => Number(s.offering || 0)), backgroundColor: '#ffdf2c', borderRadius: 6 }] };
  const visitorData = { labels, datasets: [{ label: 'Visitors', data: sorted.map(s => Number(s.visitors || 0)), backgroundColor: '#6d8eae', borderRadius: 6 }] };
  return <Page eyebrow="Statistics" title="The numbers" description="Track attendance, giving, visitors, and notes without letting numbers become the mission."><div className="stat-grid"><Metric label="Giving logged" value={money(totalGiving)} meta={`${stats.length} Sundays`}/><Metric label="Average attendance" value={avg || '—'} meta="All logged weeks"/><Metric label="Visitor total" value={visitorTotal || '—'} meta="All logged weeks"/></div>{sorted.length ? <div className="grid two chart-grid"><Card title="Attendance trend" subtitle="In-person attendance and online reach"><div className="chart-box"><Line data={attendanceData} options={chartOptions}/></div></Card><Card title="Giving trend" subtitle="Offering by Sunday"><div className="chart-box"><Bar data={givingData} options={{ ...chartOptions, plugins: { legend: { display: false } } }}/></div></Card><Card title="Visitor trend" subtitle="First-time or counted visitors" className="span-two"><div className="chart-box short"><Bar data={visitorData} options={{ ...chartOptions, plugins: { legend: { display: false } } }}/></div></Card></div> : <Card><Empty title="No trends yet" text="Log a Sunday and the attendance, giving, and visitor charts will appear here."/></Card>}<Card title="Log a Sunday"><div className="form-grid four">{['date','adults','kids','online','visitors','offering'].map(k => <Field key={k} label={k[0].toUpperCase()+k.slice(1)}><Input type={k === 'date' ? 'date' : 'number'} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })}/></Field>)}</div><Field label="Notes"><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}/></Field><Button variant="primary" icon={Plus} onClick={add}>Save Sunday</Button></Card><Card title="Recent Sundays"><div className="list">{stats.map(s => <InfoRow key={s.id} title={fmtDate(s.date)} meta={`${Number(s.adults||0)+Number(s.kids||0)} in person · ${Number(s.online||0)} online · ${money(s.offering)} · ${s.visitors || 0} visitors · ${s.notes || ''}`}/>)}</div></Card></Page>;
}
function Bulletin({ settings, bulletin, setBulletin, flash }) {
  const [ann, setAnn] = useState('');
  const set = patch => setBulletin(b => ({ ...b, ...patch }));
  const add = () => { if (!ann.trim()) return; set({ announcements: [...(bulletin.announcements || []), { id: uid(), text: ann.trim() }] }); setAnn(''); };
  const bulletinText = () => [`Welcome: ${bulletin.welcome || ''}`, bulletin.scripture ? `Scripture: ${bulletin.scripture}` : '', 'Announcements:', ...(bulletin.announcements || []).map(a => `- ${a.text}`), bulletin.prayerFocus ? `Prayer focus: ${bulletin.prayerFocus}` : '', bulletin.message || ''].filter(Boolean).join('\n');
  const copy = () => { navigator.clipboard?.writeText(bulletinText()); flash('Bulletin copied.'); };
  const exportPdf = () => {
    const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 54;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let y = margin;
    const addWrapped = (text, size = 11, style = 'normal', gap = 14) => {
      if (!text) return;
      pdf.setFont('times', style);
      pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(String(text), pageWidth - margin * 2);
      const lineHeight = size * 1.35;
      lines.forEach(line => {
        if (y + lineHeight > pageHeight - margin) { pdf.addPage(); y = margin; }
        pdf.text(line, margin, y);
        y += lineHeight;
      });
      y += gap;
    };
    pdf.setFillColor(8, 57, 103); pdf.rect(0, 0, pageWidth, 96, 'F');
    pdf.setFillColor(255, 223, 44); pdf.rect(0, 94, pageWidth, 4, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFont('times', 'bold'); pdf.setFontSize(24); pdf.text('This Week at ' + (settings.churchName || 'Bible Chapel'), pageWidth / 2, y, { align: 'center' }); y += 28;
    pdf.setTextColor(215, 229, 240); pdf.setFont('times', 'normal'); pdf.setFontSize(10); pdf.text(new Date().toLocaleDateString(), pageWidth / 2, y, { align: 'center' }); y = 128;
    pdf.setTextColor(8, 57, 103);
    addWrapped(bulletin.welcome, 12, 'normal', 18);
    if (bulletin.scripture) addWrapped('Scripture: ' + bulletin.scripture, 12, 'bold', 16);
    if ((bulletin.announcements || []).length) { addWrapped('Announcements', 16, 'bold', 8); (bulletin.announcements || []).forEach(a => addWrapped('- ' + a.text, 11, 'normal', 6)); y += 8; }
    if (bulletin.prayerFocus) addWrapped('Prayer focus: ' + bulletin.prayerFocus, 12, 'bold', 18);
    if (bulletin.message) { addWrapped('Weekly message', 16, 'bold', 8); addWrapped(bulletin.message, 11, 'normal', 0); }
    pdf.save(`${(settings.churchName || 'Bible-Chapel').replace(/[^a-z0-9]+/gi, '-')}-bulletin.pdf`);
    flash('Bulletin PDF exported.');
  };
  return <Page eyebrow="Communication" title="Bulletin and weekly message" description="One place to prepare the weekly bulletin, announcements, and church communication." actions={<><Button icon={Copy} onClick={copy}>Copy all</Button><Button variant="primary" icon={Download} onClick={exportPdf}>Export PDF</Button></>}><div className="grid two"><Card title="Edit"><Field label="Welcome"><Textarea value={bulletin.welcome || ''} onChange={e => set({ welcome: e.target.value })}/></Field><Field label="Scripture"><Input value={bulletin.scripture || ''} onChange={e => set({ scripture: e.target.value })}/></Field><Field label="Prayer focus"><Input value={bulletin.prayerFocus || ''} onChange={e => set({ prayerFocus: e.target.value })}/></Field><div className="inline-add"><Input value={ann} onChange={e => setAnn(e.target.value)} placeholder="Add announcement"/><Button icon={Plus} onClick={add}>Add</Button></div><Field label="Weekly message"><Textarea value={bulletin.message || ''} onChange={e => set({ message: e.target.value })}/></Field></Card><Card title="Preview"><div className="bulletin-preview"><h2>This Week at {settings.churchName || 'Bible Chapel'}</h2><p>{bulletin.welcome}</p>{bulletin.scripture && <p><strong>Scripture:</strong> {bulletin.scripture}</p>}<ul>{(bulletin.announcements || []).map(a => <li key={a.id}>{a.text}</li>)}</ul>{bulletin.prayerFocus && <p><strong>Prayer focus:</strong> {bulletin.prayerFocus}</p>}<pre>{bulletin.message}</pre></div></Card></div></Page>;
}

function SettingsPage({ settings, setSettings, demoUser }) { return <Page eyebrow="Settings" title="Church app setup" description="Rename the app and set the main ministry theme."><Card title="Identity"><div className="form-grid two"><Field label="Church name"><Input value={settings.churchName} onChange={e => setSettings(s => ({ ...s, churchName: e.target.value }))}/></Field><Field label="Pastor / leader"><Input value={settings.pastor} onChange={e => setSettings(s => ({ ...s, pastor: e.target.value }))}/></Field></div><Field label="Current theme"><Input value={settings.theme} onChange={e => setSettings(s => ({ ...s, theme: e.target.value }))}/></Field></Card><Card title="Authentication foundation" subtitle="Phase 2A placeholder until Cloudflare Access is configured"><div className="auth-summary"><p><strong>Current demo session:</strong> {demoUser ? `${demoUser.email} · ${ROLE_LABELS[demoUser.role]}` : 'Not signed in'}</p><p className="muted">The sidebar login shell is only a non-secret UI placeholder. Future API routes use Cloudflare Access headers and role rules before touching D1.</p><div className="sensitive-grid">{SENSITIVE_ACCESS_AREAS.map(area => <div key={area.label}><strong>{area.label}</strong><span>{area.roles.map(role => ROLE_LABELS[role]).join(' or ')}</span></div>)}</div></div></Card><Card title="Production warning" subtitle="Important before using real pastoral data"><p className="muted">This version saves to the browser. Before using it for real prayer requests, visitor details, attendance records, giving records, or pastoral contacts, finish Cloudflare Access authentication, D1 storage, backups, role permissions, and audit logging.</p></Card></Page>; }

createRoot(document.getElementById('root')).render(<App/>);
