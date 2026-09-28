# Master Research Document

## Project: Collaborative Signal Detection Layer for RAG Systems


## 1. Project Summary (For All Agents)

**Problem:** Retrieval-Augmented Generation (RAG) systems are vulnerable to data poisoning, where malicious content is injected into the knowledge base to manipulate LLM outputs. State-of-the-art defenses (RAGShield, RAGuard, PRA-RAG) now achieve near-0% Attack Success Rate (ASR) against single-document and even adaptive single-source poisoning. However, a newly disclosed attack class — **distributed/collaborative poisoning** — spreads malicious signal across multiple individually-benign-looking documents that only become dangerous when retrieved together, defeating every current defense's core assumption (that poisoning shows up in one suspicious document).

**Our Gap:** No published defense currently detects poisoning that emerges from the *combination* of multiple benign-looking documents rather than from any single suspicious one. RAGShield's own authors explicitly call unresolved insider/in-place document manipulation "the fundamental limit of ingestion-time defense."

**Our Proposed Solution:** A Collaborative Signal Detection Layer using cross-document consistency scoring, retrieval co-occurrence tracking, provenance-aware cluster aggregation, and adaptive risk scoring — applied to the *retrieved document set as a whole*, not per-document.

---

## 2. Attack Papers (Chronological)

## Paper: PoisonedRAG: Knowledge Corruption Attacks to Retrieval-Augmented Generation

**Citation:** W. Zou, R. Geng, B. Wang, J. Jia, "PoisonedRAG: Knowledge Corruption Attacks to Retrieval-Augmented Generation of Large Language Models," Proc. USENIX Security Symposium, 2024.

**Type:** Attack

**Date:** 2024

**Problem Solved:** Demonstrates that RAG systems can be manipulated to generate attacker-chosen answers by injecting a small number of malicious texts into the knowledge database.

**Methodology:**

- Injects 5 malicious texts into a knowledge database containing millions of documents.
- Black-box and gray-box threat models tested.
- Evaluated on standard QA benchmarks.

**Key Results:** 90% attack success rate with only 5 injected texts.

**Explicit Limitation (quoted):** Existing defenses (perplexity-based detection) shown to perform near random chance (AUC 0.25–0.30 in black-box settings).

**Relevance to Our Gap:** Foundational single/few-document attack; does not address distributed collaborative poisoning. Establishes the baseline threat model our project extends.

**Quotable Sentence:** "This work proposes PoisonedRAG, the first knowledge corruption attack to RAG, where an attacker could inject a few malicious texts into the knowledge database of a RAG system to induce an LLM to generate an attacker-chosen target answer."

---

## Paper: GraphRAG under Fire (GragPoison)

**Citation:** [Authors], "GraphRAG under Fire," arXiv:2501.14050, 2025.

**Type:** Attack

**Date:** 2025

**Problem Solved:** Shows GraphRAG systems (knowledge-graph-based RAG) are vulnerable to poisoning that exploits shared relations in the knowledge graph, affecting multiple queries simultaneously.

**Methodology:** Crafts poisoning text exploiting graph topology to compromise multiple queries at once via shared relational structure.

**Key Results:** Perplexity-based detection achieves AUC of only 0.53 (near random) against GPT-4o-generated poisoning text; detecting 80% of poisoning requires incorrectly flagging 60% of clean text.

**Explicit Limitation (quoted):** Perplexity-based detection described as "largely ineffective."

**Relevance to Our Gap:** Confirms detection-based defenses fail broadly, not just against PoisonedRAG-style attacks; extends threat to graph-structured RAG.

---

## Paper: InceptionRAG: Stealthy Poisoning Attack Against Retrieval-Augmented Generation

**Citation:** [Authors], "InceptionRAG: Stealthy Poisoning Attack Against Retrieval-Augmented Generation," arXiv:2609.16818, 2026.

**Type:** Attack

**Date:** September 2026 (FRESH — within 30 days)

**Problem Solved:** Designs a poisoning attack specifically engineered to evade attention-based detection mechanisms.

**Methodology:** Stealthy document crafting tested across 3 datasets and 3 LLMs under adversarial constraints.

**Key Results:** 80%+ overall ASR; 72.3% ASR even against attention-based defense specifically — roughly 4x stronger than baseline attacks (16.7% ASR).

**Explicit Limitation (quoted):** No defense currently published that specifically counters this method — the paper's own framing positions it as "effectively bypassing established defenses."

**Relevance to Our Gap:** Direct evidence that attack sophistication has outpaced defense research within the same year (2026).

---

## Paper: Micro-Collaborative Poisoning: A Distributed Attack on RAG Systems

**Citation:** [Authors], "Micro-Collaborative Poisoning: A Distributed Attack on RAG Systems," arXiv:2609.21573, 2026.

**Type:** Attack — **CORE PROBLEM PAPER FOR THIS PROJECT**

**Date:** September 2026 (FRESH — within 30 days)

**Problem Solved:** Demonstrates that multiple individually-innocent-looking documents can collaboratively corrupt RAG knowledge bases while evading detection, because no single document appears suspicious.

**Methodology:** Distributes malicious signal across many documents rather than concentrating it in one; tested across 108 separate trials against existing RAG defenses.

**Key Results:** Successfully evaded detection across all 108 tests.

**Explicit Limitation (quoted):** The authors note defenders "should also consider weaker signals distributed across multiple passages, the balance between clean and poisoned sources, and the possibility that several individually plausible documents can collaborate" — implying no existing method accounts for this.

**Relevance to Our Gap:** THIS IS THE ATTACK OUR PROJECT DIRECTLY ADDRESSES. Zero dedicated countermeasure exists yet.

**Quotable Sentence:** "Several individually plausible documents can collaborate [to poison a RAG system], evading detection methods designed around single-document anomaly assumptions."

---

## Paper: RAG-Narok (Retrieval-Aware Knowledge Corpus Poisoning)

**Citation:** [Authors], "Retrieval-Aware Knowledge Corpus Poisoning in RAG," arXiv:2609.25469, 2026.

**Type:** Attack

**Date:** September 2026 (FRESH)

**Problem Solved:** Poisoning technique using retriever fingerprinting and synthesized documents targeting domain-specific corpora (legal, financial, cybersecurity).

**Methodology:** Evaluates retrieval dominance, defense evasion, and generation influence across three heterogeneous domain corpora.

**Key Results:** Up to 88.37% anomaly-detection evasion; achieves first-position retrieval ranking for poisoned documents.

**Relevance to Our Gap:** Shows domain-specific corpora (not just generic QA datasets) are also vulnerable — relevant if we extend evaluation to specialized domains.

---

## Paper: Corpus-Dependent Poisoning Attacks and Defenses in RAG Systems

**Citation:** [Authors], "Corpus-Dependent Poisoning Attacks and Defenses in RAG Systems," arXiv:2603.18034, 2026.

**Type:** Attack + Defense

**Date:** 2026

**Problem Solved:** Studies GCG-optimized gradient-guided poisoning and tests architectural defenses.

**Methodology:** Dual-document (sleeper-trigger) attack on dense vector retrievers; tests simple BM25+vector hybrid retrieval as a defense.

**Key Results:** 38% co-retrieval success on pure vector retrieval; hybrid BM25+vector defense drops this to 0%. However, attackers who jointly optimize for both sparse and dense channels regain 20–44% success.

**Explicit Limitation (quoted):** Hybrid retrieval defense "provides an effective architectural defense against gradient-guided RAG poisoning" but exploratory evidence shows corpus composition affects robustness — not a complete solution against adaptive dual-channel attackers.

**Relevance to Our Gap:** Useful building block — hybrid retrieval could be one layer of our multi-layer defense, but insufficient alone against sophisticated distributed attacks.

---

## Paper: Indelible Backdoors (ECCV 2026)

**Citation:** Guo et al., "Indelible Backdoors: On the Limits of Backdoor Removal," Proc. ECCV, 2026.

**Type:** Attack

**Date:** 2026

**Problem Solved:** Designs a backdoor specifically engineered to resist standard removal/mitigation techniques.

**Methodology:** Tested against NAD, TSBD, FST defense methods across varying defense budgets.

**Key Results:** ~99% ASR remains after defenses applied, "leaving the backdoor unremoved."

**Relevance to Our Gap:** Broader evidence that backdoor persistence, not just poisoning injection, is an unsolved problem across the field.

---

## Paper: Exploring Clean Label Backdoor Attacks and Defense in Language Models (Cbat/CbatD)

**Citation:** S. Zhao, L. A. Tuan, J. Fu, J. Wen, W. Luo, "Exploring Clean Label Backdoor Attacks and Defense in Language Models," IEEE/ACM Transactions on Audio, Speech, and Language Processing, vol. 32, pp. 3014–3024, 2024.

**Type:** Attack + Defense (IEEE)

**Date:** 2024

**Problem Solved:** Introduces a clean-label backdoor attack using text style as a hidden trigger (no external trigger word needed), plus a companion defense.

**Methodology:** Attack (Cbat) via prompt-tuning-based sentence rewriting; Defense (CbatD) locates poisoned samples via lowest training loss + feature relevance calculation.

**Key Results:** State-of-the-art ASR on clean-label benchmarks without external trigger; CbatD shows "competitive" defensive performance in text classification.

**Explicit Limitation (quoted):** CbatD's effectiveness is only "competitive," not conclusive — later work (ICLAttack) shows the broader clean-label attack family still defeats standard defenses.

**Relevance to Our Gap:** Core IEEE citation for clean-label attack lineage; establishes text-style-based triggers as a hard-to-detect attack pattern.

---

## Paper: ICLAttack (Universal Vulnerabilities in LLMs via In-Context Learning)

**Citation:** [Authors], "Universal Vulnerabilities in Large Language Models: Backdoor Attacks for In-context Learning," arXiv:2401.05949, 2024.

**Type:** Attack

**Date:** 2024

**Problem Solved:** Shows clean-label backdoors can be implanted purely via in-context learning demonstrations — no fine-tuning required.

**Methodology:** Poisons in-context example sets; tests against ONION, Back-Translation, and SCPD defenses.

**Key Results:** ONION sometimes degrades performance rather than helping; SCPD reduces attack success only at a heavy cost (12.59% drop in clean accuracy).

**Explicit Limitation (quoted):** Confirms standard NLP backdoor defenses (ONION, Back-Translation, SCPD) are "largely ineffective" against this attack family.

**Relevance to Our Gap:** Strong, specific evidence that established defenses fail even a full year after being proposed — supports the "defense proposed but still broken" gap narrative.

---

## Industry Disclosure: Dark Sourcery

**Citation:** Vigilance Security (industry disclosure), reported via GIGAZINE and The Hacker News ThreatsDay Bulletin, September 2026.

**Type:** Industry Disclosure (not peer-reviewed)

**Date:** September 24–26, 2026 (ACTIVE, ONGOING)

**Problem Solved:** N/A — this is an active attack campaign, not a research contribution.

**Methodology:** Mass-produces fake posts, PDFs, reviews, and support pages across the internet to poison what AI chatbots (ChatGPT, Gemini) and Google AI Overviews return for company information searches. Combines fake authoritative sources with fake social proof.

**Key Results:** At least 374 companies targeted (Delta, Lufthansa, JP Morgan Chase, Bank of America, Airbnb); fraudulent phone numbers and phishing pages surfaced as AI-verified answers. 91% of AI chatbot users reportedly don't verify AI-given answers.

**Explicit Limitation:** No academic defense exists — this is being covered as breaking news, not as solved research.

**Relevance to Our Gap:** Real-world validation that distributed/web-scale poisoning is an active, urgent problem beyond academic benchmarks — strong motivation section material.

---

## 3. Defense Papers (Chronological)

## Paper: RevPRAG (Knowledge Database or Poison Base?)

**Citation:** [Authors], "Knowledge Database or Poison Base? Detecting RAG Poisoning Attack Through LLM Activations," arXiv:2411.18948, 2024.

**Type:** Defense

**Date:** 2024

**Problem Solved:** Detects poisoned RAG responses by analyzing LLM internal activation patterns rather than text content.

**Methodology:** RevPRAG — flexible, automated detection pipeline leveraging LLM activations; tested across multiple benchmark datasets.

**Key Results:** 98% true positive rate with ~1% false positive rate.

**Explicit Limitation:** Detects at the response level (post-hoc), not preventive at ingestion time; not tested against distributed/collaborative multi-document attacks.

**Relevance to Our Gap:** Strong baseline for comparison; our project could test whether RevPRAG's activation-based approach holds up against Micro-Collaborative Poisoning specifically (likely a gap since it wasn't designed for this).

---

## Paper: RAGForensics

**Citation:** [Authors], "Traceback of Poisoning Attacks to Retrieval-Augmented Generation," arXiv:2504.21668, 2025.

**Type:** Defense (Forensic/Reactive)

**Date:** 2025

**Problem Solved:** First traceback system identifying which specific documents in a knowledge database caused a poisoning attack.

**Methodology:** RAGForensics — automated forensic pipeline for post-attack investigation.

**Key Results:** Successfully identifies poisoned texts responsible for attacks in tested scenarios.

**Explicit Limitation:** Reactive/forensic (after attack occurred), not preventive; not evaluated against multi-document collaborative attacks.

**Relevance to Our Gap:** Methodological inspiration for building traceback into our detection layer, but doesn't solve prevention.

---

## Paper: FilterRAG / ML-FilterRAG

**Citation:** K. Edemacu, V. M. Shashidhar, M. Tuape, D. Abudu, B. Jang, J. W. Kim, "Defending Against Knowledge Poisoning Attacks During Retrieval-Augmented Generation," arXiv:2508.02835, 2025.

**Type:** Defense

**Date:** August 2025

**Problem Solved:** Filters retrieved texts based on distinguishing properties between adversarial and clean content.

**Methodology:** ML-based filtering methods evaluated on benchmark datasets.

**Key Results:** Performance close to original unpoisoned RAG system baseline.

**Explicit Limitation:** Not tested against stealthy distributed/collaborative poisoning patterns.

**Relevance to Our Gap:** Useful per-document filtering component, but per earlier analysis, per-document approaches are exactly what Micro-Collaborative Poisoning is designed to defeat.

---

## Paper: RAGShield

**Citation:** [Authors], "RAGShield: Provenance-Verified Defense-in-Depth for Retrieval-Augmented Generation," arXiv:2604.00387, 2026.

**Type:** Defense — **CORE BASELINE DEFENSE PAPER FOR THIS PROJECT**

**Date:** 2026

**Problem Solved:** Multi-tier, provenance-verified defense-in-depth framework for RAG poisoning.

**Methodology:** Provenance verification combined with multiple detection tiers, tested against adaptive attacks.

**Key Results:** 0.0% ASR across all tiers including adaptive attacks (95% CI: [0.0%, 1.9%]), 0.0% false positive rate — compared to 8–13% ASR without defense.

**Explicit Limitation (quoted):** Insider-style in-place document modification achieves 17.5% ASR even with RAGShield active, described by the authors as "the fundamental limit of ingestion-time defense."

**Relevance to Our Gap:** THIS IS OUR PRIMARY BASELINE. Our project extends RAGShield's provenance-verification philosophy specifically to catch the insider/collaborative gap the authors themselves admit is unsolved.

**Quotable Sentence:** "[Insider in-place document modification represents] the fundamental limit of ingestion-time defense."

---

## Paper: RAGuard (ZKIP)

**Citation:** [Authors], "RAGuard: A Layered Defense Framework for Retrieval-Augmented Generation Systems Against Data Poisoning," arXiv:2607.26339, 2026.

**Type:** Defense

**Date:** 2026

**Problem Solved:** Layered defense framework using Zero-Knowledge Integrity Proofs (ZKIP) plus adversarial retriever training.

**Methodology:** Tested on poisoned Natural Questions dataset at 5–30% poison ratios.

**Key Results:** Adversarial retriever training alone reduces but does not eliminate attack success; ZKIP drives measured ASR to 0.000.

**Explicit Limitation:** Only tested at modest scale (33–190 queries per condition) — generalizability to larger, more diverse corpora unproven.

**Relevance to Our Gap:** Second strong defense baseline; scale limitation is worth noting in our own evaluation design (test at larger scale).

---

## Paper: PRA-RAG

**Citation:** [Authors], "PRA-RAG: Provably Robust Aggregation in Retrieval-Augmented Generation," Findings of ACL 2026.

**Type:** Defense

**Date:** 2026

**Problem Solved:** Provably robust aggregation method across retrieved passages.

**Methodology:** Aggregation algorithm tested across multiple benchmarks and RAG architectures.

**Key Results:** Reduces ASR to as low as 1% while maintaining 71% accuracy, significantly outperforming prior baselines even at 20% poison ratio.

**Explicit Limitation:** Effectiveness is threshold-dependent — degrades as poison ratio increases beyond tested bounds.

**Relevance to Our Gap:** Strong aggregation-based approach; our collaborative detection layer could incorporate similar robust-aggregation principles but applied specifically to detecting cross-document collusion patterns.

---

## Paper: Benchmarking Poisoning Attacks against Retrieval-Augmented Generation

**Citation:** [Authors], "Benchmarking Poisoning Attacks against Retrieval-Augmented Generation," arXiv:2505.18543, 2025.

**Type:** Benchmark/Survey

**Date:** 2025

**Problem Solved:** Large-scale systematic benchmarking of existing detection-based defenses against multiple poisoning attack types.

**Methodology:** Benchmarks detection-based, paraphrasing, InstructRAG, and RobustRAG defenses across attack types.

**Key Results:** Detection-based defenses show "negligible impact across most attack types"; paraphrasing "largely ineffective, failing to prevent attacks across nearly all datasets"; InstructRAG/RobustRAG show "some defensive capability" but ASR still exceeds 50% in most scenarios.

**Explicit Limitation:** This paper itself is a benchmark, not a new defense — it exists specifically to expose how broadly current defenses fail.

**Relevance to Our Gap:** Our single strongest field-wide evidence citation — proves detection-based defenses fail systematically, not just against one attack type.

---

## 4. Design-Pattern / Architecture Reference Paper

## Paper: Design Patterns for Securing LLM Agents against Prompt Injections

**Citation:** L. Beurer-Kellner et al. (IBM, Google, Microsoft, ETH Zurich, Invariant Labs), "Design Patterns for Securing LLM Agents against Prompt Injections," arXiv:2506.08837v3, 2025.

**Type:** Architecture/Design Methodology (NOT an implemented framework)

**Date:** 2025

**Problem Solved:** Proposes 6 architectural patterns (Action-Selector, Plan-Then-Execute, LLM Map-Reduce, Dual LLM, Code-Then-Execute, Context-Minimization) for structurally isolating untrusted data from consequential agent actions.

**Methodology:** Validated through 10 written case studies (OS assistant, SQL agent, email assistant, etc.) — no code released, no empirical ASR benchmarks.

**Key Results:** N/A (conceptual paper) — case-study walkthroughs only.

**Explicit Limitation (quoted):** "We believe it is unlikely that general-purpose agents can provide meaningful and reliable safety guarantees" using current heuristic approaches; Dual LLM pattern admits the quarantined LLM "is still susceptible to prompt injection... can still produce attacker-controlled output."

**Relevance to Our Gap:** Useful architectural vocabulary (Dual LLM, Map-Reduce patterns conceptually resemble our cross-document isolation approach), but does not address multi-agent propagation or RAG-specific collaborative poisoning — a genuine implementation and empirical-validation gap our project can fill.

---

## 5. Systematic Review Reference (Big-Picture Evidence)

## Paper: A Systematic Review of Prompt Injection Attacks on Large Language Models

**Citation:** J. D. Duarte et al., "A Systematic Review of Prompt Injection Attacks on Large Language Models: Trends, Taxonomy, Evaluation, Defenses, and Opportunities," IEEE Access, vol. 14, pp. 12876–12895, 2026.

**Type:** Systematic Literature Review (PRISMA methodology)

**Date:** 2026

**Key Results:** Reviewed 32 peer-reviewed papers (from 231 initial candidates); found agent/multi-agent tool-integrated defense testing "nascent"; explicitly identifies cryptographic safeguards for prompt injection as almost entirely unexplored.

**Explicit Limitation (quoted):** "The study of PI in integrated tools environments, where evaluation considers complex agent pipelines and third-party APIs are still nascent, with few works providing testing frameworks for these use cases... a significant gap exists in the literature regarding the exploration of cryptographic safeguards."

**Relevance to Our Gap:** Independent, rigorous confirmation (not our own opinion) that multi-agent/tool-integrated defense research remains underdeveloped — strong supporting citation for our project's broader justification.

---

## 6. Consolidated Gap Statement (For Writer Agent)

> While state-of-the-art RAG defenses — RAGShield, RAGuard, and PRA-RAG — have achieved near-0% Attack Success Rate against single-document and adaptive single-source poisoning attacks, none of these systems were designed to detect or evaluated against **distributed, collaborative poisoning**, where multiple individually-benign documents jointly corrupt retrieval outcomes. RAGShield's own authors explicitly acknowledge this class of attack (insider in-place document modification) as "the fundamental limit of ingestion-time defense." This gap has since been directly exploited by Micro-Collaborative Poisoning (September 2026), which evaded existing defenses across 108 tests by ensuring no single retrieved document appears suspicious in isolation. Furthermore, a large-scale benchmarking study confirms detection-based and paraphrasing defenses show "negligible impact" across most attack types field-wide, reinforcing that per-document analysis is fundamentally insufficient. Our project addresses this gap directly with a Collaborative Signal Detection Layer that scores retrieved document sets holistically rather than individually.
> 

---

## 7. Open Items for Research Agent to Continue Tracking

- Monitor for any defense paper published after Sept 26, 2026 specifically targeting Micro-Collaborative Poisoning — if found, escalate as CRITICAL to Orchestrator.
- Verify whether RevPRAG's activation-analysis approach has been tested (by anyone) against distributed/collaborative attacks — currently unconfirmed either way.
- Track NIST's AI Agent Standards Initiative (targeting Q4 2026 security profile) for any relevant provenance/authentication standards that could strengthen our provenance-aware aggregation layer.
- Watch for follow-up work citing InceptionRAG or RAG-Narok that proposes countermeasures.
- Confirm current status of "Dark Sourcery" campaign — is it still active, and has any academic paper formalized a defense against this web-scale poisoning pattern?

---

## 8. Quick-Reference Citation List (IEEE Format)

1. W. Zou, R. Geng, B. Wang, J. Jia, "PoisonedRAG: Knowledge Corruption Attacks to Retrieval-Augmented Generation of Large Language Models," Proc. USENIX Security Symposium, 2024.
2. S. Zhao, L. A. Tuan, J. Fu, J. Wen, W. Luo, "Exploring Clean Label Backdoor Attacks and Defense in Language Models," IEEE/ACM Trans. Audio, Speech, Language Process., vol. 32, pp. 3014–3024, 2024.
3. "Knowledge Database or Poison Base? Detecting RAG Poisoning Attack Through LLM Activations," arXiv:2411.18948, 2024.
4. "Traceback of Poisoning Attacks to Retrieval-Augmented Generation," arXiv:2504.21668, 2025.
5. K. Edemacu et al., "Defending Against Knowledge Poisoning Attacks During Retrieval-Augmented Generation," arXiv:2508.02835, 2025.
6. "Benchmarking Poisoning Attacks against Retrieval-Augmented Generation," arXiv:2505.18543, 2025.
7. "RAGShield: Provenance-Verified Defense-in-Depth for Retrieval-Augmented Generation," arXiv:2604.00387, 2026.
8. "Corpus-Dependent Poisoning Attacks and Defenses in RAG Systems," arXiv:2603.18034, 2026.
9. "RAGuard: A Layered Defense Framework for Retrieval-Augmented Generation Systems Against Data Poisoning," arXiv:2607.26339, 2026.
10. "PRA-RAG: Provably Robust Aggregation in Retrieval-Augmented Generation," Findings of ACL 2026.
11. "InceptionRAG: Stealthy Poisoning Attack Against Retrieval-Augmented Generation," arXiv:2609.16818, 2026.
12. "Micro-Collaborative Poisoning: A Distributed Attack on RAG Systems," arXiv:2609.21573, 2026.
13. "Retrieval-Aware Knowledge Corpus Poisoning in RAG," arXiv:2609.25469, 2026.
14. Guo et al., "Indelible Backdoors: On the Limits of Backdoor Removal," Proc. ECCV, 2026.
15. L. Beurer-Kellner et al., "Design Patterns for Securing LLM Agents against Prompt Injections," arXiv:2506.08837v3, 2025.
16. J. D. Duarte et al., "A Systematic Review of Prompt Injection Attacks on Large Language Models," IEEE Access, vol. 14, pp. 12876–12895, 2026.