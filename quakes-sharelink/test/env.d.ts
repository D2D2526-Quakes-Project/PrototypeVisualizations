declare module 'cloudflare:test' {
	// Required module augmentation shape for worker test env bindings.
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	interface ProvidedEnv extends Env {}
}
