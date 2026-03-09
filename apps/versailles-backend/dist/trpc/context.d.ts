export declare function createContext({ clerkId }: {
    clerkId: string | null;
}): Promise<{
    clerkId: string | null;
}>;
export type Context = Awaited<ReturnType<typeof createContext>>;
