/**
 * Project archive and case-study content.
 *
 * Truthfulness rule: every statement here is backed by the project's source
 * code or its own documentation. The evidence for each project is listed in
 * docs/CONTENT_INVENTORY.md. No metrics are quoted because none are recorded
 * in the sources. Fields that cannot be established stay undefined.
 *
 * To add a case study: append a Project. The archive, the /work/[slug] route,
 * the sitemap and capability links all read from this array.
 */

export type ProjectSlug = "hybrid-phishing-detection" | "gst-audit-compliance" | "echoss-studio";

export type ProjectLink = { label: string; href: string };

export type StackGroup = { group: string; items: string[] };

export type Point = { title: string; body: string };

export type PipelineStage = {
  label: string;
  detail: string;
  /** Parallel parts of this stage, shown side by side. */
  parts?: string[];
};

export type Project = {
  slug: ProjectSlug;
  title: string;
  /** Short name for compact links. */
  short: string;
  /** One sentence for the archive and metadata. */
  summary: string;
  category: string;
  /** How the project came about. */
  context: string;
  /** Actual implementation status. */
  status: string;
  /** Role, only where the sources establish it. */
  role?: string;
  /** Short list for the archive row. */
  highlights: string[];
  stack: StackGroup[];
  links: ProjectLink[];
  /** Describes the illustration for assistive technology. */
  artAlt: string;
  study: {
    problem: string[];
    pipeline: { caption: string; stages: PipelineStage[] };
    architecture: Point[];
    decisions: Point[];
    evaluation: string[];
    limitations: string[];
    next: string[];
  };
};

export const projects: Project[] = [
  {
    slug: "hybrid-phishing-detection",
    title: "Hybrid Phishing Detection Platform",
    short: "Phishing detection",
    summary:
      "A FastAPI service and React dashboard that score URLs, messages and screenshots for phishing by combining rule-based heuristics with machine-learning classifiers.",
    category: "Security · Machine learning",
    context: "Hackathon project",
    status: "Working prototype, run locally. Source is public.",
    highlights: ["Three input types, one pipeline", "Heuristics lead, models adjust", "Every verdict is explained"],
    stack: [
      { group: "Backend", items: ["Python", "FastAPI", "Uvicorn", "Pillow", "Tesseract OCR (pytesseract)", "tldextract"] },
      { group: "Machine learning", items: ["scikit-learn (Random Forest)", "Hugging Face Transformers", "PyTorch", "pandas"] },
      { group: "Frontend", items: ["React", "Vite", "Tailwind CSS", "React Router", "Recharts", "Axios"] },
    ],
    links: [{ label: "Source on GitHub", href: "https://github.com/Perex21/Phishing-Automation" }],
    artAlt:
      "Illustration: three parallel lines enter from the left and merge into one path; a single stroke breaks away and is caught inside a red ring.",
    study: {
      problem: [
        "Phishing does not arrive in one shape. It comes as a link, as a pasted message, or as a screenshot of a chat forwarded by someone who was not sure about it. A checker that handles only URLs misses most of what people actually receive.",
        "Single-signal detection has a second problem. Pure keyword rules are easy to explain but easy to evade; a single classifier catches more but gives no reason and will happily flag a legitimate site with an unusual address. The goal was one pipeline that accepts all three input types, combines several independent signals, and can say why it reached its verdict.",
      ],
      pipeline: {
        caption: "Request flow through the service, as implemented in the API's three scan endpoints.",
        stages: [
          {
            label: "Input",
            detail: "Three endpoints accept the three forms phishing takes.",
            parts: ["URL", "Pasted text", "Screenshot upload"],
          },
          {
            label: "Extraction",
            detail:
              "Uploads are checked for type and size (10 MB limit), verified as real images, read with Tesseract OCR, then deleted. The extracted text joins the text pipeline.",
          },
          {
            label: "Independent signals",
            detail: "Each engine scores the input on its own, without seeing the others.",
            parts: [
              "URL heuristics and domain reputation",
              "BERT-based URL classifier",
              "Random Forest over 18 URL features",
              "Keyword and regex rules for text",
              "Zero-shot text classifier",
            ],
          },
          {
            label: "Aggregation",
            detail:
              "The heuristic score is the base. Model outputs raise or lower it within limits, a reputable domain caps the result, and the total is clamped to 0–100.",
          },
          {
            label: "Verdict",
            detail:
              "Four bands: Safe, Low, Medium and High risk. The response lists the indicators, trust signals and matched keywords behind the score, plus recommendations for that band.",
          },
          {
            label: "Dashboard",
            detail: "A React app runs scans, keeps a local history, and charts past results.",
          },
        ],
      },
      architecture: [
        {
          title: "API layer",
          body: "A FastAPI application exposes /scan-url, /scan-text, /scan-image and /health. All three scan endpoints return through one normalising function, so the frontend handles a single response shape regardless of input type.",
        },
        {
          title: "URL engines",
          body: "A heuristic analyser applies weighted rules (suspicious TLDs, URL shorteners, brand names in unexpected hosts) and checks the domain against the Cisco Umbrella top-one-million list. A Hugging Face BERT-based classifier and a scikit-learn Random Forest then score the same URL. The forest reads 18 structural features, such as length, digit ratio, subdomain count and hostname entropy, and reports which ones drove its score.",
        },
        {
          title: "Text engine",
          body: "Rule-based matching is the primary scorer: keyword groups for urgency, credential requests, payment pressure and impersonation, plus regex patterns. A zero-shot classifier acts as a secondary confidence layer, and a TF-IDF Random Forest contributes when its trained files are present. If the models fail to load, the rules still produce a result.",
        },
        {
          title: "Frontend",
          body: "A React and Vite single-page app with landing, scan, history and analytics views. Scan history lives in the browser's localStorage, so the system needs no database. An earlier plain HTML and JavaScript client is kept in the repository.",
        },
      ],
      decisions: [
        {
          title: "Heuristics lead; models adjust",
          body: "The classifiers cannot overrule the rules on their own. The BERT verdict adds at most 30% of its confidence, and the Random Forest only adds weight when the heuristics have also found something. A model that is confidently wrong about an odd-looking but harmless URL cannot push it into high risk alone.",
        },
        {
          title: "Reputation as a ceiling",
          body: "A domain found in the top-one-million list has its score capped and its structural warnings removed from the explanation. This trades a small risk of missing abuse hosted on a popular domain for far fewer false alarms on ordinary sites.",
        },
        {
          title: "Local inference only",
          body: "Every model runs on the machine hosting the API. Messages and screenshots are never sent to a third-party service, which matters when the content being checked is someone's private conversation.",
        },
        {
          title: "Pay the model cost once",
          body: "Models and the reputation list load at startup rather than on the first request, and URL results are held in a small cache with a time limit and a size bound, so repeat scans return immediately.",
        },
        {
          title: "Explanations from templates, not a language model",
          body: "The written report and recommendations are assembled from the indicators and the risk band. That keeps explanations fast, repeatable and impossible to hallucinate, at the cost of less varied prose.",
        },
      ],
      evaluation: [
        "The repository contains a training script for the URL Random Forest (150 trees, hold-out split, classification report) that draws on two public phishing-URL datasets, including PhiUSIIL.",
        "A benchmark script compares four Hugging Face URL classifiers on a balanced 100-URL sample, and an evaluation script reports accuracy, false positives and false negatives for the chosen model on a random sample.",
        "The results of those runs are not recorded in the repository, so no accuracy figures are quoted here. The datasets and trained model files are also kept out of version control.",
      ],
      limitations: [
        "The threat-intelligence lookup is a stub. The URLhaus check was switched off to keep scans fast and currently always reports a clean result.",
        "Trained model files and datasets are not in the repository. Without them the Random Forest layers are skipped and the service falls back to heuristics and the hosted classifier.",
        "The health endpoint reports OCR as available without probing for the Tesseract binary.",
        "There is no automated test suite; verification is by scripts and manual scans. The API has no authentication or rate limiting.",
      ],
      next: [
        "Restore the URLhaus lookup behind a short timeout so a slow feed cannot stall a scan.",
        "Record benchmark and evaluation results alongside the scripts that produce them.",
        "Publish a reproducible training step so the model layers work from a clean checkout.",
        "Add request-level tests around the aggregation rules, which carry most of the judgement.",
      ],
    },
  },
  {
    slug: "gst-audit-compliance",
    title: "AI-powered GST Audit & Compliance Platform",
    short: "GST audit",
    summary:
      "A reconciliation tool that compares a purchase register against GSTR-2B, applies rule-based GST checks, and uses a language model to explain the mismatches it finds.",
    category: "Compliance · Data and AI",
    context: "Hackathon team project",
    status: "Working prototype with demo data. Source and demo video are public.",
    highlights: ["Ledger reconciliation with pandas", "Rule modules for ITC, vendors, invoices", "AI explains; it does not decide"],
    stack: [
      { group: "Backend", items: ["Python", "FastAPI", "pandas", "openpyxl", "thefuzz"] },
      { group: "AI", items: ["Google Gemini (gemini-2.5-flash)", "google-genai SDK"] },
      { group: "Frontend", items: ["React", "Vite", "Tailwind CSS", "Framer Motion", "react-dropzone", "Axios"] },
    ],
    links: [
      { label: "Source on GitHub", href: "https://github.com/Perex21/gst-compliance-agent" },
      { label: "Demo video on YouTube", href: "https://youtu.be/jXIfQKOycdA" },
    ],
    artAlt:
      "Illustration: two columns of ledger lines face each other across a central rule. Most rows align; one row breaks away at an angle and is marked in red.",
    study: {
      problem: [
        "Under India's Goods and Services Tax, a business claims input tax credit on its purchases, but only where the supplier has reported the same invoice. In practice that means comparing two spreadsheets: the company's own purchase register and the GSTR-2B statement generated from suppliers' filings.",
        "The comparison is tedious and error-prone. Invoice numbers are typed differently on each side, dates drift across month boundaries, and amounts differ by rounding. An accountant needs to know which mismatches matter, which rule each one touches, and what to do next. The aim was to automate the matching and the rule checks, and to use a language model only for the part it suits: explaining a finding in plain terms.",
      ],
      pipeline: {
        caption: "Processing flow from upload to report, as implemented in the API and the analysis engine.",
        stages: [
          {
            label: "Upload",
            detail: "Two Excel files, with audit tolerances chosen by the user.",
            parts: ["Purchase register", "GSTR-2B statement"],
          },
          {
            label: "Sanitise",
            detail:
              "Column headers and values are trimmed, invoice numbers upper-cased, and dates normalised so that formatting differences do not register as mismatches.",
          },
          {
            label: "Reconcile",
            detail:
              "An outer join on the invoice keys sorts every row into one of three groups, then matched rows are compared on tax amount, date and HSN/SAC code within the chosen tolerances.",
            parts: ["In books, missing from GSTR", "In GSTR, missing from books", "In both, with variances"],
          },
          {
            label: "Fuzzy pass",
            detail:
              "Unmatched pairs whose invoice numbers and supplier names are close, and whose tax amounts agree, are reclassified as probable typing errors rather than missing invoices.",
          },
          {
            label: "Rule modules",
            detail: "Deterministic checks run over the reconciled data.",
            parts: ["ITC eligibility", "Vendor risk", "Invoice compliance"],
          },
          {
            label: "Explain",
            detail:
              "Up to fifty mismatches go to Gemini in one request for a likely cause and a next step each. A chat assistant answers questions with the current findings as context.",
          },
          {
            label: "Report",
            detail: "A React dashboard shows totals, the exception list and a pre-filing summary.",
          },
        ],
      },
      architecture: [
        {
          title: "API layer",
          body: "A FastAPI service handles uploads and exposes the reconciliation endpoint, one endpoint per rule module, and the chat endpoint. Each upload is saved under a unique identifier and removed in a finally block, so concurrent sessions cannot collide and files do not accumulate.",
        },
        {
          title: "Analysis engine",
          body: "A separate Python package holds the pandas logic: cleaning, the outer merge, variance checks and the optional fuzzy pass. It has no knowledge of HTTP, which keeps it callable from scripts and tests.",
        },
        {
          title: "Rule modules",
          body: "Three modules encode specific checks. ITC eligibility flags blocked credits under Section 17(5), supplier non-payment under Section 16(2)(c), credit above a configurable cap, and invoices outside a look-back window. Vendor risk profiles suppliers by mismatch rate and spend concentration. Invoice compliance validates GSTIN format, invoice numbering, duplicates, HSN codes and future-dated entries.",
        },
        {
          title: "AI wrapper and frontend",
          body: "A thin client wraps the Gemini SDK for batch explanations and chat. The React and Vite frontend replaced an earlier Streamlit interface and adds drag-and-drop upload, progress feedback and the results views.",
        },
      ],
      decisions: [
        {
          title: "Deterministic first; the model explains",
          body: "Every figure and every flag comes from pandas and explicit rules. The language model receives the findings and writes about them. If the model call fails or no API key is set, the reconciliation still returns in full with a note that the explanation is unavailable.",
        },
        {
          title: "One batched request, not one per invoice",
          body: "Mismatches are sent to the model together and the reply is required to be JSON keyed by invoice number. That bounds cost and latency and makes the response checkable against the input.",
        },
        {
          title: "Tolerances belong to the auditor",
          body: "Date windows, amount variance, minimum amounts, excluded vendors and fuzzy matching are parameters of the request rather than constants, because what counts as a material difference is a judgement the user has to own.",
        },
        {
          title: "Treat near-misses as typos, visibly",
          body: "Fuzzy matches are not silently merged. They are reported under their own label so the accountant can see that an invoice was matched by similarity and confirm it.",
        },
      ],
      evaluation: [
        "A generator script builds a purchase register and a GSTR-2B file with intentional mismatches, blocked credits and vendor problems, so that each feature has cases to find.",
        "Script-based checks post those files to the API and exercise the reconciliation and all three rule modules end to end.",
        "No accuracy, time-saving or financial figures were measured, so none are claimed. The linked video demonstrates the working flow on the demo data.",
      ],
      limitations: [
        "The rule modules model selected provisions for demonstration. They are not legal advice and offer no guarantee of compliance.",
        "There is no connection to the GST Network. The e-way bill endpoint is a hard-coded simulation.",
        "Vendor risk matches suppliers by name, because the demo data does not map every supplier to a GSTIN.",
        "The chat assistant places the current findings in the prompt; it does not retrieve from an indexed knowledge base.",
        "The project README lists the OpenAI API, but the code calls Google Gemini. This case study follows the code.",
      ],
      next: [
        "Add automated tests around the merge and each rule, using the generated datasets as fixtures.",
        "Match vendors on GSTIN rather than name once the input carries it reliably.",
        "Validate the model's JSON reply against the input invoice numbers before showing it.",
        "Bring the README in line with the implementation.",
      ],
    },
  },
  {
    slug: "echoss-studio",
    title: "ECHOSS STUDIO website",
    short: "ECHOSS Studio",
    summary:
      "A marketing site for an animation studio, built around an interactive WebGL globe, scroll-driven sequences and an enquiry form that never fakes a success.",
    category: "Web engineering · Motion",
    context: "Studio website",
    status: "In development. Awaiting the studio's own footage and copy; not yet launched.",
    highlights: ["Interactive 3D hero with a static fallback", "Placeholders that say they are placeholders", "Enquiry form with honest failure states"],
    stack: [
      { group: "Framework", items: ["Next.js (App Router)", "React", "TypeScript", "Tailwind CSS"] },
      { group: "Motion and 3D", items: ["Motion for React", "GSAP ScrollTrigger", "three.js", "React Three Fiber", "Drei"] },
      { group: "Interface and services", items: ["shadcn/ui on Base UI", "Magic UI Marquee", "Resend"] },
    ],
    links: [],
    artAlt:
      "Illustration: a wireframe globe with rings travelling outward from it like an echo. One ring breaks its circle and trails away as a diverging stroke.",
    study: {
      problem: [
        "An animation studio's website has an awkward brief. It must look like the work of people who care about moving images, and it must get out of the way so the studio's own footage carries the page.",
        "This build had a further constraint: the site was needed before the content existed. There was no showreel, no portfolio stills and no approved copy. The site had to be complete and reviewable without any of it, and without pretending that stand-in material was the studio's work.",
      ],
      pipeline: {
        caption: "How the hero loads, from first paint to interaction.",
        stages: [
          {
            label: "Static poster",
            detail: "The hero renders first as an image, so the page is complete before any script runs.",
          },
          {
            label: "Checks",
            detail: "The 3D scene is only requested when conditions allow it.",
            parts: ["WebGL 2 available", "Data saver off"],
          },
          {
            label: "Lazy load",
            detail: "three.js, React Three Fiber and Drei are fetched as a separate chunk and the globe fades in over the poster.",
          },
          {
            label: "Interaction",
            detail: "The globe responds to direct input and carries momentum after release.",
            parts: ["Mouse, pen or touch drag", "Arrow keys when focused", "Visible pause control"],
          },
          {
            label: "Rest",
            detail: "Rendering stops when the hero leaves the viewport or the tab is in the background.",
          },
        ],
      },
      architecture: [
        {
          title: "Framework and content",
          body: "Next.js with the App Router, React and TypeScript, styled with Tailwind CSS. Copy and configuration sit in one typed file and the portfolio in another, so the studio's material can replace the stand-ins without touching components.",
        },
        {
          title: "Hero globe",
          body: "A three.js scene driven through React Three Fiber. Its colour, roughness and bump textures are baked by a script from public-domain Natural Earth coastlines, so the globe is original artwork with no runtime map service.",
        },
        {
          title: "Showreel and work views",
          body: "A custom video player with its own transport controls and caption support. Until a real reel is supplied it plays a film leader drawn on a 2D canvas and slated as a placeholder on every frame. Portfolio entries can be browsed as a shelf of discs or as a grid.",
        },
        {
          title: "Enquiry route",
          body: "A server route validates the submission with the same rules as the client, checks a honeypot field, limits each address to five enquiries in ten minutes, and sends mail through Resend.",
        },
      ],
      decisions: [
        {
          title: "Two motion libraries, each for one job",
          body: "Motion for React handles entrances, hover states, the menu and form feedback. GSAP ScrollTrigger is used only for two scroll-scrubbed sequences. Nothing is pinned, so the page always scrolls at the visitor's own pace.",
        },
        {
          title: "Label every stand-in",
          body: "Draft copy and placeholder imagery carry a visible tag controlled by one switch, and placeholder projects are excluded from search indexing. The site claims no clients, awards, team or statistics.",
        },
        {
          title: "Failure is a designed state",
          body: "Until mail credentials are configured the enquiry route answers that it is not set up, the form says so before the visitor types, and a submission ends in a clear message that it was not sent. It never reports a success it did not have.",
        },
        {
          title: "The 3D scene is an enhancement",
          body: "The globe never loads with data saver on, stops spinning under reduced motion and turns only while dragged, and without WebGL 2 the poster simply stays. Entrance states are revealed by a noscript rule, so the page reads in full without JavaScript.",
        },
      ],
      evaluation: [
        "The project's scripts cover linting, type checking and the production build.",
        "It has not been launched, so there are no traffic, performance or conversion figures to report.",
        "No automated interface tests exist yet.",
      ],
      limitations: [
        "All six portfolio entries are procedural placeholder renders, and the copy is draft text awaiting the studio's approval.",
        "There is no real showreel; the player runs the generated leader.",
        "The logo is a raster image prepared for a dark background, pending a vector original.",
        "Enquiry delivery is not configured, and the rate limit is held in memory per server instance.",
      ],
      next: [
        "Replace placeholders with the studio's footage, stills and copy, then switch off the draft labels.",
        "Configure mail delivery and move rate limiting to a shared store before launch.",
        "Add interface tests for the enquiry flow and the player controls.",
      ],
    },
  },
];

export const getProject = (slug: string): Project | undefined => projects.find((p) => p.slug === slug);
