const { useState } = React;

function ResetPassword() {
  const token = window.Router.query().get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function validate() {
    if (!token) return "This reset link is missing its token.";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (password !== confirm) return "Passwords don't match";
    return "";
  }

  async function submit() {
    const err = validate();
    if (err) {
      setError(err);
      window.Toast.show(err, "error");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await window.Api.resetPassword(token, password);
      setDone(true);
      window.Toast.show("Password reset", "success");
    } catch (e) {
      const msg = e.message || "This link is invalid or has expired.";
      setError(msg);
      window.Toast.show(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <section className="relative flex min-h-[70vh] items-center justify-center">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <h1 className="font-heading text-4xl italic leading-[0.9] tracking-[-2px] text-white">Password reset</h1>
          <p className="mt-4 font-body text-sm font-light text-white/60">
            Your password has been updated. Sign in with your new password.
          </p>
          <button
            type="button"
            onClick={() => window.Router.go("/onboarding")}
            className="mt-8 rounded-full bg-white px-7 py-3.5 font-body text-sm font-medium text-black"
          >
            Back to sign in
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative flex min-h-[70vh] items-center justify-center">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-center font-heading text-4xl italic leading-[0.9] tracking-[-2px] text-white">
          Reset your password
        </h1>
        <p className="mt-4 text-center font-body text-sm font-light text-white/60">
          Choose a new password for your account.
        </p>

        <div className="mx-auto mt-8 flex max-w-md flex-col gap-3">
          <div className="liquid-glass-strong rounded-2xl px-5 py-4">
            <label className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">New password</label>
            <input
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="••••••••"
              type="password"
              autoComplete="new-password"
              className="mt-2 w-full bg-transparent font-body text-base text-white placeholder:text-white/30 outline-none"
            />
          </div>
          <div className="liquid-glass-strong rounded-2xl px-5 py-4">
            <label className="font-body text-[11px] uppercase tracking-[0.18em] text-white/50">Confirm password</label>
            <input
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError("");
              }}
              placeholder="••••••••"
              type="password"
              autoComplete="new-password"
              className="mt-2 w-full bg-transparent font-body text-base text-white placeholder:text-white/30 outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </div>
          {error && <p className="text-center font-body text-xs text-red-300">{error}</p>}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="rounded-full bg-white px-7 py-3.5 font-body text-sm font-medium text-black disabled:opacity-50"
          >
            {loading ? "Resetting…" : "Reset password"}
          </button>
        </div>
      </div>
    </section>
  );
}

window.ResetPassword = ResetPassword;
