
https://learn.microsoft.com/en-us/azure/ai-foundry/how-to/benchmark-model-in-catalog?view=foundry-classic


---

In Azure AI Foundry, there are two practical “layers” of benchmarking you can use to compare GPT-4.1 against other catalog models:

1) Foundry’s built-in model leaderboards (fast, standardized, but not document-specific)
Foundry has model leaderboards and a Benchmarks tab on many model cards so you can compare models on quality, safety, cost, and throughput. 

For text LLM quality, Foundry’s quality index is built from industry benchmarks like: arena_hard, bigbench_hard, gpqa, humanevalplus, ifeval, math, mbppplus, mmlu_pro. 

How this helps doc extraction:

- Use these leaderboards to shortlist models that are strong at instruction following + accuracy (often correlated with “follow the schema exactly” behavior).
- But note: Foundry’s leaderboard scope is text-based general-purpose language tasks; it explicitly does not cover specialized modalities/use-cases like document-layout understanding as a first-class benchmark.  

2) Foundry evaluations on your own dataset (best for document extraction)

For document extraction, the most meaningful “benchmark” is usually your own labeled document set (or a public doc dataset you import) run through Foundry’s Evaluation feature.

Foundry supports evaluation runs over a CSV/JSONL test dataset, using mathematical metrics and AI-assisted metrics, and it includes built-in metrics like F1 (plus ROUGE/BLEU/etc.) and AI-judge metrics like groundedness/relevance/coherence. 

This is the right mechanism to compare GPT-4.1 vs other models on “extract these fields into JSON” tasks.

A good extraction eval setup in Foundry typically looks like:
- Input column(s): OCR text (or extracted text), plus optional context like doc type
- Prompt: a strict JSON schema + rules (“no extra keys, null if missing”)
- Ground truth: the correct JSON
- Metrics: per-field precision/recall/F1 (or overall F1) + “valid JSON rate” (often a custom evaluator)

Public benchmarks that are widely used for document extraction (bring them into Foundry or run externally

If you want standardized datasets that map well to doc extraction, these are the usual suspects:
Forms / key-value extraction

- FUNSD (forms understanding)
- XFUND (multilingual forms)

Receipts / invoices

- SROIE (receipt OCR + key fields)
- CORD (receipt understanding)
Long, dense legal/financial docs
- Kleister-NDA (contracts / NDAs)
- Kleister-Charity (financial reports with lots of pages/entities)

Microsoft’s own “Document AI” benchmark overview explicitly calls out FUNSD, SROIE, CORD, Kleister-NDA, DocVQA as canonical document understanding datasets. 

Document Q&A style (often a proxy for “find the right field/value”)
- DocVQA 

End-to-end “document understanding suites”
- DUE (Document Understanding Benchmark) bundles multiple doc tasks/datasets into one evaluation framing.  

What I’d recommend (simple, high-signal)
1. Use Foundry leaderboards to shortlist 3–5 candidate models (include GPT-4.1 and cost/perf alternatives).  
2. Run a Foundry Evaluation on:  

- your top 50–200 representative docs (best), and/or
- one public dataset that matches your doc type (e.g., SROIE for receipts, FUNSD for forms).  
1. Score with field-level F1 + JSON validity + latency/cost (because extraction is usually a pipeline, not a poetry contest).

If you tell me your document types (claims forms, loss runs, invoices, certificates, policy docs, etc.) and whether you’re extracting from OCR text or images/PDF layout, I can suggest the tightest benchmark set and an evaluation template schema that drops directly into Foundry.

--- 
