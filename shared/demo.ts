import type { Brief, Challenge, CompetitorInput, Identity, IdentityDirection, NamingCandidateInput, Naming, Positioning, Voice } from "./schemas";

/**
 * KORA is a fictional demonstration brand. Nothing here is market research, a client, or
 * customer feedback. It is presented in the UI as a curated sample.
 */
export const DEMO_NAME = "KORA";

export const demoBrief: Brief = {
  idea: "A sustainable streetwear label for young Indian consumers. Heavyweight tees, overshirts and cargos made from unbleached and naturally dyed cotton, produced in small runs with mills in Tiruppur and Bhuj.",
  industry: "Apparel · streetwear",
  audience: "Urban 18–26 year olds in Indian metros who follow drop culture, care where clothes come from, and are tired of logo-heavy fast fashion.",
  problem: "Streetwear that looks right is either imported and expensive, or fast fashion that falls apart and hides how it was made.",
  market: "India first, online direct-to-consumer, with pop-ups in Bengaluru, Mumbai and Delhi.",
  businessModel: "Limited drops sold direct online; a permanent core range of basics.",
  values: ["Made slowly", "Honest materials", "Local craft", "Built to last"],
  mission: "Make streetwear that young India can wear hard and feel good about.",
  vision: "A wardrobe where every piece can tell you exactly who made it.",
  budget: "modest",
  personality: ["Bold", "Honest", "Rebellious", "Warm"],
  assumptions: [
    { id: "a1", field: "audience", text: "Customers will pay a premium of roughly 1.5–2× fast-fashion prices for traceable garments. Unverified; test with a pre-order drop.", status: "open" },
  ],
  openQuestions: ["Will the range be unisex from launch?", "Which mills can commit to small-batch runs?"],
};

export const demoCompetitors: CompetitorInput[] = [
  { name: "Archetype A: mass fast-fashion label (illustrative)", url: "", positioning: "Trend-led basics at the lowest price.", audience: "Price-sensitive 16–30s.", messaging: "New styles every week.", differentiation: "Speed and price.", visualNotes: "Bright promotional banners, heavy discount messaging.", notes: "Illustrative archetype, not a real company." },
  { name: "Archetype B: imported hype brand (illustrative)", url: "", positioning: "Global street credibility.", audience: "Affluent sneakerheads.", messaging: "Exclusivity, collaborations.", differentiation: "Cultural cachet.", visualNotes: "Black and white, oversized logos.", notes: "Illustrative archetype, not a real company." },
];

const dirA = {
  id: "d-honest",
  title: "Radical transparency",
  audience: "Conscious urban 18–26s who research before they buy.",
  statement: "For young Indians who want streetwear with nothing to hide, KORA is the label that shows you every hand behind every garment.",
  problem: "Ethical claims in fashion are vague and hard to trust.",
  valueProp: "Every piece carries a traceable story, from mill to stitch.",
  differentiators: ["Named makers on every label", "Undyed and natural-dye cotton only", "Small, numbered runs"],
  promise: "Know exactly what you're wearing.",
  rationale: "Moves the sustainability claim from abstract to verifiable, which is harder for competitors to copy.",
  tradeoffs: ["Slower production", "Supply chain must stay small"],
  risks: ["Traceability is costly to maintain", "May read as worthy rather than cool"],
  messaging: ["Lead with makers, not slogans", "Show the process in every drop"],
};
const dirB = {
  id: "d-culture",
  title: "Homegrown street culture",
  audience: "Creative 18–24s in Indian metros who want a local alternative to imported hype.",
  statement: "For the generation building India's street culture, KORA is homegrown streetwear made here, by people from here.",
  problem: "Indian streetwear culture borrows its status symbols from abroad.",
  valueProp: "Local pride with global quality.",
  differentiators: ["Collaborations with Indian artists", "Drop-based releases", "Indian textile heritage, remixed"],
  promise: "Wear where you're from.",
  rationale: "Taps cultural momentum; sustainability becomes a quiet proof point rather than the headline.",
  tradeoffs: ["Sustainability becomes secondary", "Depends on cultural relevance"],
  risks: ["Crowded with other 'made in India' labels", "Trend exposure"],
  messaging: ["Culture first, materials second", "Feature the scene, not the product"],
};
const dirC = {
  id: "d-durable",
  title: "Built to outlast",
  audience: "Value-minded young professionals who buy fewer, better clothes.",
  statement: "For people done with clothes that die after ten washes, KORA makes heavyweight streetwear built to outlast the trend.",
  problem: "Fast fashion falls apart, so it costs more over time.",
  valueProp: "Garments engineered for years of hard wear.",
  differentiators: ["300gsm cotton", "Free repairs for life", "Wash-tested specs"],
  promise: "Bought once, worn for years.",
  rationale: "Durability is a tangible, testable claim that also carries the sustainability story.",
  tradeoffs: ["Less fashion-forward", "Higher price point"],
  risks: ["Repairs programme has real costs", "Less exciting to the youngest buyers"],
  messaging: ["Prove it with wear tests", "Talk cost-per-wear"],
};

export const demoPositioning: Positioning = {
  directions: [dirA, dirB, dirC],
  selectedId: "d-honest",
  final: { ...dirA, id: "final", title: "Radical transparency, homegrown", differentiators: ["Named makers on every label", "Undyed and natural-dye cotton only", "Indian textile heritage, remixed"] },
};

export const demoVoice: Voice = {
  sliders: { playful: 45, traditional: 70, approachable: 35, understated: 72 },
  summary: "Direct, warm and a little defiant. KORA talks like a friend who works at the mill: specific, unpretentious, proud of the work.",
  principles: [
    { name: "Show, don't claim", description: "Replace adjectives with facts about makers and materials.", do: "“Dyed with indigo in Bhuj by Ramesh’s team.”", dont: "“Eco-friendly, sustainable fashion.”" },
    { name: "Talk like the street", description: "Short sentences. Everyday language, including Hinglish where it's natural.", do: "“Heavy tee. Heavier story.”", dont: "“Our premium garments elevate your style.”" },
    { name: "Proud, never preachy", description: "Celebrate the craft; never lecture the customer.", do: "“Made slow. Worn loud.”", dont: "“You should feel bad about fast fashion.”" },
  ],
  pillars: [
    { title: "Every hand, named", description: "Makers are credited like artists." },
    { title: "Raw by design", description: "Undyed, natural, honest materials." },
    { title: "Homegrown culture", description: "India's street scene, on its own terms." },
  ],
  vocabulary: { use: ["made", "hands", "raw", "drop", "heavy"], avoid: ["eco-friendly", "premium", "luxury", "elevate", "guilt-free"] },
  taglines: ["Made slow. Worn loud.", "Every thread, accounted for.", "Raw from here."],
  websiteCopy: { headline: "Streetwear with nothing to hide.", subhead: "Heavyweight cotton, undyed or naturally dyed, made in small runs by people we name on every label.", cta: "Shop drop 01" },
  social: [{ platform: "Instagram", text: "Meet Lakshmi. She cut 212 of the tees in Drop 01. Her initials are on every one of them. #MadeSlow" }],
};

export const demoNamingCandidates: NamingCandidateInput[] = [
  { name: "KORA", style: "evocative", rationale: "Hindi kora (कोरा): unbleached, new, untouched cloth. Ties directly to the undyed material story.", pronunciation: "KOH-rah", drawbacks: "A common word in several languages, so it may be hard to own exclusively. Not checked for trademarks." },
  { name: "Second Loom", style: "compound", rationale: "Suggests a new generation of weaving.", pronunciation: "SEK-und loom", drawbacks: "Reads as craft-first rather than streetwear." },
  { name: "Undyed Co.", style: "descriptive", rationale: "States the material difference plainly.", pronunciation: "un-DIED koh", drawbacks: "Locks the brand into undyed products only." },
];
export const demoNaming: Naming = { chosen: "KORA", criteria: ["Short enough for a chest print", "Rooted in Indian textile language", "Easy to say across languages"] };

export const demoDirections: IdentityDirection[] = [
  {
    id: "kora-raw",
    name: "Raw signal",
    rationale: "Unbleached cotton paper, obsidian ink and one electric accent borrowed from street posters. The slash mark is a cut thread.",
    palette: { primary: "#16150F", secondary: "#8A7E62", accent: "#D7FF64", ink: "#16150F", paper: "#EDE6D6" },
    typography: { display: "space-grotesk", text: "inter" },
    mark: "slash",
    wordmark: { case: "upper", tracking: 0.04, weight: 700 },
    motif: "weave",
    imageDirection: "Hard-flash portraits on rooftops and in mill corridors; raw fabric close-ups; no studio sweeps.",
    source: "user",
  },
  {
    id: "kora-indigo",
    name: "Indigo heritage",
    rationale: "Natural indigo and madder from the dye vats, set in a warm serif that nods to textile ledgers.",
    palette: { primary: "#22336B", secondary: "#A3412C", accent: "#E8B44C", ink: "#1A1A22", paper: "#F3ECDF" },
    typography: { display: "fraunces", text: "dm-sans" },
    mark: "arch",
    wordmark: { case: "upper", tracking: 0.12, weight: 600 },
    motif: "arcs",
    imageDirection: "Daylight in dye workshops, hands in indigo, garments photographed flat on handloom.",
    source: "user",
  },
];
export const demoIdentity: Identity = { directions: demoDirections, activeId: "kora-raw", variations: [] };

export const demoChallenge: Challenge = {
  findings: [
    { id: "f1", perspective: "investor", title: "Traceability costs are not in the model", severity: "high", basis: "judgment", evidence: "Promise: “Know exactly what you're wearing.”", affected: "positioning", rationale: "Naming every maker means ongoing documentation work for each run. Small batches multiply that overhead.", action: "Cost the traceability workflow for one drop before committing to the promise publicly.", resolved: false },
    { id: "f2", perspective: "customer", title: "“Raw” may read as unfinished", severity: "medium", basis: "judgment", evidence: "Pillar: “Raw by design”", affected: "voice", rationale: "Without context, raw can suggest low quality rather than undyed material.", action: "Pair “raw” with a material fact the first time it appears in any piece of copy.", resolved: false },
  ],
};
