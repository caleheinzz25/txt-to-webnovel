import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/solid-router";

import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools";

import "@fontsource/inter/400.css";

import { Suspense } from "solid-js";
import { HydrationScript } from "solid-js/web";
import NotFoundComponent from "../components/NotFound";
import { ThemeProvider } from "../lib/theme";
import styleCss from "../styles.css?url";

export const Route = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content:
					"width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover",
			},
			{
				name: "theme-color",
				content: "#000000",
			},
			{
				name: "mobile-web-app-capable",
				content: "yes",
			},
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "black-translucent",
			},
			{
				title: "NovelReader - Web Novel Reader",
			},
		],
		links: [
			{ rel: "stylesheet", href: styleCss },
			{
				rel: "icon",
				href: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z'/><path d='M6 6h10'/><path d='M6 10h10'/></svg>",
			},
		],
	}),
	shellComponent: RootComponent,
	notFoundComponent: NotFoundComponent,
});

function RootComponent() {
	return (
		<html lang="id">
			<head>
				<HydrationScript />
				<HeadContent />
			</head>
			<body>
				<ThemeProvider>
					<Suspense>
						<Outlet />
						<TanStackRouterDevtools />
					</Suspense>
				</ThemeProvider>
				<Scripts />
			</body>
		</html>
	);
}
