import { Link } from "@tanstack/solid-router";
import { BookOpen, Home } from "lucide-solid";

export default function NotFoundComponent() {
	return (
		<div
			style={{
				display: "flex",
				"flex-direction": "column",
				"align-items": "center",
				"justify-content": "center",
				"min-height": "70vh",
				padding: "2rem",
				"text-align": "center",
				gap: "1rem",
				color: "var(--text-primary)",
			}}
		>
			<div
				style={{
					background: "var(--bg-secondary)",
					padding: "1.5rem",
					"border-radius": "50%",
					border: "1px solid var(--border-color)",
					"margin-bottom": "0.5rem",
				}}
			>
				<BookOpen size={48} style={{ color: "var(--accent-primary)" }} />
			</div>
			<h1
				style={{
					"font-size": "3.5rem",
					margin: 0,
					"font-weight": "800",
					"line-height": 1,
					background: "linear-gradient(135deg, var(--accent-primary) 0%, #a855f7 100%)",
					"-webkit-background-clip": "text",
					"-webkit-text-fill-color": "transparent",
				}}
			>
				404
			</h1>
			<h2 style={{ "font-size": "1.35rem", margin: 0, "font-weight": "600" }}>
				Halaman Tidak Ditemukan
			</h2>
			<p
				style={{
					color: "var(--text-secondary)",
					"max-width": "420px",
					"line-height": "1.5",
					margin: "0 0 0.5rem 0",
					"font-size": "0.95rem",
				}}
			>
				Halaman, bab, atau sumber daya yang Anda cari tidak ditemukan atau telah dipindahkan.
			</p>
			<Link
				to="/"
				style={{
					display: "inline-flex",
					"align-items": "center",
					gap: "0.5rem",
					padding: "0.65rem 1.25rem",
					background: "var(--accent-primary)",
					color: "#ffffff",
					"border-radius": "8px",
					"text-decoration": "none",
					"font-weight": "500",
					"font-size": "0.9rem",
					transition: "opacity 0.2s ease",
				}}
			>
				<Home size={18} />
				Kembali ke Beranda
			</Link>
		</div>
	);
}
