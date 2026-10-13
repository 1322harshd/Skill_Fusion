const { useEffect, useState } = React;

function VerifyEmail() {
  const [status, setStatus] = useState("checking"); // checking | success | error
  const [error, setError] = useState("");

  useEffect(() => {
    const token = window.Router.query().get("token") || "";
    if (!token) {
      setStatus("error");
      setError("This verification link is missing its token.");
      return;
    }
    let cancelled = false;
    window.Api.verifyEmail(token)
      .then(() => {
        if (cancelled) return;
        window.Store.updateUser({ isEmailVerified: true });
        setStatus("success");
        window.Toast.show("Email verified", "success");
      })
      .catch((e) => {
        if (cancelled) return;
        setStatus("error");
        setError(e.message || "This link is invalid or has expired.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="relative flex min-h-[70vh] items-center justify-center">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        {status === "checking" && (
          <>
            <h1 className="font-heading text-4xl italic leading-[0.9] tracking-[-2px] text-white">
              Verifying your email
            </h1>
            <p className="mt-4 font-body text-sm font-light text-white/60">One moment…</p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="font-heading text-4xl italic leading-[0.9] tracking-[-2px] text-white">
              Email verified
            </h1>
            <p className="mt-4 font-body text-sm font-light text-white/60">
              Your email is confirmed. You're all set.
            </p>
            <button
              type="button"
              onClick={() => window.Router.go("/dashboard")}
              className="mt-8 rounded-full bg-white px-7 py-3.5 font-body text-sm font-medium text-black"
            >
              Go to dashboard
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="font-heading text-4xl italic leading-[0.9] tracking-[-2px] text-white">
              Couldn't verify email
            </h1>
            <p className="mt-4 font-body text-sm font-light text-white/60">{error}</p>
            <button
              type="button"
              onClick={() => window.Router.go("/onboarding")}
              className="mt-8 rounded-full bg-white/10 px-7 py-3.5 font-body text-sm font-medium text-white hover:bg-white/15"
            >
              Back to sign in
            </button>
          </>
        )}
      </div>
    </section>
  );
}

window.VerifyEmail = VerifyEmail;
