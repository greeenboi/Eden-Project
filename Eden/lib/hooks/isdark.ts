import { useColorScheme } from "react-native";

export default function useIsDark(): boolean {
	const scheme = useColorScheme();
	return scheme === "dark";
}
