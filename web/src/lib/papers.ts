export type Paper = {
  id: string;
  kind: "attack" | "defense";
  title: string;
  short: string;
  venue: string;
  year: string;
  url: string;
  tag: string;
  note: string;
};

// Verified against the source pages (titles fetched during curation).
export const PAPERS: Paper[] = [
  {
    id: "inceptionrag",
    kind: "attack",
    title: "Stealthy Poisoning Attack Against Retrieval-Augmented Generation",
    short: "InceptionRAG",
    venue: "arXiv",
    year: "2026",
    url: "https://arxiv.org/abs/2609.16818",
    tag: "2609.16818",
    note: "Indirect logic induction via proxy entities, zeroth-order suffix optimization, and the HODOR defense.",
  },
  {
    id: "micro-collab",
    kind: "attack",
    title: "A Distributed Attack on RAG Systems",
    short: "Micro-Collaborative Poisoning",
    venue: "arXiv",
    year: "2026",
    url: "https://arxiv.org/abs/2609.21573",
    tag: "2609.21573",
    note: "Five complementary rhetorical roles, anchor terms, and the Document Poisoning Assessment Rate metric.",
  },
  {
    id: "poisonedrag",
    kind: "attack",
    title: "Knowledge Corruption Attacks to Retrieval-Augmented Generation of LLMs",
    short: "PoisonedRAG",
    venue: "USENIX Security",
    year: "2025",
    url: "https://arxiv.org/abs/2402.07867",
    tag: "2402.07867",
    note: "Formalizes the attack as P = S ⊕ I and optimizes the retrieval signal with HotFlip.",
  },
  {
    id: "raguard",
    kind: "defense",
    title: "A Layered Defense Framework for Retrieval-Augmented Generation Systems Against Data Poisoning",
    short: "RAGuard",
    venue: "arXiv",
    year: "2026",
    url: "https://arxiv.org/abs/2607.26339",
    tag: "2607.26339",
    note: "Query paraphrasing with multi-signal scoring across semantic, lexical, consistency, and uncertainty axes.",
  },
  {
    id: "revprag",
    kind: "defense",
    title: "Revealing Poisoning Attacks in Retrieval-Augmented Generation through LLM Activation Analysis",
    short: "RevPRAG",
    venue: "arXiv",
    year: "2024",
    url: "https://arxiv.org/abs/2411.18948",
    tag: "2411.18948",
    note: "Response-level detection from hidden states, reporting 98% TPR at roughly 1% FPR.",
  },
  {
    id: "pra-rag",
    kind: "defense",
    title: "Provably Robust Aggregation in Retrieval-Augmented Generation against Retrieval Corruption",
    short: "PRA-RAG",
    venue: "ACL Findings",
    year: "2026",
    url: "https://aclanthology.org/2026.findings-acl.1794",
    tag: "findings-acl.1794",
    note: "Minimum-radius enclosing-ball geometric aggregation over subset embeddings under an accuracy constraint.",
  },
];

export const ATTACK_PAPERS = PAPERS.filter((p) => p.kind === "attack");
export const DEFENSE_PAPERS = PAPERS.filter((p) => p.kind === "defense");
