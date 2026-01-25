# Lockton Azure OpenAI - Internal Facts
## Extracted from Microsoft Communications (Nov 2025 - Jan 2026)

---

## 1. Subscription & Resource Details

### US Deployments (Document Extraction)
| Field | Value |
|-------|-------|
| **Subscription ID** | `5a3d1593-4191-401c-be7e-1aeb91c4c6f6` |
| **Subscription Name** | Central Services Dev Infrastructure |
| **Resource Group 1** | `rg-lockton-ai-docs-extraction-test-01` |
| **Resource Name 1** | `aoi-lockton-ai-docs-extraction-test` |
| **Resource Group 2** | `rg-ai-docextract-dev-01` |
| **Resource Name 2** | `aoi-ai-docextract-dev-01` |
| **Location** | East US |
| **Model** | GPT-4.1 |
| **Deployment Type** | Data Zone Standard (US) |
| **RG1 Existing TPM** | 1,000,000 |
| **RG2 Existing TPM** | 250,000 |
| **Requested TPM** | 2,000,000 (2M) |

### EU / International Deployments
| Field | Value |
|-------|-------|
| **Subscription ID** | `40758a60-73cd-4012-b5fb-53200054ff17` |
| **Subscription Name** | global-data-management-prod-001 |
| **Requested Region** | North Europe (originally), then Sweden Central (recommended) |
| **Requested Models** | GPT-4.1 (2M TPM) and GPT-5 (3M TPM) |
| **Deployment Type** | Data Zone Standard |
| **DR Region** | Netherlands (West Europe) |

---

## 2. Current Quotas & Limits (Microsoft-Stated + Verified Against Current Docs)

- **Data Zone Standard default quota**: 2 million TPM per subscription, per region, per model deployment type (as stated by Larry Lane referencing Microsoft docs)
- **GPT-4.1 Data Zone Standard maximum rate limit via portal**: 250K TPM (as shown in Azure portal screenshot, per Mohana's email Jan 6, 2026)
- **Quota increase request submitted Dec 10, 2025** — requesting increase from 250K to 2M TPM
- **Quota is assigned at the subscription / region / model level** — NOT at the resource-group level (confirmed by Monica Choto, Jan 6, 2026)

### Verified Current Quota Limits (from Microsoft Learn docs, Jan 2026):

| Model | Tier | Data Zone Standard TPM | Data Zone Standard RPM |
|-------|------|----------------------|----------------------|
| GPT-4.1 | Enterprise (MCA-E) | 2,000,000 | 2,000 |
| GPT-4.1 | Default | 300,000 | 300 |
| GPT-4.1-mini | Enterprise (MCA-E) | 50,000,000 | 50,000 |
| GPT-4.1-mini | Default | 2,000,000 | 2,000 |
| GPT-4.1-nano | Enterprise (MCA-E) | 50,000,000 | 50,000 |
| GPT-4.1-nano | Default | 2,000,000 | 2,000 |

**Confirmed**: Lockton operates under an MCA-E (MACC) agreement and qualifies for the 2M TPM ceiling. The portal shows 250K TPM because this allocation is shared across multiple use cases on the same subscription — the throttling is caused by quota contention, not a tier misconfiguration.

### Current Pricing (per 1M tokens, Global Standard PayGo):

| Model | Input | Cached Input | Output |
|-------|-------|-------------|--------|
| GPT-4.1 | $2.00 | $0.50 | $8.00 |
| GPT-4.1-mini | $0.40 | $0.10 | $1.60 |
| GPT-4.1-nano | $0.10 | $0.025 | $0.40 |
| GPT-4o | $2.50 | $1.25 | $10.00 |
| GPT-4o-mini | $0.15 | $0.075 | $0.60 |

---

## 3. Capacity Constraints (Microsoft-Stated)

- **GPT-4.1 PayGo is under capacity constraints** — all quota increase requests remain on a waitlist (Monica Choto, Jan 8, 2026)
- **No ETA on additional capacity** for GPT-4.1 Data Zone Standard (Jan 8, 2026)
- **Some TPMs are made available weekly** — escalation requests triaged on Thursday afternoons (Jan 8, 2026)
- **Request still on waitlist as of Jan 13, 2026** — Microsoft confirmed "they don't have any capacity to assign for Data Zone Standard either this week or next"
- **North Europe is NOT enabled for AOAI GPT models** — cannot be activated due to GPU Capacity & Infrastructure constraints (Monica Choto, Dec 9, 2025)
- **North Europe request added to demand signaling queue** — no published ETA (Dec 9, 2025)

---

## 4. Prioritization Factors for Quota Requests (Microsoft-Stated)

Requests are prioritized based on:
1. Timelines
2. Current AI usage and Azure commitments
3. Requested quota amount (smaller, right-sized asks move faster)
4. Flexibility regarding deployment region, deployment type, and/or model capacity type (PTU vs. PayGo)

---

## 5. Provisioned Throughput Units (PTU) - Microsoft Recommendation

- Microsoft highlighted PTU as alternative when PayGo is blocked (Jan 8, 2026)
- **PTU capacity is dedicated** — not subject to PayGo constraints
- Srikanta Nandy (Lockton) suggested: "Can we go with a PTU option for GPT 4.1 and have the other models under PayGo?" (Jan 20, 2026)
- Larry Lane asked Monica for times to discuss PTU option further (Jan 20, 2026)
- Microsoft offered to walk through sizing, cost, and deployment model

---

## 6. Document Extraction Workload Characteristics (Lockton-Stated)

- **Document size**: 50 to 150 pages per input document
- **Token consumption per request**: 40K to 150K tokens
- **Current TPM allocation**: 250K TPM shared across multiple use cases on the subscription — even a few concurrent extraction requests exhaust the shared capacity
- **Error type**: HTTP 429 (rate limit) errors
- **Impact**: System reliability, throughput, and processing timelines affected
- **Multiple downstream applications** consume the extraction service, adding concurrent token usage
- **Multiple use cases** share the same GPT-4.1 model — Quote/Binder extraction is not the only one

---

## 7. Data Zone Standard - Key Microsoft Guidance

- **Purpose**: Compliance-first scenarios requiring specialized infrastructure and strict operational controls
- **Data residency**: Prompts/responses processed in any geography within the specified data zone
- **EU Data Zone**: For EU/EFTA deployments, processing stays within EU/EFTA boundary
- **Limited to fewer regions** vs. Global/Regional Standard (intentional design)
- **Quota increase requests typically complete in 1-3 business days** (when capacity available)
- **New region activations can take several business days to 1-2 weeks** (capacity permitting)
- **New region activation is not guaranteed** — entirely dependent on available capacity

---

## 8. Region Selection (Lockton Decision)

- **Sweden Central** selected as primary EU hub for Global Landing Zone (Dec 16, 2025)
  - "Basically the equivalent of US East 2 — where the most cutting edge stuff is made available first"
  - Hosts latest model clusters under Data Zone Standard
  - Fully compliant with EU data residency (GDPR)
  - Confirmed by Lockton Data Protection Manager (Collette Hope, Dec 16, 2025)
- **Netherlands (West Europe)** as DR secondary
- **North Europe (Ireland)** originally requested but not available

---

## 9. Compliance & Governance Context

- Lockton is mandated to use Data Zone Standard for compliance (GDPR, EU data residency)
- Global Standard deployments offer early model availability and larger bandwidth/token capacity
- Larry Lane has been "pushing to just use Data Zone Standard" but recognizes tradeoffs
- InfoSec/Legal/Compliance formal guidance requested (Nov 21, 2025)
- David Collins (Legal) flagged "restrictions from privacy laws and client contracts" depending on use case
- Karthik Ramadoss requested joint EA recommendation be created on Monday.com board

---

## 10. Escalation Timeline

| Date | Event |
|------|-------|
| Nov 7, 2025 | Larry Lane initial request to Monica Choto for quota guidance |
| Nov 12, 2025 | Lockton provides subscription details, 1M TPM limit noted |
| Nov 13, 2025 | Microsoft clarifies Data Zone Standard region limitations |
| Nov 21, 2025 | Internal discussion on Global vs. Data Zone compliance |
| Nov 25, 2025 | Support ticket opened (TrackingID#2511250040010418) |
| Dec 3, 2025 | Monica submits UAT escalations (660461, 662715, 662819) |
| Dec 9, 2025 | Microsoft confirms North Europe unavailable, recommends Sweden |
| Dec 10, 2025 | Mohana submits quota increase form for 2M TPM (East US) |
| Dec 16, 2025 | Sweden Central selected as primary EU region |
| Jan 5, 2026 | International Landing Zone planning begins |
| Jan 5-6, 2026 | Follow-up on TPM increase request status |
| Jan 8, 2026 | Microsoft confirms GPT-4.1 under capacity constraints, suggests PTU |
| Jan 13, 2026 | Still on waitlist — no capacity available this week or next |
| Jan 20, 2026 | Internal discussion on PTU vs. PayGo strategy |
| Jan 21, 2026 | Karthik escalates to Jay Lisota (Microsoft AE) for Redmond visit |
| Jan 22, 2026 | Jay Lisota acknowledges, checking availability for Redmond discussion |

---

## 11. Key Microsoft Contacts

| Name | Role | Email |
|------|------|-------|
| Monica Choto | Sr. Cloud & AI Specialist (Insurance) | mchoto@microsoft.com |
| Jay Lisota | Account Executive (Insurance) | jay.lisota@microsoft.com |
| Jarod Navarro | AI Solutions Engineer | jarodnavarro@microsoft.com |
| Mohit Dhande | AI Specialist | mohitdhande@microsoft.com |
| Ketan Upgade | CSAM | ketan.upgade@microsoft.com |

---

## 12. Key Lockton Contacts

| Name | Role |
|------|------|
| Karthik Ramadoss | SVP Architecture & App Delivery |
| Larry Lane | Cloud Infrastructure / Azure Lead |
| James Solko | Enterprise Architecture |
| Srikanta Nandy | AI/Development Lead |
| Venkat Sai Kandiboina | Developer (Doc Extraction) |
| Mohana A | Developer (Doc Extraction) |
| Jennifer Bocanegra | Sr Product & Program Manager (Global DDA) |
| Collette Hope | Data Protection Manager (CISM, CIPM, CIPP/E) |

---

## 13. Open Questions / Unresolved Items

1. **TPM increase for East US still on waitlist** — no resolution as of Jan 22, 2026
2. **PTU sizing and cost discussion** not yet completed with Microsoft
3. **Sweden Landing Zone infrastructure** (networking, DC, VDI) in progress
4. **Formal InfoSec/Legal guidance on Global vs. Data Zone Standard** still pending from David Collins
5. **High-level roadmap of use cases and potential token needs** requested from Andrew Schultz's team
6. **Token consumption approximation** requested by Srikanta Nandy based on last 3 months of dev usage
