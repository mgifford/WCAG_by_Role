# Optional AI / Hugging Face integration

**No AI is required in v1.** The deterministic W3C sources suffice for roles, tasks and the Understanding text. Avoid adding latency, model downloads, credentials or a cloud dependency merely to paraphrase a guideline.

## Possible future value

An optional build-only AI step may propose: shorter context-specific examples for visual designers and front-end developers, plain-language explanation of W3C Understanding material, or suggestions for cross-role handoffs. It must never declare that an implementation passes WCAG, assign definitive legal responsibility, or replace W3C wording.

## Proposed workflow

1. A manually triggered workflow sends **only public, approved extracts** and source URLs to a Hugging Face endpoint or a self-hosted model. Validate terms and permitted reuse before doing this.
2. AI returns *proposals* into `proposals/` (not deployed), including source links, model name/version, date and prompt version.
3. A contributor reviews each proposal for fidelity, accessibility, bias and licensing. Unknown claims are removed or explicitly flagged.
4. Approved descriptions are committed to a separately versioned `editorial/` dataset with reviewer and date. They are visibly labeled as project commentary, not W3C or ARRM normative material.
5. The static site can display the commentary only when an approved record exists. It always functions without AI output.

Security: never expose a Hugging Face API key through GitHub Pages JavaScript. A secret, if eventually necessary, belongs only in GitHub Actions. Do not upload user content or private project data. In v1 no AI requests are made.
