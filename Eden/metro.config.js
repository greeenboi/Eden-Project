/** @type {import('expo/metro-config').MetroConfig} */

const { mergeConfig } = require("@react-native/metro-config");
const { withRozenite } = require("@rozenite/metro");
const { withRozeniteExpoAtlasPlugin } = require("@rozenite/expo-atlas-plugin");
const {	withRozeniteRequireProfiler } = require("@rozenite/require-profiler-plugin/metro");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const defaultConfig = getDefaultConfig(__dirname);
const nativeWindConfig = withNativeWind(defaultConfig, {
	input: "./global.css",
	inlineRem: 16,
});

module.exports = withRozenite(
	mergeConfig(nativeWindConfig, {
		// Your existing Metro configuration
	}),
	{
		enabled: process.env.WITH_ROZENITE === "true",
		enhanceMetroConfig: (config) =>
			withRozeniteRequireProfiler(withRozeniteExpoAtlasPlugin(config)),
	},
);