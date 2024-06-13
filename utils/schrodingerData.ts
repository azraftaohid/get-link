export type SchrodingerData<T extends Record<Exclude<string, "notFound">, unknown>> = ({
	notFound: true,
} & {
	[K in keyof T]?: undefined;
}) | (T & {
	notFound?: false,
});
