import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

export default function AdminServiceCatalog() {
	const { isAdmin, adminLoading } = useAuth();
	const [items, setItems] = useState([]);

	useEffect(() => {
		async function load() {
			const { data } = await supabase
				.from("service_catalog")
				.select("id,plan_code,service_type,sell_price_cents,base_cost_cents,is_active")
				.order("service_type");
			setItems(data || []);
		}
		if (isAdmin) load();
	}, [isAdmin]);

	if (!adminLoading && !isAdmin) return <Navigate to="/dashboard" replace />;

	const updateItem = async (id, patch) => {
		setItems((cur) => cur.map((x) => (x.id === id ? { ...x, ...patch } : x)));
		await supabase.from("service_catalog").update(patch).eq("id", id);
	};

	const setMargin = (item, pct) => {
		const sell_price_cents = item.base_cost_cents > 0 && pct < 100
			? Math.round(item.base_cost_cents / (1 - pct / 100))
			: item.sell_price_cents;
		updateItem(item.id, { sell_price_cents });
	};

	return (
		<div>
			<h1 className="text-3xl font-bold mb-6">Service Catalog Admin</h1>
			<div className="bg-[#0f1629] border border-white/10 rounded-2xl overflow-hidden">
				<table className="w-full text-sm">
					<thead className="bg-white/5 text-left text-slate-400">
						<tr><th className="p-3">SKU</th><th>Type</th><th>Sell Price</th><th>Margin %</th><th>Active</th></tr>
					</thead>
					<tbody>
						{items.map((item) => {
							const marginPct = item.sell_price_cents > 0
								? Math.round((item.sell_price_cents - item.base_cost_cents) / item.sell_price_cents * 100)
								: 0;
							return (
							<tr key={item.id} className="border-t border-white/5">
								<td className="p-3 font-mono">{item.plan_code}</td>
								<td>{item.service_type}</td>
								<td>€{(item.sell_price_cents / 100).toFixed(2)}</td>
								<td>
									<input className="bg-white/10 rounded px-2 py-1 w-24" type="number" value={marginPct}
										onChange={(e) => setMargin(item, Number(e.target.value))} />
								</td>
								<td>
									<input type="checkbox" checked={item.is_active}
										onChange={(e) => updateItem(item.id, { is_active: e.target.checked })} />
								</td>
							</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
