import { getNationFlagURL, OpenMenus } from "@/lib/data";
import { typedEntries } from "@repo/shared";
import { Menu } from "lucide-react";
import Image from "next/image";
import ResourceLabel from "../GameComponents/ResurceLabel";
import { Button } from "../ui/button";
import { Dispatch, SetStateAction } from "react";
import { useGameStore } from "@/lib/stores/gameStore";
import { useOptimisticResources } from "@/hooks/useOptimisticResources";

export default function GameNavbar({
  openMenu,
  setOpenMenu,
  settingsOpen,
  setSettingsOpen,
}: {
  openMenu: OpenMenus;
  setOpenMenu: Dispatch<SetStateAction<OpenMenus>>;
  settingsOpen: boolean;
  setSettingsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const effectiveResources = useOptimisticResources();

  const playerNation = useGameStore((s) => s.playerNation);

  const handleMenuToggle = (opened: OpenMenus) => {
    if (openMenu === opened) {
      setOpenMenu("none");
    } else {
      setOpenMenu(opened);
    }
  };
  const handleSettingsToggle = () => {
    setSettingsOpen(!settingsOpen);
  };
  return (
    <div className="absolute left-0 top-0 pointer-events-auto h-[10%] w-full">
      <div className="flex justify-start items-center h-full bg-gray-800">
        <div className="flex justify-between items-center w-full h-full p-1">
          <Image
            src={getNationFlagURL(playerNation?.id)}
            alt="nation flag"
            width={1463}
            height={962}
            className="w-auto h-full p-[1px] rounded-[8px]"
          ></Image>
          <div className="w-full h-full flex justify-between items-center">
            <div className="m-2 flex justify-start items-center gap-2 h-full w-auto max-w-[50%] p-1.5 pb-2">
              {typedEntries(effectiveResources).map(([resource, amount]) =>
                amount !== undefined ? (
                  <ResourceLabel key={resource} resource={resource} amount={amount}></ResourceLabel>
                ) : null
              )}
            </div>
            <div className="h-full flex items-center justify-center border">
              <div className="flex items-center justify-center border mr-2 gap-2">
                <Button onClick={() => handleMenuToggle("diplo")}>Diplomacy</Button>
                <Button onClick={() => handleMenuToggle("build")}>Build</Button>
                <Button onClick={() => handleSettingsToggle()}>
                  <Menu className="w-12 h-12 text-amber-200 rounded-xs shrink-0"></Menu>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
