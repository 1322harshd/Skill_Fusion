const { useState, useEffect, useRef } = React;
const { motion } = window.Motion;

function Quiz() {
  const q = window.Router.query();
  const urlSkills = (q.get("skills") || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const [skills, setSkills] = useState(urlSkills);
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState(null);
  const [choices, setChoices] = useState({});
  const choicesRef = useRef({});
  function pick(qid, oi) {
    choicesRef.current = { ...choicesRef.current, [qid]: oi };
    setChoices(choicesRef.current);
  }
  const [left, setLeft] = useState(300);
  const [levels, setLevels] = useState(null);
  const [error, setError] = useState(null);
  const timer = useRef(null);

  // Evidence rule: skills already evidenced (CV/GitHub/Growth Log) are NOT
  // quizzed. Fail-open: if evidence can't be read, quiz everything.
  useEffect(() => {
    if (!urlSkills.length) { setChecking(false); return; }
    window.Api.listGrowthLogEntries()
      .then((entries) => {
        const have = new Set();
        (Array.isArray(entries) ? entries : entries.entries || []).forEach((e) => {
          (e.tags || []).forEach((t) => have.add(String(t.label || t).toLowerCase()));
          if (e.title) have.add(String(e.title).toLowerCase());
        });
        const need = urlSkills.filter((s) => ![...have].some((h) => h.includes(s.toLowerCase()) || s.toLowerCase().includes(h)));
        setSkills(need.length ? need : []);
        setChecking(false);
        if (!need.length) setLevels([]);
      })
      .catch(() => { setSkills(urlSkills); setChecking(false); });
  }, []);

  useEffect(() => {
    if (!session || levels) return;
    timer.current = setInterval(() => {
          setLeft((s) => {
            if (s <= 1) {
              clearInterval(timer.current);
              setTimeout(() => submit(true), 0);
              return 0;
            }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer.current);
  }, [session, levels]);

  async function submit(auto = false) {
    clearInterval(timer.current);
    const picks = auto ? choicesRef.current : choices;
    const answers = (session.questions || []).map((qq) => ({ id: qq.id, choice: picks[qq.id] ?? -1 }));
    try {
      const d = await window.Api.quizSubmit(session.session_id, answers);
      setLevels(d.levels);
    } catch (e) {
      setError("Couldn't submit — is the backend running?");
    }
  }

  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  if (checking) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center">
        <p className="font-heading text-2xl italic text-white">Checking your evidence…</p>
      </div>
    );
  }
  if (!urlSkills.length && !session) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center text-center">
        <p className="font-heading text-2xl italic text-white">Fuse two skills first</p>
        <p className="mt-2 font-body text-sm text-white/60">Quizzes are per-skill, after you choose a fusion — skills already evidenced are skipped automatically.</p>
        <button type="button" onClick={() => window.Router.go("/fuse")} className="mt-6 rounded-full bg-white px-6 py-3 font-body text-sm font-medium text-black">Go to fuse</button>
      </div>
    );
  }
  if (!skills.length) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center text-center">
        <p className="font-heading text-2xl italic text-white">Already covered</p>
        <p className="mt-2 font-body text-sm text-white/60">Your CV and logs already evidence these skills — no quiz needed. The full picture is complete.</p>
        <button type="button" onClick={() => window.Router.go("/roadmaps")} className="mt-6 rounded-full bg-white px-6 py-3 font-body text-sm font-medium text-black">Continue to roadmaps</button>
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center text-center">
        <p className="font-heading text-2xl italic text-white">Quiz unreachable</p>
        <p className="mt-2 font-body text-sm text-white/70">{error}</p>
      </div>
    );
  }
  if (levels) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">{"// Your baseline"}</p>
        {levels.map((l) => (
          <div key={l.label} className="liquid-glass mt-4 rounded-[1rem] px-6 py-5">
            <p className="font-heading text-2xl italic text-white">{l.label}: {l.level}/10</p>
            <p className="mt-1 font-body text-xs text-white/60">{l.reason}</p>
          </div>
        ))}
        <button type="button" onClick={() => window.Router.go("/roadmaps")} className="mt-8 rounded-full bg-white px-6 py-3 font-body text-sm font-medium text-black">Continue to roadmaps</button>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center">
        <p className="font-heading text-2xl italic text-white">Writing your questions…</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl py-10">
      <div className="mb-6 flex items-center justify-between">
        <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">{"// Baseline quiz"}</p>
        <p className="font-heading text-xl italic text-white">{mm}</p>
      </div>
      {session.questions.map((qq, i) => (
        <div key={qq.id} className="liquid-glass mb-4 rounded-[1rem] px-6 py-5">
          <p className="font-body text-[11px] uppercase tracking-[0.18em] text-white/40">{qq.skill} · {qq.difficulty} · Q{i + 1}</p>
          <p className="mt-2 font-heading text-lg italic text-white">{qq.q}</p>
          <div className="mt-3 flex flex-col gap-2">
            {qq.options.map((op, oi) => (
              <button
                key={oi}
                type="button"
                onClick={() => pick(qq.id, oi)}
                className={(choices[qq.id] === oi ? "bg-white text-black" : "liquid-glass text-white/85 hover:text-white") + " rounded-xl px-4 py-2 text-left font-body text-sm"}
              >
                {op}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button type="button" onClick={submit} className="mt-4 w-full rounded-full bg-white px-6 py-3 font-body text-sm font-medium text-black">Submit answers</button>
    </div>
  );
}

window.Quiz = Quiz;
