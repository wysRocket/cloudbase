-- Apply sell-price markup to service catalog.
-- Base costs reflect DigitalOcean wholesale pricing; sell prices include ~25-40% margin.

-- VPS Basic 2 vCPU / 4 GB: base $12/mo → sell $15/mo (+25%)
update public.service_catalog
   set sell_price_cents = 1500
 where plan_code like 'do-vps-basic-2vcpu-4gb%';

-- Kubernetes Basic 3-node: base $36/mo → sell $45/mo (+25%)
update public.service_catalog
   set sell_price_cents = 4500
 where plan_code like 'do-k8s-basic-3node%';

-- Managed PostgreSQL Basic: base $15/mo → sell $19/mo (+27%)
update public.service_catalog
   set sell_price_cents = 1900
 where plan_code like 'do-db-pg-basic%';

-- GPU H100 80 GB (hourly): base $2.50/hr → sell $3.50/hr (+40%)
update public.service_catalog
   set sell_price_cents = 350
 where plan_code like 'do-gpu-h100-1x%';

-- Game Server Basic 2 vCPU / 4 GB: base $14/mo → sell $18/mo (+29%)
update public.service_catalog
   set sell_price_cents = 1800
 where plan_code like 'do-game-basic-2vcpu-4gb%';
