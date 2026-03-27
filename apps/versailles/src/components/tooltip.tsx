type Position = "top" | "bottom";

export default function Tooltip({ text, position }: { text: string; position: Position }) {
  const isTop = position === "top";
  return (
    <>
      <div
        className={`
        absolute left-1/2 -translate-x-1/2
        ${isTop ? "bottom-full mt-2" : "top-full mb-2"}
        rounded-md bg-zinc-900 border border-zinc-700
        px-3 py-1 text-xs text-zinc-100
        opacity-0 group-hover:opacity-100
        transition
        shadow-lg
        pointer-events-none
        z-50
      `}
      >
        {text}
      </div>
    </>
  );
}
