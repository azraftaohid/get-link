/* eslint-disable @typescript-eslint/no-var-requires */
const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");

const withBundleAnalyzer = require("@next/bundle-analyzer")({
	enabled: process.env.ANALYZE === "true",
});

function ensureEnvVariablesDefined(names) {
	for (const name of names) {
		if (!process.env[name]) throw new Error(`Environment variable '${name}' is missing.`);
	}
}

ensureEnvVariablesDefined([
	"API_KEY", "EDGE_CONFIG", "NEXT_PUBLIC_APP_URL",
	"NEXT_PUBLIC_FIREBASE_API_KEY",
	"NEXT_PUBLIC_STORAGE_API_URL", "NEXT_PUBLIC_STORAGE_FILE_URL", "NEXT_PUBLIC_STORAGE_DEFAULT_BUCKET",
	"NEXT_PUBLIC_OTP_LEN",
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
	redirects: () => [
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
		}
	],
	images: {
		remotePatterns: [
			{
				protocol: "http",
				hostname: "localhost",
				pathname: "/**"
			},
			{
				protocol: "https",
				hostname: "storage.getlinksoft.workers.dev",
				pathname: "/file/**"
			},
		]
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

		config.plugins.push(
			new CopyPlugin({
				patterns: [
					{
						from: path.join(__dirname, "node_modules/pdfjs-dist/build/pdf.worker.min.js"),
						to: path.join(__dirname, "public"),
					},
				],
			})
		);

		// required by react-pdf on nextjs
		config.resolve.alias.canvas = false;

		return config;
	},
};

module.exports = withBundleAnalyzer(nextConfig);
