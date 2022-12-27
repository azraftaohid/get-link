export function storageSupported(s: Storage) {
	const t = "test";
	try {
		s.setItem(t, t);
		s.removeItem(t);
		return true;
	} catch (error) {
		return false;
	}
}
