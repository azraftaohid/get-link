/* eslint-disable @typescript-eslint/no-var-requires */
const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");

const withBundleAnalyzer = require("@next/bundle-analyzer")({
	enabled: process.env.ANALYZE === "true",
});

function ensureEnvVariablesDefined(names) {
	for (const name of names) {
		if (!process.env[name]) throw new Error(`Environmetnal variabel '${name}' is missing.`);
	}
}

ensureEnvVariablesDefined([
	"API_KEY", "EDGE_CONFIG",
	"NEXT_PUBLIC_FIREBASE_API_KEY",
	"NEXT_PUBLIC_BACKBLAZE_DEFAULT_BUCKET",
	"NEXT_PUBLIC_BACKBLAZE_APP_KEY_ID", "NEXT_PUBLIC_BACKBLAZE_APP_KEY", "BACKBLAZE_APP_KEY_ID", "BACKBLAZE_APP_KEY"
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
			exclude: ["error"],
		},
	},
	headers: async () => [
		{
			source: "/(.*)",
			headers: securities,
		},
	],
	images: {
		domains: [
			"localhost", "firebasestorage.googleapis.com", "getlink-dev.s3.eu-central-003.backblazeb2.com", 
			"getlink.s3.eu-central-003.backblazeb2.com"
		],
		remotePatterns: [
			{
				protocol: "https",
				hostname: "f003.backblazeb2.com",
				pathname: "/file/getlink-dev/**"
			},
			{
				protocol: "https",
				hostname: "f003.backblazeb2.com",
				pathname: "/file/getlink/**"
			},
			{
				protocol: "https",
				hostname: "s3.eu-central-003.backblazeb2.com",
				pathname: "/getlink-dev/**"
			},
			{
				protocol: "https",
				hostname: "s3.eu-central-003.backblazeb2.com",
				pathname: "/getlink/**"
			},
		]
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

		return config;
	},
};

module.exports = withBundleAnalyzer(nextConfig);
