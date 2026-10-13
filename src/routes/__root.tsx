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
		links: [{ rel: "stylesheet", href: styleCss }],
	}),
	shellComponent: RootComponent,
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
