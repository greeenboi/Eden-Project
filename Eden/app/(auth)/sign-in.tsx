import { Image } from "expo-image";
import { router } from "expo-router";
import { AlertTriangle } from "lucide-react-native";
import { useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	View as RNView,
	ScrollView,
	StyleSheet,
} from "react-native";
import { View } from "@/components/Themed";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/ctx";

export default function SignIn() {
	const { signIn, signUp, error, clearError } = useSession();
	const [isSignUp, setIsSignUp] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async () => {
		if (isLoading) return;

		clearError();
		setIsLoading(true);

		try {
			if (isSignUp) {
				if (!name.trim()) {
					throw new Error("Name is required");
				}
				await signUp(email, password, name);
			} else {
				await signIn(email, password);
			}
			// Navigate to index after signing in
			router.replace("/(dashboard)");
		} catch (err) {
			// Error is handled by the auth store
			console.error(err);
		} finally {
			setIsLoading(false);
		}
	};

	const toggleMode = () => {
		setIsSignUp(!isSignUp);
		clearError();
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			style={styles.container}
		>
			<Image
				source={require("@/assets/images/banner.png")}
				style={styles.background}
				contentFit="cover"
				pointerEvents="none"
			/>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				keyboardShouldPersistTaps="handled"
			>
				<RNView style={styles.content}>
					<Text className="text-4xl font-bold mb-2 text-center">
						{isSignUp ? "Create Account" : "Welcome Back"}
					</Text>
					<Text className="text-base mb-8 text-center opacity-70">
						{isSignUp ? "Sign up to get started" : "Sign in to continue"}
					</Text>

					{error && (
						<Alert icon={AlertTriangle} className="mb-4" variant="destructive">
							<AlertTitle>Error</AlertTitle>
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<Card>
						<CardHeader>
							<CardTitle>{isSignUp ? "Sign Up" : "Sign In"}</CardTitle>
							<CardDescription>
								{isSignUp
									? "Enter your details to create an account"
									: "Enter your credentials to access your account"}
							</CardDescription>
						</CardHeader>
						<CardContent className="gap-4">
							{isSignUp && (
								<View
									style={{ backgroundColor: "transparent" }}
									className="gap-2"
								>
									<Label nativeID="name">Name</Label>
									<Input
										placeholder="John Doe"
										value={name}
										onChangeText={setName}
										aria-labelledby="name"
										autoCapitalize="words"
									/>
								</View>
							)}

							<View
								style={{ backgroundColor: "transparent" }}
								className="gap-2"
							>
								<Label nativeID="email">Email</Label>
								<Input
									placeholder="user@example.com"
									value={email}
									onChangeText={setEmail}
									aria-labelledby="email"
									keyboardType="email-address"
									autoCapitalize="none"
									autoComplete="email"
								/>
							</View>

							<View
								style={{ backgroundColor: "transparent" }}
								className="gap-2"
							>
								<Label nativeID="password">Password</Label>
								<Input
									placeholder={
										isSignUp ? "Minimum 8 characters" : "Enter your password"
									}
									value={password}
									onChangeText={setPassword}
									aria-labelledby="password"
									secureTextEntry
									autoCapitalize="none"
								/>
							</View>
						</CardContent>
						<CardFooter className="flex-col gap-3">
							<Button
								className="w-full"
								onPress={handleSubmit}
								disabled={isLoading}
							>
								<Text>
									{isLoading
										? "Please wait..."
										: isSignUp
											? "Sign Up"
											: "Sign In"}
								</Text>
							</Button>

							<Button variant="ghost" onPress={toggleMode} disabled={isLoading}>
								<Text>
									{isSignUp
										? "Already have an account? Sign In"
										: "Don't have an account? Sign Up"}
								</Text>
							</Button>
						</CardFooter>
					</Card>
				</RNView>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	background: {
		...StyleSheet.absoluteFillObject,
		opacity: 0.55,
	},
	scrollContent: {
		flexGrow: 1,
		justifyContent: "center",
		padding: 16,
	},
	content: {
		maxWidth: 400,
		width: "100%",
		alignSelf: "center",
	},
});
