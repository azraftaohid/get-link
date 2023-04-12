/** @type {import('next-sitemap').IConfig} */

module.exports = {
	siteUrl: "https://getlink.vercel.app",
	generateRobotsTxt: true,
	exclude: ["/v/*", "/unsubscribe"],
	changefreq: "weekly",
};
