/** @type {import('next-sitemap').IConfig} */

module.exports = {
	siteUrl: "https://getlink.vercel.app",
	generateRobotsTxt: true,
	exclude: ["/v/*", "/unsubscribe", "/f/*", "/continue/*", "/account/*", "/d"],
	generateIndexSitemap: false,
	transform: async (config, path) => {
		let priority;
		if (path === "/") priority = 1;
		else if (path === "/about") priority = .8;

		return {
			loc: path,
			priority: priority,
		};
	}
};
