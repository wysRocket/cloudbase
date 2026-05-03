-- Seed DigitalOcean service catalog entries
-- margin_percent=0 / sell_price=base_cost are intentional placeholders; set before production
INSERT INTO public.service_catalog (sku, service_type, provider, provider_sku, region, base_cost, sell_price, billing_cycle, quota, margin_percent, active)
VALUES
  -- VPS Basic (5 regions)
  ('do-vps-basic-2vcpu-4gb-nyc3', 'vps', 'DigitalOcean', 'do-vps-basic-2vcpu-4gb', 'nyc3', 12.00, 12.00, 'monthly', '{"cpu":"2vCPU","ram":"4GB","storage":"80GB SSD","bandwidth":"4TB"}', 0, true),
  ('do-vps-basic-2vcpu-4gb-sfo3', 'vps', 'DigitalOcean', 'do-vps-basic-2vcpu-4gb', 'sfo3', 12.00, 12.00, 'monthly', '{"cpu":"2vCPU","ram":"4GB","storage":"80GB SSD","bandwidth":"4TB"}', 0, true),
  ('do-vps-basic-2vcpu-4gb-fra1', 'vps', 'DigitalOcean', 'do-vps-basic-2vcpu-4gb', 'fra1', 12.00, 12.00, 'monthly', '{"cpu":"2vCPU","ram":"4GB","storage":"80GB SSD","bandwidth":"4TB"}', 0, true),
  ('do-vps-basic-2vcpu-4gb-lon1', 'vps', 'DigitalOcean', 'do-vps-basic-2vcpu-4gb', 'lon1', 12.00, 12.00, 'monthly', '{"cpu":"2vCPU","ram":"4GB","storage":"80GB SSD","bandwidth":"4TB"}', 0, true),
  ('do-vps-basic-2vcpu-4gb-sgp1', 'vps', 'DigitalOcean', 'do-vps-basic-2vcpu-4gb', 'sgp1', 12.00, 12.00, 'monthly', '{"cpu":"2vCPU","ram":"4GB","storage":"80GB SSD","bandwidth":"4TB"}', 0, true),
  -- Kubernetes Basic (5 regions)
  ('do-k8s-basic-3node-nyc3', 'kubernetes', 'DigitalOcean', 'do-k8s-basic-3node', 'nyc3', 36.00, 36.00, 'monthly', '{"nodes":3,"cpu":"2vCPU per node","ram":"4GB per node","storage":"80GB per node"}', 0, true),
  ('do-k8s-basic-3node-sfo3', 'kubernetes', 'DigitalOcean', 'do-k8s-basic-3node', 'sfo3', 36.00, 36.00, 'monthly', '{"nodes":3,"cpu":"2vCPU per node","ram":"4GB per node","storage":"80GB per node"}', 0, true),
  ('do-k8s-basic-3node-fra1', 'kubernetes', 'DigitalOcean', 'do-k8s-basic-3node', 'fra1', 36.00, 36.00, 'monthly', '{"nodes":3,"cpu":"2vCPU per node","ram":"4GB per node","storage":"80GB per node"}', 0, true),
  ('do-k8s-basic-3node-lon1', 'kubernetes', 'DigitalOcean', 'do-k8s-basic-3node', 'lon1', 36.00, 36.00, 'monthly', '{"nodes":3,"cpu":"2vCPU per node","ram":"4GB per node","storage":"80GB per node"}', 0, true),
  ('do-k8s-basic-3node-sgp1', 'kubernetes', 'DigitalOcean', 'do-k8s-basic-3node', 'sgp1', 36.00, 36.00, 'monthly', '{"nodes":3,"cpu":"2vCPU per node","ram":"4GB per node","storage":"80GB per node"}', 0, true),
  -- Database PostgreSQL Basic (5 regions)
  ('do-db-pg-basic-nyc3', 'database', 'DigitalOcean', 'do-db-pg-basic', 'nyc3', 15.00, 15.00, 'monthly', '{"engine":"PostgreSQL","storage":"25GB","connections":20}', 0, true),
  ('do-db-pg-basic-sfo3', 'database', 'DigitalOcean', 'do-db-pg-basic', 'sfo3', 15.00, 15.00, 'monthly', '{"engine":"PostgreSQL","storage":"25GB","connections":20}', 0, true),
  ('do-db-pg-basic-fra1', 'database', 'DigitalOcean', 'do-db-pg-basic', 'fra1', 15.00, 15.00, 'monthly', '{"engine":"PostgreSQL","storage":"25GB","connections":20}', 0, true),
  ('do-db-pg-basic-lon1', 'database', 'DigitalOcean', 'do-db-pg-basic', 'lon1', 15.00, 15.00, 'monthly', '{"engine":"PostgreSQL","storage":"25GB","connections":20}', 0, true),
  ('do-db-pg-basic-sgp1', 'database', 'DigitalOcean', 'do-db-pg-basic', 'sgp1', 15.00, 15.00, 'monthly', '{"engine":"PostgreSQL","storage":"25GB","connections":20}', 0, true),
  -- GPU H100 (2 regions — limited availability)
  ('do-gpu-h100-1x-nyc3', 'gpu', 'DigitalOcean', 'do-gpu-h100-1x', 'nyc3', 2.50, 2.50, 'hourly', '{"gpu":"NVIDIA H100","vram":"80GB HBM3","cpu":"16vCPU","ram":"240GB"}', 0, true),
  ('do-gpu-h100-1x-fra1', 'gpu', 'DigitalOcean', 'do-gpu-h100-1x', 'fra1', 2.50, 2.50, 'hourly', '{"gpu":"NVIDIA H100","vram":"80GB HBM3","cpu":"16vCPU","ram":"240GB"}', 0, true),
  -- Game Server Basic (5 regions)
  ('do-game-basic-2vcpu-4gb-nyc3', 'game_server', 'DigitalOcean', 'do-game-basic-2vcpu-4gb', 'nyc3', 14.00, 14.00, 'monthly', '{"cpu":"2vCPU","ram":"4GB","playerSlots":256}', 0, true),
  ('do-game-basic-2vcpu-4gb-sfo3', 'game_server', 'DigitalOcean', 'do-game-basic-2vcpu-4gb', 'sfo3', 14.00, 14.00, 'monthly', '{"cpu":"2vCPU","ram":"4GB","playerSlots":256}', 0, true),
  ('do-game-basic-2vcpu-4gb-fra1', 'game_server', 'DigitalOcean', 'do-game-basic-2vcpu-4gb', 'fra1', 14.00, 14.00, 'monthly', '{"cpu":"2vCPU","ram":"4GB","playerSlots":256}', 0, true),
  ('do-game-basic-2vcpu-4gb-lon1', 'game_server', 'DigitalOcean', 'do-game-basic-2vcpu-4gb', 'lon1', 14.00, 14.00, 'monthly', '{"cpu":"2vCPU","ram":"4GB","playerSlots":256}', 0, true),
  ('do-game-basic-2vcpu-4gb-sgp1', 'game_server', 'DigitalOcean', 'do-game-basic-2vcpu-4gb', 'sgp1', 14.00, 14.00, 'monthly', '{"cpu":"2vCPU","ram":"4GB","playerSlots":256}', 0, true)
ON CONFLICT (sku) DO NOTHING;
