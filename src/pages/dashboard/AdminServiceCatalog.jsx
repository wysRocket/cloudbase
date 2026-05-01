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
				.select("id,sku,service_type,sell_price,margin_percent,active")
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

	return (
		<div>
			<h1 className="text-3xl font-bold mb-6">Service Catalog Admin</h1>
			<div className="bg-[#0f1629] border border-white/10 rounded-2xl overflow-hidden">
				<table className="w-full text-sm">
					<thead className="bg-white/5 text-left text-slate-400">
						<tr><th className="p-3">SKU</th><th>Type</th><th>Sell Price</th><th>Margin %</th><th>Active</th></tr>
					</thead>
					<tbody>
						{items.map((item) => (
							<tr key={item.id} className="border-t border-white/5">
								<td className="p-3 font-mono">{item.sku}</td>
								<td>{item.service_type}</td>
								<td>€{item.sell_price}</td>
								<td>
									<input className="bg-white/10 rounded px-2 py-1 w-24" type="number" value={item.margin_percent}
										onChange={(e)=>updateItem(item.id,{margin_percent:Number(e.target.value)})} />
								</td>
								<td>
									<input type="checkbox" checked={item.active}
										onChange={(e)=>updateItem(item.id,{active:e.target.checked})} />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
