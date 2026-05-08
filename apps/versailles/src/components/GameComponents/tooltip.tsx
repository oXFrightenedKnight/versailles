type Position = "top" | "bottom";

export default function Tooltip({
  text,
  position,
  offset,
}: {
  text: string;
  position: Position;
  offset?: number;
}) {
  const isTop = position === "top";
  return (
    <>
      <div
        style={{
          transform: `translateX(calc(-50% + ${offset ?? 0}px))`,
        }}
        className={`
        absolute left-1/2
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
