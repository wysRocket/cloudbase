# Go-Live Checklist

## Service Readiness
- [ ] SLA is published per service family (VPS, GPU, Databases, Kubernetes, Game Servers) with uptime target, exclusions, and credit policy.
- [ ] Regional launch status reviewed (canary flags by service family + region validated).
- [ ] Sandbox ordering path validated for internal team and finance workflows.

## Support & Incident Operations
- [ ] Support hours are documented with timezone coverage and escalation contacts.
- [ ] Incident severity model (SEV-1 to SEV-4) and response time objectives are approved.
- [ ] Incident communication process is defined (status page, customer updates cadence, postmortem timeline).

## Billing, Tax, and Compliance
- [ ] Tax/VAT/GST rules configured for active selling regions and tested with sample checkouts.
- [ ] Invoice generation validated (subtotal, tax, total, legal entity data, customer tax IDs).
- [ ] Terms of Service and Privacy Policy updated for reseller obligations, acceptable use, and international data handling.

## Reliability & Recovery
- [ ] Backup policy documented (frequency, encryption, retention, restore ownership).
- [ ] Recovery targets approved (RPO/RTO per service family and control plane components).
- [ ] Disaster recovery runbook tested in a staging drill with evidence attached.

## Security
- [ ] Access controls enforced (least privilege, MFA, audit log review process).
- [ ] Abuse handling runbook tested (spam/malware reports, takedown SLA, legal escalation).
- [ ] Key management and secret rotation schedules are documented.
