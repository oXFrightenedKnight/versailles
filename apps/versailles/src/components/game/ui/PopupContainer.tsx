import { useUIStore } from "@/lib/stores/uiStore";
import { useEffect } from "react";

export default function PopupContainer() {
  const popup = useUIStore((s) => s.popup);
  const setPopup = useUIStore((s) => s.setPopup);

  useEffect(() => {
    if (!popup) return;

    const timer = setTimeout(() => {
      setPopup(null);
    }, 8500);

    return () => clearTimeout(timer);
  }, [popup]);

  if (!popup) return null;
  return (
    <div
      key={popup.id}
      className={`w-full h-full flex justify-center items-start max-h-full animate-popup p-2`}
    >
      <div className="w-full h-auto flex justify-center items-center bg-gray-900 rounded-md text-white p-2">
        <div className="flex flex-col gap-1 w-full h-full bg-gray-800 rounded-md p-2">
          {popup?.header && <span className="text-md">{popup.header}</span>}
          <span className="text-xs">{popup?.body}</span>
        </div>
      </div>
    </div>
  );
}
