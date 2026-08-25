import { X } from "lucide-react";

export function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="flex justify-center items-center p-1 border-gray-700 border rounded-[8px] m-2 bg-gray-900 shadow-md shadow-black"
      onClick={() => {
        onClose();
      }}
    >
      <X className="w-10 h-10 text-gold-1"></X>
    </div>
  );
}
