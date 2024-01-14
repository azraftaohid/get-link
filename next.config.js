/* eslint-disable @typescript-eslint/no-var-requires */
const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");

const withBundleAnalyzer = require("@next/bundle-analyzer")({
	enabled: process.env.ANALYZE === "true",
});

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
	headers: async () => [
		{
			source: "/(.*)",
			headers: securities,
		},
	],
	images: {
		domains: ["localhost", "firebasestorage.googleapis.com", "getlink-dev.s3.eu-central-003.backblazeb2.com"],
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
