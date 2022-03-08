import { useEffect, useMemo, useState } from "react";
import { hasWindow } from "./common";
import { useMediaQuery } from "./useMediaQuery";

const KEY_THEME = "theme";

export enum Theme {
  LIGHT = "light",
  DARK = "dark",
  DEFAULT = LIGHT
}

export const useTheme = (): ThemePops => {
	const savedTheme: Theme | null = hasWindow ? localStorage.getItem(KEY_THEME) as (Theme | null) : null;
	const systemDark = useMediaQuery("(prefers-color-scheme: dark)");

	let initTheme: Theme;
	if (savedTheme) initTheme = savedTheme;
	else if (systemDark) initTheme = Theme.DARK;
	else initTheme = Theme.LIGHT;

	const [theme, setTheme] = useState<Theme>(initTheme);

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
	}, [theme]);

	return useMemo(() => ({ current: theme, setTheme: (th) => {
		localStorage.setItem(KEY_THEME, th);
		setTheme(th);
	}}), [theme]);
};

export interface ThemePops {
	current: Theme,
	setTheme: (theme: Theme) => void
}