import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Wordmark } from "@/components/Brand";

const CONTENT = {
  privacy: {
    title: "Privacy policy",
    sections: [
      ["What we store", "Your email address and a salted scrypt hash of your password (never the password itself), the projects and artifacts you create, their version history, and a log of activity and AI usage within your account. Guest workspaces store the same project data against an anonymous session cookie."],
      ["Cookies", "One httpOnly session cookie keeps you signed in. It is not used for advertising or cross-site tracking. Brand-preview typefaces in the identity studio are loaded from Google Fonts when you open those previews."],
      ["AI processing", "When you request generation, the relevant artifact content is sent from the server to Anthropic's API to produce a response. Keys stay on the server. Nothing is sent to an AI provider unless you trigger a generation."],
      ["Retention and deletion", "You can delete individual projects or your entire account from Settings; deletion removes the data from the database immediately. Inactive guest workspaces are removed after 30 days."],
      ["Contact", "This is a portfolio deployment. Contact the operator of this instance for any privacy request."],
    ],
  },
  terms: {
    title: "Terms of service",
    sections: [
      ["The service", "BrandFoundry is a workspace for developing brand strategy and identity. It is provided as-is, without warranties, and may change or be unavailable."],
      ["Your content", "You own what you create. You are responsible for the content you enter and for how you use generated suggestions."],
      ["No legal clearance", "BrandFoundry does not check trademarks, company names, or domain availability. Names and logos produced here are not cleared for use; seek professional advice before adopting them."],
      ["AI output", "Generated suggestions can be wrong, generic, or similar to existing work. Review them critically. Findings are labelled as evidence-based or judgment so you can weigh them."],
      ["Acceptable use", "Do not use the service to infringe others' rights, to impersonate real organisations, or to attempt to access other users' projects."],
    ],
  },
} as const;

export default function Legal({ page }: { page: keyof typeof CONTENT }) {
  const c = CONTENT[page];
  useEffect(() => {
    document.title = `${c.title} — BrandFoundry`;
  }, [c.title]);
  return (
    <main className="min-h-dvh bg-paper text-ink">
      <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-8">
        <Link to="/" aria-label="BrandFoundry home">
          <Wordmark size={22} />
        </Link>
        <Link to={page === "privacy" ? "/terms" : "/privacy"} className="text-[13px] text-ink/60 hover:text-ink">
          {page === "privacy" ? "Terms of service" : "Privacy policy"}
        </Link>
      </header>
      <article className="mx-auto max-w-3xl px-4 pt-12 pb-24 sm:px-8">
        <h1 className="text-[length:var(--text-huge)] leading-none font-semibold tracking-[-0.045em]">{c.title}</h1>
        <p className="mt-4 font-mono text-[12px] text-stone-dark">Last updated October 2026</p>
        <div className="mt-12 border-t border-ink/15">
          {c.sections.map(([h, b], i) => (
            <section key={h} className="grid gap-3 border-b border-ink/10 py-7 sm:grid-cols-[48px_200px_1fr]">
              <span className="font-mono text-[11px] text-stone-dark">0{i + 1}</span>
              <h2 className="text-[17px] font-semibold tracking-tight">{h}</h2>
              <p className="text-[15px] leading-relaxed text-ink/70">{b}</p>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
