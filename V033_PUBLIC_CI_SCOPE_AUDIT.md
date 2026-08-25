# v0.33 public CI scope audit

The original v0.33 Draft PR scope comparison was a one-time release-review fact: it compared the feature branch with its then-current public base and confirmed that only CI, public-test classification, documentation, tooling and dedicated gates changed. Business records under `data/` were not part of that review change.

That historical scope fact is intentionally documented rather than asserted by permanent CI. Public CI now enforces durable repository-content boundaries, deterministic test classification and clean-export reproducibility after any valid future `main` advance.

The Actions pins in `.github/workflows/public-ci.yml` were checked against these upstream release tags before this change: `actions/checkout` v4.2.2, `actions/setup-node` v4.4.0 and `actions/setup-python` v5.6.0.
