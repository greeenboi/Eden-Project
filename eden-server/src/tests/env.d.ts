declare module "cloudflare:test" {
	// Import the Env type from wrangler-generated types
	import type { Env } from "../lib/db";

	// ProvidedEnv controls the type of `import("cloudflare:test").env`
	interface ProvidedEnv extends Env {}
}
