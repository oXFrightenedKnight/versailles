export async function createContext({ clerkId }: { clerkId: string | null }) {
  return { clerkId };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
// context is whatever createContext returns
