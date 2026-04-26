import { useEffect, useRef, useState } from "react";
import { COUNTRIES } from "../lib/countries";

export default function CountrySelect({ id, value, onChange, className }) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const containerRef = useRef(null);
	const searchRef = useRef(null);

	const selected = COUNTRIES.find((c) => c.code === value);
	const filtered = search
		? COUNTRIES.filter(
				(c) =>
					c.name.toLowerCase().includes(search.toLowerCase()) ||
					c.code.toLowerCase().includes(search.toLowerCase()),
			)
		: COUNTRIES;

	useEffect(() => {
		function onMouseDown(e) {
			if (containerRef.current && !containerRef.current.contains(e.target)) {
				setOpen(false);
				setSearch("");
			}
		}
		document.addEventListener("mousedown", onMouseDown);
		return () => document.removeEventListener("mousedown", onMouseDown);
	}, []);

	useEffect(() => {
		if (open) searchRef.current?.focus();
	}, [open]);

	return (
		<div ref={containerRef} className="relative">
			<button
				id={id}
				type="button"
				onClick={() => setOpen((o) => !o)}
				className={`${className} flex items-center justify-between gap-2`}
			>
				<span className={selected ? "text-slate-100" : "text-slate-500"}>
					{selected ? `${selected.name} (${selected.code})` : "Select country…"}
				</span>
				<svg
					className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{open && (
				<div className="absolute z-50 mt-1 w-full bg-[#0d1425] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
					<div className="p-2 border-b border-white/5">
						<input
							ref={searchRef}
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search…"
							className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
						/>
					</div>
					<div className="max-h-52 overflow-y-auto">
						{filtered.length === 0 ? (
							<p className="px-4 py-3 text-sm text-slate-500">No results.</p>
						) : (
							filtered.map((c) => (
								<button
									key={c.code}
									type="button"
									onClick={() => {
										onChange(c.code);
										setOpen(false);
										setSearch("");
									}}
									className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-white/10 ${
										value === c.code ? "text-cyan-400" : "text-slate-200"
									}`}
								>
									{c.name}{" "}
									<span className="text-slate-500">({c.code})</span>
								</button>
							))
						)}
					</div>
				</div>
			)}
		</div>
	);
}
