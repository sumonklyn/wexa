'use client';

import { useEffect, useState } from 'react';

async function getJSON(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const initials = (name) =>
  name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

function Meter({ level }) {
  return (
    <div className="meter" aria-label={`level ${level} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= level ? 'pip on' : 'pip'} />
      ))}
    </div>
  );
}

function PersonRow({ name, title, level, via }) {
  return (
    <div className="person-row">
      <div className="avatar">{initials(name)}</div>
      <div className="person-meta">
        <div className="person-name">{name}</div>
        <div className="person-sub">
          {title}
          {via && (
            <>
              {' · via '}
              <span className="via">{via}</span>
            </>
          )}
        </div>
      </div>
      {typeof level === 'number' && <Meter level={level} />}
    </div>
  );
}

function Spinner({ label }) {
  return (
    <div className="state">
      <div className="spinner" />
      {label}
    </div>
  );
}

function Empty({ headline, children }) {
  return (
    <div className="state">
      <div className="headline">{headline}</div>
      {children}
    </div>
  );
}

/* ---- the signature: an animated, color-coded connection path ---- */
function PathView({ path, a, b }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    setDrawn(false);
    const t = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(t);
  }, [path]);

  if (!path) {
    return (
      <Empty headline={`No connection found between ${a} and ${b}.`}>
        They aren&apos;t linked within 8 steps of shared projects or skills.
      </Empty>
    );
  }

  const cls = (label) =>
    label === 'Person' ? 'person' : label === 'Project' ? 'project' : 'skill';

  return (
    <div className="results">
      <p className="path-hops">
        Connected in <b>{path.hops} steps</b>
      </p>
      <div className={drawn ? 'path drawn' : 'path'}>
        {path.steps.map((step, i) => (
          <span key={i} style={{ display: 'contents' }}>
            {i > 0 && <span className="connector" style={{ '--d': `${i * 90}ms` }} />}
            <span className={`chip ${cls(step.label)} step`} style={{ '--d': `${i * 90}ms` }}>
              <span className="dot" />
              {step.name}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState('experts');
  const [skills, setSkills] = useState([]);
  const [people, setPeople] = useState([]);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    Promise.all([getJSON('/api/skills'), getJSON('/api/people')])
      .then(([s, p]) => {
        setSkills(s.skills);
        setPeople(p.people);
      })
      .catch((err) => setLoadError(err.message));
  }, []);

  return (
    <main className="wrap">
      <p className="eyebrow">Expertise Graph · CognoDB</p>
      <h1 className="title">Who knows what</h1>
      <p className="lede">
        Find who knows a skill, search a person&apos;s network for one, and trace how any two
        people are connected through shared projects and skills.
      </p>

      <div className="modes" role="group" aria-label="Choose what to do">
        <button
          className="mode-btn"
          aria-pressed={mode === 'experts'}
          onClick={() => setMode('experts')}
        >
          Find experts
        </button>
        <button
          className="mode-btn"
          aria-pressed={mode === 'network'}
          onClick={() => setMode('network')}
        >
          Search a network
        </button>
        <button
          className="mode-btn"
          aria-pressed={mode === 'path'}
          onClick={() => setMode('path')}
        >
          Trace a path
        </button>
      </div>

      {loadError ? (
        <div className="panel">
          <div className="error">{loadError}</div>
        </div>
      ) : mode === 'experts' ? (
        <ExpertsMode skills={skills} />
      ) : mode === 'network' ? (
        <NetworkMode people={people} skills={skills} />
      ) : (
        <PathMode people={people} />
      )}

      <p className="foot">shortestPath · multi-hop traversal · parameterised Cypher</p>
    </main>
  );
}

/* -------------------- Mode 1: Find experts -------------------- */
function ExpertsMode({ skills }) {
  const [skill, setSkill] = useState('');
  const [state, setState] = useState({ status: 'idle' });

  async function run() {
    if (!skill.trim()) return;
    setState({ status: 'loading' });
    try {
      const data = await getJSON(`/api/people-by-skill?skill=${encodeURIComponent(skill.trim())}`);
      setState({ status: 'done', data });
    } catch (err) {
      setState({ status: 'error', message: err.message });
    }
  }

  return (
    <div className="panel">
      <p className="panel-hint">Search everyone for a skill, strongest first.</p>
      <div className="controls">
        <div className="field">
          <label htmlFor="skill">Skill</label>
          <input
            id="skill"
            className="input"
            list="skills-list"
            placeholder="e.g. Kafka"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()}
          />
          <datalist id="skills-list">
            {skills.map((s) => (
              <option key={s.name} value={s.name} />
            ))}
          </datalist>
        </div>
        <button className="go" onClick={run} disabled={state.status === 'loading'}>
          Find people
        </button>
      </div>

      {state.status === 'loading' && <Spinner label="Searching…" />}
      {state.status === 'error' && <div className="error">{state.message}</div>}
      {state.status === 'done' && <ExpertsResults data={state.data} />}
    </div>
  );
}

function ExpertsResults({ data }) {
  const { skill, direct, related } = data;
  if (direct.length === 0 && related.length === 0) {
    return (
      <Empty headline={`No one is linked to ${skill} yet.`}>
        Try another skill, or pick one from the list.
      </Empty>
    );
  }
  return (
    <div className="results">
      {direct.length > 0 ? (
        <>
          <p className="results-label">{direct.length} know {skill} directly</p>
          {direct.map((p) => (
            <PersonRow key={p.name} name={p.name} title={p.title} level={p.level} />
          ))}
        </>
      ) : (
        <Empty headline={`No one lists ${skill} directly.`}>
          Here&apos;s who knows a closely related skill instead.
        </Empty>
      )}

      {related.length > 0 && (
        <>
          <div className="divider" />
          <p className="results-label">Adjacent skills</p>
          {related.map((p, i) => (
            <PersonRow
              key={`${p.name}-${i}`}
              name={p.name}
              title={`${p.title} · knows ${p.relatedSkill}`}
              level={p.level}
            />
          ))}
        </>
      )}
    </div>
  );
}

/* -------------------- Mode 2: Search a network -------------------- */
function NetworkMode({ people, skills }) {
  const [person, setPerson] = useState('');
  const [skill, setSkill] = useState('');
  const [state, setState] = useState({ status: 'idle' });

  async function run() {
    if (!person || !skill.trim()) return;
    setState({ status: 'loading' });
    try {
      const data = await getJSON(
        `/api/collaborators?person=${encodeURIComponent(person)}&skill=${encodeURIComponent(skill.trim())}`
      );
      setState({ status: 'done', data });
    } catch (err) {
      setState({ status: 'error', message: err.message });
    }
  }

  return (
    <div className="panel">
      <p className="panel-hint">
        Find who in a person&apos;s project network has a skill they need — a three-hop walk from
        person to project to collaborator to skill.
      </p>
      <div className="controls">
        <div className="field">
          <label htmlFor="net-person">Person</label>
          <select
            id="net-person"
            className="select"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
          >
            <option value="">Choose someone…</option>
            {people.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name} — {p.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="net-skill">Needs skill</label>
          <input
            id="net-skill"
            className="input"
            list="skills-list-net"
            placeholder="e.g. Kafka"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()}
          />
          <datalist id="skills-list-net">
            {skills.map((s) => (
              <option key={s.name} value={s.name} />
            ))}
          </datalist>
        </div>
        <button className="go" onClick={run} disabled={state.status === 'loading'}>
          Search network
        </button>
      </div>

      {state.status === 'loading' && <Spinner label="Walking the network…" />}
      {state.status === 'error' && <div className="error">{state.message}</div>}
      {state.status === 'done' &&
        (state.data.results.length === 0 ? (
          <Empty headline={`None of ${state.data.person}'s collaborators list ${state.data.skill}.`}>
            Try “Find experts” to search everyone, or a related skill.
          </Empty>
        ) : (
          <div className="results">
            <p className="results-label">
              {state.data.results.length} in {state.data.person}&apos;s network know {state.data.skill}
            </p>
            {state.data.results.map((p) => (
              <PersonRow key={p.name} name={p.name} title={p.title} level={p.level} via={p.viaProject} />
            ))}
          </div>
        ))}
    </div>
  );
}

/* -------------------- Mode 3: Trace a path -------------------- */
function PathMode({ people }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [state, setState] = useState({ status: 'idle' });

  async function run() {
    if (!a || !b) return;
    if (a === b) {
      setState({ status: 'error', message: 'Choose two different people.' });
      return;
    }
    setState({ status: 'loading' });
    try {
      const data = await getJSON(
        `/api/path?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`
      );
      setState({ status: 'done', data });
    } catch (err) {
      setState({ status: 'error', message: err.message });
    }
  }

  return (
    <div className="panel">
      <p className="panel-hint">
        Pick two people. The graph finds the shortest chain between them — however many steps that
        takes — across shared projects and skills.
      </p>
      <div className="controls">
        <div className="field">
          <label htmlFor="from">From</label>
          <select id="from" className="select" value={a} onChange={(e) => setA(e.target.value)}>
            <option value="">Choose someone…</option>
            {people.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name} — {p.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="to">To</label>
          <select id="to" className="select" value={b} onChange={(e) => setB(e.target.value)}>
            <option value="">Choose someone…</option>
            {people.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name} — {p.title}
              </option>
            ))}
          </select>
        </div>
        <button className="go" onClick={run} disabled={state.status === 'loading'}>
          Trace connection
        </button>
      </div>

      {state.status === 'loading' && <Spinner label="Tracing the shortest path…" />}
      {state.status === 'error' && <div className="error">{state.message}</div>}
      {state.status === 'done' && (
        <PathView path={state.data.path} a={state.data.a} b={state.data.b} />
      )}
    </div>
  );
}
