/**
 * The Ziiro system directory: one object per pipeline, and nothing else.
 *
 * The visualisation, the flow view and the detail panel all read from this
 * array and nothing but this array. Adding a sixth pipeline is a sixth object
 * — the radial map re-lays itself out, the selector grows a row, the panel
 * renders it. There is no component to touch.
 *
 * Two rules held while writing the content, because the section's whole job is
 * to look like a real system rather than a brochure:
 *
 *   1. No invented numbers. There are no "hours saved" or "leads processed"
 *      figures anywhere, because no such figure exists to quote. What's shown
 *      instead is structural metadata a reader can verify against the diagram
 *      itself: how many steps, how many agents, what triggers it, what comes
 *      out.
 *   2. No invented vendors. `integrations` names capability classes — "vector
 *      store", "transcription", "CRM" — not products. Swap in the real
 *      product names per pipeline when you want them; nothing else changes.
 */

export type PipelineStatus = "active" | "in-build";

export interface PipelineStep {
  id: string;
  name: string;
  description: string;
  /** id of the agent that owns this step, when one does. */
  agent?: string;
  input: string;
  output: string;
  /** Steps that run without a human in the loop. Drawn differently. */
  automated: boolean;
}

export interface PipelineAgent {
  id: string;
  name: string;
  role: string;
  input: string;
  /** What it actually weighs up. Rendered as prose in the panel. */
  logic: string[];
  output: string;
  /** The named things this agent does. These are the map's outermost nodes —
   *  every dot on the graph is one of these, so the picture and the panel are
   *  descriptions of the same structure rather than one being decoration for
   *  the other. */
  capabilities: string[];
}

export interface Pipeline {
  id: string;
  name: string;
  /** Two or three words. Used as the node label on the map. */
  shortName: string;
  category: string;
  tagline: string;
  purpose: string;
  status: PipelineStatus;
  /** What sets the pipeline running. */
  trigger: string;
  outputs: string[];
  integrations: string[];
  steps: PipelineStep[];
  agents: PipelineAgent[];
  /** Three words under the rim label on the map, drawn from this system's own
   *  step names. Short on purpose — they read as a caption, not a sentence. */
  tags: [string, string, string];
  /** Which glyph sits in this system's hub on the map. Resolved to a
   *  component in EcosystemMap so the data stays free of React imports. */
  icon: "search" | "pen" | "film" | "brain" | "ruler" | "compass" | "chart";
  /** The branch's hue on the map. The seven are a ramp from the warm end of
   *  the palette to the cool end, in ring order, so hue rotates as you go
   *  round the map and the ecosystem reads as one spectrum with seven limbs
   *  rather than as seven products with seven brand colours. */
  accent: string;
}

export const PIPELINES: Pipeline[] = [
  {
    id: "operations",
    name: "Operations",
    shortName: "Operations",
    category: "Video Editing pipeline",
    tagline: "Assisted post-production pipeline",
    purpose:
      "Carry raw footage to a reviewable cut on its own, and hand a human the two decisions that actually need judgement: what the story is, and whether the cut works.",
    status: "active",
    trigger: "Raw footage delivered to the ingest folder",
    outputs: ["Rough cut", "Captions", "Export-ready timeline"],
    integrations: [
      "Transcription",
      "Scene detection",
      "LLM reasoning",
      "Media store",
      "Editor timeline",
    ],
    tags: ["transcribe", "cut", "caption"],
    icon: "film",
    accent: "#FF8A3D",
    agents: [
      {
        id: "ingest-agent",
        name: "Ingest Agent",
        role: "Normalises, names and indexes everything that arrives.",
        input: "Raw media files",
        logic: [
          "Which files belong to this shoot?",
          "Is anything unusable — no audio, wrong frame rate, corrupt?",
        ],
        output: "Indexed media library",
        capabilities: ["File normalisation", "Indexing", "Quality flags"],
      },
      {
        id: "transcript-agent",
        name: "Transcription Agent",
        role: "Produces the time-coded transcript the rest of the pipeline searches.",
        input: "Indexed media",
        logic: ["Speaker separation", "Confidence on unclear audio"],
        output: "Time-coded transcript",
        capabilities: ["Transcription", "Speaker separation"],
      },
      {
        id: "highlight-agent",
        name: "Highlight Agent",
        role: "Finds the moments worth keeping.",
        input: "Transcript and scene boundaries",
        logic: [
          "Which passages carry a complete thought?",
          "Where does the energy actually change?",
          "What is repetition of something already covered?",
        ],
        output: "Ranked highlight list",
        capabilities: ["Passage ranking", "Repetition removal"],
      },
      {
        id: "assembly-agent",
        name: "Assembly Agent",
        role: "Builds the rough cut and lays in captions and b-roll.",
        input: "Highlight list, media library",
        logic: [
          "Does the order hold together without the missing shots?",
          "Where does a cut need covering?",
        ],
        output: "Rough cut timeline",
        capabilities: ["Timeline assembly", "Captioning", "B-roll cover"],
      },
    ],
    steps: [
      {
        id: "ingest",
        name: "Ingest",
        description: "Normalise, name and index every file from the shoot.",
        agent: "ingest-agent",
        input: "Raw footage",
        output: "Indexed media library",
        automated: true,
      },
      {
        id: "transcribe",
        name: "Transcribe",
        description: "Produce a time-coded, speaker-separated transcript.",
        agent: "transcript-agent",
        input: "Indexed media",
        output: "Transcript",
        automated: true,
      },
      {
        id: "scenes",
        name: "Scene detection",
        description: "Mark the cuts, camera changes and dead air.",
        input: "Indexed media",
        output: "Scene boundaries",
        automated: true,
      },
      {
        id: "highlights",
        name: "Highlight extraction",
        description:
          "Rank the passages that carry a complete thought and drop the repeats.",
        agent: "highlight-agent",
        input: "Transcript and scene boundaries",
        output: "Ranked highlight list",
        automated: true,
      },
      {
        id: "rough-cut",
        name: "Rough cut",
        description: "Assemble the highlights into a timeline in a defensible order.",
        agent: "assembly-agent",
        input: "Highlight list",
        output: "Rough cut",
        automated: true,
      },
      {
        id: "captions",
        name: "Captions",
        description: "Burn in captions from the transcript, timed to the cut.",
        agent: "assembly-agent",
        input: "Rough cut and transcript",
        output: "Captioned timeline",
        automated: true,
      },
      {
        id: "broll",
        name: "B-roll",
        description: "Cover the joins with footage pulled from the indexed library.",
        agent: "assembly-agent",
        input: "Captioned timeline",
        output: "Covered timeline",
        automated: true,
      },
      {
        id: "final-review",
        name: "Final review",
        description:
          "A human watches it. This is the step the pipeline exists to make cheap.",
        input: "Covered timeline",
        output: "Approved cut or notes",
        automated: false,
      },
      {
        id: "export",
        name: "Export",
        description: "Render the delivery formats each destination needs.",
        input: "Approved cut",
        output: "Delivered files",
        automated: true,
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────────── */
  {
    id: "intelligence",
    name: "Intelligence",
    shortName: "Intelligence",
    category: "Second Brain pipeline",
    tagline: "Retrieval-backed knowledge system",
    purpose:
      "Hold everything the business already knows in one retrievable place, and answer from it with the source attached, so an answer can be checked rather than trusted.",
    status: "active",
    trigger: "A document lands in a connected source, or a question is asked",
    outputs: ["Cited answers", "Summaries", "Retrievable memory"],
    integrations: [
      "Document sources",
      "Vector store",
      "Metadata index",
      "LLM reasoning",
      "Automation runner",
    ],
    tags: ["capture", "retrieve", "answer"],
    icon: "brain",
    accent: "#FF6A55",
    agents: [
      {
        id: "ingest-brain",
        name: "Ingest Agent",
        role: "Watches the connected sources and pulls in what is new or changed.",
        input: "Connected document sources",
        logic: [
          "Is this new, or a revision of something already held?",
          "Is the content extractable, or does it need conversion?",
        ],
        output: "Normalised documents",
        capabilities: ["Source watching", "Change detection", "Format conversion"],
      },
      {
        id: "classifier",
        name: "Classification Agent",
        role: "Decides what a document is and who it concerns.",
        input: "Normalised documents",
        logic: [
          "Type of document",
          "Which account, project or subject it belongs to",
          "Whether it supersedes something already stored",
        ],
        output: "Classified document with metadata",
        capabilities: ["Type tagging", "Subject routing", "Supersede check"],
      },
      {
        id: "retriever",
        name: "Retrieval Agent",
        role: "Assembles the context a question actually needs.",
        input: "A question",
        logic: [
          "What is the question really asking?",
          "Which passages are relevant rather than merely similar?",
          "Is the retrieved set contradictory or out of date?",
        ],
        output: "Assembled context with sources",
        capabilities: ["Query reading", "Passage retrieval", "Conflict check"],
      },
      {
        id: "responder",
        name: "Response Agent",
        role: "Answers from the retrieved context, and says so when it can't.",
        input: "Question and assembled context",
        logic: [
          "Does the context support an answer at all?",
          "Which source backs each part of the answer?",
          "What is missing that the asker should know is missing?",
        ],
        output: "Cited answer, or an explicit gap",
        capabilities: ["Context grounding", "Citation", "Gap reporting"],
      },
    ],
    steps: [
      {
        id: "capture",
        name: "Capture",
        description:
          "Take in notes, documents, threads and pages from the connected sources.",
        input: "Documents, notes, threads",
        output: "Captured items",
        automated: true,
      },
      {
        id: "ingest-brain-step",
        name: "Ingest",
        description: "Normalise formats and detect what has actually changed.",
        agent: "ingest-brain",
        input: "Captured items",
        output: "Normalised documents",
        automated: true,
      },
      {
        id: "classify",
        name: "Classify",
        description: "Tag type, subject and ownership, and mark what is superseded.",
        agent: "classifier",
        input: "Normalised documents",
        output: "Classified documents",
        automated: true,
      },
      {
        id: "embed",
        name: "Embed",
        description: "Chunk and embed the content so it can be retrieved by meaning.",
        input: "Classified documents",
        output: "Embeddings",
        automated: true,
      },
      {
        id: "store",
        name: "Store",
        description:
          "Write vectors and metadata to the knowledge layer as one addressable store.",
        input: "Embeddings and metadata",
        output: "Knowledge store entry",
        automated: true,
      },
      {
        id: "retrieve",
        name: "Retrieve",
        description:
          "Assemble the passages a question needs, and notice when they disagree.",
        agent: "retriever",
        input: "A question",
        output: "Assembled context",
        automated: true,
      },
      {
        id: "generate",
        name: "Generate",
        description:
          "Answer from that context with the sources attached — or say what is missing.",
        agent: "responder",
        input: "Question and context",
        output: "Cited answer",
        automated: true,
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────────── */
  {
    id: "customer",
    name: "Customer",
    shortName: "Customer",
    category: "Interior Design pipeline",
    tagline: "Concept-to-visualisation pipeline",
    purpose:
      "Carry a room from photographs and a brief to a costed, visualised concept, so the iteration happens on images instead of on invoices.",
    status: "active",
    trigger: "A room brief with site photographs and dimensions",
    outputs: ["Concept boards", "Material schedule", "Rendered visualisation"],
    integrations: [
      "Image understanding",
      "LLM reasoning",
      "Reference library",
      "Image generation",
      "Document store",
    ],
    tags: ["analyse", "concept", "render"],
    icon: "ruler",
    accent: "#E8598C",
    agents: [
      {
        id: "space-agent",
        name: "Space Agent",
        role: "Reads the room from photographs and dimensions.",
        input: "Site photographs, measurements",
        logic: [
          "Where does the light come from, and when?",
          "What is fixed and cannot move?",
          "What is the room actually used for?",
        ],
        output: "Space analysis",
        capabilities: ["Room understanding", "Dimensions", "Fixed constraints"],
      },
      {
        id: "style-agent",
        name: "Style Agent",
        role: "Extracts a style direction from what the client responds to.",
        input: "Client references and brief",
        logic: [
          "Which properties recur across the references?",
          "Which are aspiration rather than direction?",
          "What does the existing architecture allow?",
        ],
        output: "Style direction",
        capabilities: ["Reference reading", "Direction extraction", "Material direction"],
      },
      {
        id: "concept-agent",
        name: "Concept Agent",
        role: "Turns analysis and direction into a coherent concept.",
        input: "Space analysis, style direction",
        logic: [
          "Does the concept survive the fixed constraints?",
          "What is the single organising idea?",
        ],
        output: "Concept and moodboard",
        capabilities: ["Layout", "Lighting", "Materials"],
      },
      {
        id: "viz-agent",
        name: "Visualisation Agent",
        role: "Renders the concept in the actual room.",
        input: "Concept, layout, materials",
        logic: [
          "Does the render match the real geometry?",
          "Are the materials shown the ones specified?",
        ],
        output: "Rendered visualisation",
        capabilities: ["Image generation", "Iteration", "Comparison"],
      },
    ],
    steps: [
      {
        id: "space-analysis",
        name: "Space analysis",
        description:
          "Read light, geometry, fixed constraints and current use from the site material.",
        agent: "space-agent",
        input: "Photographs and dimensions",
        output: "Space analysis",
        automated: true,
      },
      {
        id: "style-extraction",
        name: "Style extraction",
        description:
          "Find the properties the client's references actually share.",
        agent: "style-agent",
        input: "Client references",
        output: "Style direction",
        automated: true,
      },
      {
        id: "reference-research",
        name: "Reference research",
        description: "Pull comparable work and precedent for the direction chosen.",
        agent: "style-agent",
        input: "Style direction",
        output: "Reference set",
        automated: true,
      },
      {
        id: "concept",
        name: "Concept",
        description: "Commit to one organising idea and build the board around it.",
        agent: "concept-agent",
        input: "Analysis, direction, references",
        output: "Concept and moodboard",
        automated: false,
      },
      {
        id: "materials",
        name: "Materials",
        description: "Specify finishes and fittings, and schedule them.",
        input: "Concept",
        output: "Material schedule",
        automated: false,
      },
      {
        id: "layout",
        name: "Layout",
        description: "Place everything against the real geometry and circulation.",
        input: "Concept and material schedule",
        output: "Layout plan",
        automated: false,
      },
      {
        id: "visualisation",
        name: "Visualisation",
        description: "Render the concept into the actual room, not a generic one.",
        agent: "viz-agent",
        input: "Layout and materials",
        output: "Rendered visualisation",
        automated: true,
      },
      {
        id: "iteration",
        name: "Iteration",
        description:
          "Feed the client's reaction back in. This loop is the point of the pipeline.",
        input: "Client feedback",
        output: "Revised concept",
        automated: false,
      },
    ],
  },

  /* ─── In build ─────────────────────────────────────────────────────────
     Back Office and Deals are scaffolds. The other five departments each run
     a Ziiro pipeline that exists; these two are here so the map shows the
     shape of a business rather than only the parts already automated, and
     they carry status "in-build" so every count that says "runs today"
     excludes them. Replace their steps and agents with the real ones —
     nothing else in the section needs touching. */
  {
    id: "back-office",
    name: "Back Office",
    shortName: "Back Office",
    category: "Reporting pipeline",
    tagline: "Outcome reporting pipeline",
    purpose:
      "Take the numbers a business already produces and turn them into the same report, on time, without anyone assembling it by hand.",
    status: "in-build",
    trigger: "A reporting period closing",
    outputs: ["Period report", "Metric history"],
    integrations: ["Business data", "Metric store", "LLM reasoning"],
    tags: ["collect", "compute", "narrate"],
    icon: "chart",
    accent: "#C96BC0",
    agents: [
      {
        id: "collect",
        name: "Collection Agent",
        role: "Pulls the period's figures from wherever they live.",
        input: "Period definition",
        logic: ["Is every source in for the period?", "Has anything been restated?"],
        output: "Raw period data",
        capabilities: ["Source pull", "Completeness check"],
      },
      {
        id: "metric",
        name: "Metric Agent",
        role: "Computes the measures against their definitions, the same way each time.",
        input: "Raw period data",
        logic: ["Does the definition still hold?", "Which movements are outside normal range?"],
        output: "Computed metrics",
        capabilities: ["Computation", "Variance check"],
      },
      {
        id: "narrate",
        name: "Narrative Agent",
        role: "Says what changed and what it looks like it was caused by.",
        input: "Computed metrics",
        logic: ["What actually moved?", "What is noise?"],
        output: "Period report",
        capabilities: ["Narrative", "Highlighting"],
      },
    ],
    steps: [
      { id: "collect-step", name: "Collect", description: "Pull the period's figures from every connected source.", agent: "collect", input: "Period definition", output: "Raw period data", automated: true },
      { id: "normalise", name: "Normalise", description: "Put every source on the same definitions and the same calendar.", input: "Raw period data", output: "Normalised data", automated: true },
      { id: "compute", name: "Compute", description: "Calculate the measures and flag anything outside normal range.", agent: "metric", input: "Normalised data", output: "Computed metrics", automated: true },
      { id: "narrate-step", name: "Narrate", description: "Write what moved, and what it appears to have been caused by.", agent: "narrate", input: "Computed metrics", output: "Period report", automated: true },
    ],
  },
  {
    id: "sales",
    name: "Sales",
    shortName: "Sales",
    category: "Lead Generation pipeline",
    tagline: "AI-powered outbound pipeline",
    purpose:
      "Discover, enrich, qualify and route high-intent prospects into the sales pipeline, so the only accounts a human touches are the ones worth touching.",
    status: "active",
    trigger: "A target segment definition, or a new account entering the ICP",
    outputs: ["Qualified lead record", "Personalised outreach", "CRM entry"],
    integrations: [
      "Web search",
      "Company data",
      "LLM reasoning",
      "Email / messaging",
      "CRM",
      "Automation runner",
    ],
    tags: ["discover", "qualify", "outreach"],
    icon: "search",
    accent: "#B061D8",
    agents: [
      {
        id: "research",
        name: "Research Agent",
        role: "Finds and validates prospects against the target definition.",
        input: "Segment definition, exclusion list",
        logic: [
          "Does the company match the segment on size, sector and geography?",
          "Is the record a duplicate of something already in the pipeline?",
          "Is there a named person in the right role?",
        ],
        output: "Validated company and contact records",
        capabilities: ["Source search", "Segment match", "Deduplication"],
      },
      {
        id: "enrichment",
        name: "Enrichment Agent",
        role: "Builds the company and contact context the rest of the pipeline reasons over.",
        input: "Validated company and contact records",
        logic: [
          "Which public signals describe what this company is doing now?",
          "What is the contact accountable for?",
          "Which facts are stale enough to re-fetch?",
        ],
        output: "Enriched account profile",
        capabilities: ["Company profile", "Contact profile", "Signal capture"],
      },
      {
        id: "qualification",
        name: "Qualification Agent",
        role: "Scores each prospect against the ideal customer profile.",
        input: "Enriched account profile",
        logic: [
          "ICP fit",
          "Company size and stage",
          "Industry",
          "Role and seniority",
          "Observable intent",
          "Existing relationship",
        ],
        output: "Lead score, with the reason for the score",
        capabilities: ["ICP scoring", "Intent read", "Score reasoning"],
      },
      {
        id: "personalisation",
        name: "Personalisation Agent",
        role: "Writes the opening on the evidence, not on a template.",
        input: "Enriched profile, qualification reason",
        logic: [
          "Which single observation is worth leading with?",
          "What is the plausible cost of the problem to this account?",
          "Does the message survive being read by the person named in it?",
        ],
        output: "Contextual outreach message",
        capabilities: ["Evidence pick", "Message draft", "Tone check"],
      },
      {
        id: "outreach",
        name: "Outreach Agent",
        role: "Executes and paces the send across channels.",
        input: "Approved message, channel preferences",
        logic: [
          "Which channel has a reply history for this segment?",
          "Is the account already in an active sequence?",
          "Send window and volume ceiling",
        ],
        output: "Sent outreach, delivery state",
        capabilities: ["Channel choice", "Send pacing", "Delivery state"],
      },
      {
        id: "followup",
        name: "Follow-up Agent",
        role: "Runs the follow-up logic and knows when to stop.",
        input: "Delivery and reply state",
        logic: [
          "Has the contact replied, opened, or gone silent?",
          "Has the sequence earned another touch?",
          "Does anything here need a human?",
        ],
        output: "Next action, or an exit from the sequence",
        capabilities: ["Reply detection", "Sequence logic", "Human handoff"],
      },
    ],
    steps: [
      {
        id: "discover",
        name: "Discover",
        description:
          "Find companies and people that match the target definition across public sources.",
        agent: "research",
        input: "Segment definition",
        output: "Raw prospect list",
        automated: true,
      },
      {
        id: "enrich",
        name: "Enrich",
        description:
          "Attach company and contact intelligence to every record on the list.",
        agent: "enrichment",
        input: "Raw prospect list",
        output: "Enriched account profiles",
        automated: true,
      },
      {
        id: "research-step",
        name: "Research",
        description:
          "Read what the account is actually doing right now, rather than what its category says it does.",
        agent: "research",
        input: "Enriched account profiles",
        output: "Account context notes",
        automated: true,
      },
      {
        id: "score",
        name: "Score",
        description:
          "Rank each prospect against the ideal customer profile, and record why.",
        agent: "qualification",
        input: "Account context notes",
        output: "Lead score and reasoning",
        automated: true,
      },
      {
        id: "personalise",
        name: "Personalise",
        description:
          "Draft an opening built on one specific observation about the account.",
        agent: "personalisation",
        input: "Scored account with context",
        output: "Draft outreach message",
        automated: true,
      },
      {
        id: "outreach-step",
        name: "Outreach",
        description:
          "Send on the channel with a reply history, within the volume ceiling.",
        agent: "outreach",
        input: "Approved message",
        output: "Sent outreach",
        automated: true,
      },
      {
        id: "follow-up",
        name: "Follow up",
        description:
          "Work the sequence until there is a reply, a clear no, or a reason to hand over.",
        agent: "followup",
        input: "Delivery and reply state",
        output: "Next action or sequence exit",
        automated: true,
      },
      {
        id: "crm",
        name: "CRM",
        description:
          "Create or update the lead record so the pipeline is the source of truth, not someone's inbox.",
        input: "Full interaction history",
        output: "Lead record",
        automated: true,
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────────── */
  {
    id: "deals",
    name: "Deals",
    shortName: "Deals",
    category: "Pipeline not yet defined",
    tagline: "Pipeline progression",
    purpose:
      "Keep every live opportunity moving: replies read and routed, calls prepared and summarised, next actions never left to memory.",
    status: "in-build",
    trigger: "A reply landing, or a call finishing",
    outputs: ["Routed reply", "Call summary", "Next action"],
    integrations: ["Email / messaging", "Call transcription", "CRM"],
    tags: ["replies", "calls", "closing"],
    icon: "compass",
    accent: "#9A63E8",
    agents: [
      {
        id: "sweep",
        name: "Sweep Agent",
        role: "Finds the material the question will be answered from.",
        input: "The question, and what is already known",
        logic: [
          "Which sources carry primary evidence?",
          "What has already been covered internally?",
        ],
        output: "Candidate source set",
        capabilities: ["Source sweep", "Deduplication"],
      },
      {
        id: "extract",
        name: "Extraction Agent",
        role: "Pulls the claims out and keeps them attached to their source.",
        input: "Candidate source set",
        logic: ["Which passages actually answer the question?", "Is the source primary?"],
        output: "Claims with citations",
        capabilities: ["Claim extraction", "Citation binding"],
      },
      {
        id: "synthesise",
        name: "Synthesis Agent",
        role: "Writes the brief, and says where the evidence runs out.",
        input: "Claims with citations",
        logic: ["Do the sources agree?", "What is still unanswered?"],
        output: "Sourced brief",
        capabilities: ["Synthesis", "Gap reporting"],
      },
    ],
    steps: [
      { id: "intake", name: "Intake", description: "Frame the question and what a good answer would look like.", input: "A question", output: "Framed question", automated: false },
      { id: "sweep-step", name: "Sweep", description: "Gather candidate sources from inside and outside the business.", agent: "sweep", input: "Framed question", output: "Source set", automated: true },
      { id: "extract-step", name: "Extract", description: "Pull the claims out, each one still attached to its source.", agent: "extract", input: "Source set", output: "Claims with citations", automated: true },
      { id: "synthesise-step", name: "Synthesise", description: "Write the brief, and mark where the evidence stops.", agent: "synthesise", input: "Claims with citations", output: "Sourced brief", automated: true },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    shortName: "Marketing",
    category: "Content Generation pipeline",
    tagline: "Research-led content pipeline",
    purpose:
      "Take a subject from an unformed idea to a published piece, with the research and the fact-check as pipeline steps rather than as good intentions.",
    status: "active",
    trigger: "A subject, a keyword, or a recurring publishing slot",
    outputs: ["Published piece", "Source list", "Distribution-ready variants"],
    integrations: [
      "Web search",
      "LLM reasoning",
      "Document store",
      "Publishing target",
      "Automation runner",
    ],
    tags: ["research", "write", "publish"],
    icon: "pen",
    accent: "#8C6AFF",
    agents: [
      {
        id: "researcher",
        name: "Research Agent",
        role: "Gathers and cites the material the piece will stand on.",
        input: "Subject or keyword",
        logic: [
          "What is already established, and by whom?",
          "Which claims have a primary source?",
          "Where does the existing coverage stop?",
        ],
        output: "Source set with citations",
        capabilities: ["Source gathering", "Citation capture", "Coverage gap"],
      },
      {
        id: "strategist",
        name: "Content Strategist",
        role: "Chooses the angle and decides what the piece is for.",
        input: "Source set, audience definition",
        logic: [
          "Who is this for and what do they already believe?",
          "What is the one claim worth arguing?",
          "What has been said too often to repeat?",
        ],
        output: "Angle and outline",
        capabilities: ["Audience read", "Angle choice", "Outline"],
      },
      {
        id: "writer",
        name: "Writer",
        role: "Turns the outline into a draft in the house voice.",
        input: "Angle and outline",
        logic: [
          "Does every section carry the argument forward?",
          "Is any sentence there only to fill the shape?",
        ],
        output: "First draft",
        capabilities: ["Drafting", "House voice"],
      },
      {
        id: "editor",
        name: "Editor",
        role: "Cuts, restructures, and holds the line on the voice.",
        input: "First draft",
        logic: [
          "What can be removed without losing the argument?",
          "Does the opening earn the second paragraph?",
        ],
        output: "Edited draft",
        capabilities: ["Structural edit", "Cutting"],
      },
      {
        id: "factchecker",
        name: "Fact Checker",
        role: "Checks every claim back to a source before anything ships.",
        input: "Edited draft, source set",
        logic: [
          "Is each claim traceable to a source?",
          "Has any number drifted from what the source says?",
          "Is anything asserted that no source supports?",
        ],
        output: "Verified draft, or a list of claims to fix",
        capabilities: ["Claim tracing", "Number checking"],
      },
      {
        id: "publisher",
        name: "Publisher",
        role: "Formats, schedules and distributes the finished piece.",
        input: "Verified draft",
        logic: [
          "Which surface is this piece for?",
          "What does it need to be cut down into?",
        ],
        output: "Published piece and variants",
        capabilities: ["Formatting", "Scheduling", "Variants"],
      },
    ],
    steps: [
      {
        id: "idea",
        name: "Idea",
        description: "Capture the subject and what makes it worth writing.",
        input: "Subject or keyword",
        output: "Framed idea",
        automated: false,
      },
      {
        id: "research",
        name: "Research",
        description: "Gather primary material and record where each claim came from.",
        agent: "researcher",
        input: "Framed idea",
        output: "Source set with citations",
        automated: true,
      },
      {
        id: "angle",
        name: "Angle",
        description:
          "Decide the one argument the piece makes, and what it deliberately leaves out.",
        agent: "strategist",
        input: "Source set",
        output: "Chosen angle",
        automated: true,
      },
      {
        id: "outline",
        name: "Outline",
        description: "Structure the argument before a sentence gets written.",
        agent: "strategist",
        input: "Chosen angle",
        output: "Section outline",
        automated: true,
      },
      {
        id: "script",
        name: "Script",
        description:
          "Draft the spoken or on-screen version where the piece has one.",
        agent: "writer",
        input: "Section outline",
        output: "Script",
        automated: true,
      },
      {
        id: "draft",
        name: "Draft",
        description: "Write the full piece in the house voice.",
        agent: "writer",
        input: "Outline and script",
        output: "First draft",
        automated: true,
      },
      {
        id: "review",
        name: "Review",
        description:
          "Edit for structure and voice, then check every claim back to its source.",
        agent: "factchecker",
        input: "First draft",
        output: "Verified draft",
        automated: false,
      },
      {
        id: "publish",
        name: "Publish",
        description: "Format, schedule, and cut the variants each surface needs.",
        agent: "publisher",
        input: "Verified draft",
        output: "Published piece",
        automated: true,
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────────── */
];

/** Small helpers the views share. */
export const findPipeline = (id: string) =>
  PIPELINES.find((p) => p.id === id) ?? PIPELINES[0];

export const findAgent = (pipeline: Pipeline, agentId?: string) =>
  agentId ? pipeline.agents.find((a) => a.id === agentId) : undefined;

/**
 * Everything the section header states, counted off the data rather than typed
 * into a string. A "job" is one discrete unit of work — a capability an agent
 * has, or a step a pipeline runs — which is the same thing every dot on the
 * outer rings of the map represents.
 *
 * The point of deriving these is that they cannot drift and cannot overstate:
 * add a pipeline and the header updates, mark one in-build and it drops out of
 * "runs today" on its own.
 */
export const DIRECTORY_STATS = {
  departments: PIPELINES.length,
  live: PIPELINES.filter((p) => p.status === "active").length,
  agents: PIPELINES.reduce((n, p) => n + p.agents.length, 0),
  jobs: PIPELINES.reduce(
    (n, p) =>
      n +
      p.steps.length +
      p.agents.reduce((m, a) => m + a.capabilities.length, 0),
    0,
  ),
  liveJobs: PIPELINES.filter((p) => p.status === "active").reduce(
    (n, p) =>
      n +
      p.steps.length +
      p.agents.reduce((m, a) => m + a.capabilities.length, 0),
    0,
  ),
};
