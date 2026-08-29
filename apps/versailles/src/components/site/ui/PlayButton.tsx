import { Play } from "lucide-react";

export default function PlayButton() {
  return (
    <>
      <div
        className="absolute w-12 h-12 inset-0 m-auto rounded-full bg-black/30 border-2 border-primary flex 
        justify-center items-center cursor-pointer overflow-hidden
        shadow-[inset_0_0_12px_color-mix(in_oklab,var(--primary)_36%,transparent)]"
      >
        <Play className="w-6 h-6 text-primary"></Play>
      </div>
    </>
  );
}
