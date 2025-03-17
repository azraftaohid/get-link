import NextBundleAnalyzer from "@next/bundle-analyzer";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const withBundleAnalyzer = NextBundleAnalyzer({
	enabled: process.env.ANALYZE === "true",
});

function ensureEnvVariablesDefined(names) {
	for (const name of names) {
		if (!process.env[name]) throw new Error(`Environment variable '${name}' is missing.`);
	}
}

initOpenNextCloudflareForDev();

ensureEnvVariablesDefined([
	"API_KEY", "EDGE_CONFIG_ID", "EDGE_CONFIG_TOKEN", "NEXT_PUBLIC_APP_URL",
	"NEXT_PUBLIC_FIREBASE_API_KEY",
	"NEXT_PUBLIC_STORAGE_API_URL", "NEXT_PUBLIC_STORAGE_FILE_URL", "NEXT_PUBLIC_STORAGE_DEFAULT_BUCKET",
	"NEXT_PUBLIC_OTP_LEN", "NEXT_PUBLIC_ENABLE_TIER_UPGRADE"
]);

/**
 * @type {import('next/dist/lib/load-custom-routes').Header["headers"]}
 */
const securities = [
	{
		key: "Strict-Transport-Security",
		value: "max-age=31536000; includeSubDomains",
	},
	{
		key: "X-DNS-Prefetch-Control",
		value: "on",
	},
	{
		key: "X-Frame-Options",
		value: "SAMEORIGIN",
	},
	{
		key: "X-Content-Type-Options",
		value: "nosniff",
	},
];

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
	basePath: "",
	trailingSlash: false,
	distDir: "./.next",
	reactStrictMode: true,
	compiler: {
		removeConsole: process.env.NODE_ENV === "production" && {
			exclude: ["error", "warn", "info"],
		},
	},
	headers: async () => [
		{
			source: "/(.*)",
			headers: securities,
		},
	],
	redirects: () => {
		const list = [
			{
				source: "/profile",
				destination: "/account/profile",
				permanent: true,
			},
			{
				source: "/account",
				destination: "/account/profile",
				permanent: false,
			},
			{
				source: "/continue-signin",
				destination: "/continue/signin",
				permanent: true,
			},
			{
				source: "/sign-in",
				destination: "/account/profile",
				permanent: false,
			},
			{
				source: "/premium",
				destination: "/tiers",
				permanent: false,
			},
			{
				source: "/upgrade",
				destination: "/tiers",
				permanent: false,
			},
		];

		if (process.env.NEXT_PUBLIC_ENABLE_TIER_UPGRADE === "false") {
			list.push({
				source: "/tiers",
				destination: "/feature-unavailable",
				permanent: false,
			});
		}

		return list;
	},
	images: {
		loader: "custom",
		loaderFile: "utils/images/cloudflareLoader.ts",
		deviceSizes: [640, 1366, 1920, 2560, 3840],
	},
	logging: {
		fetches: {
			fullUrl: true,
		}
	},
	webpack: (config) => {
		config.devServer = {
			...config.devServer,
			historyApiFallback: true,
		};

		// required by react-pdf on nextjs
		config.resolve.alias.canvas = false;

		return config;
	},
};

export default withBundleAnalyzer(nextConfig);
