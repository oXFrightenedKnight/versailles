"use client";

import { Contract } from "@/app/game/page";
import { numberConverter } from "@/canvas/render";
import { Building, findBuildingNameByCategory, getBuilding } from "@repo/shared";
import { CircleMinus, CirclePlus } from "lucide-react";
import { useState } from "react";

export default function ContractComponent({
  contract,
  buildings,
}: {
  contract: Contract;
  buildings: Building[];
}) {
  const [amount, setAmount] = useState<number>(contract.amount);
  const startBuilding = getBuilding({ buildings, id: contract.startBuildingId });
  const endBuilding = getBuilding({ buildings, id: contract.endBuildingId });

  const startName = startBuilding
    ? findBuildingNameByCategory({
        buildingCategory: startBuilding?.category,
        level: startBuilding?.level,
      })
    : null;
  const endName = endBuilding
    ? findBuildingNameByCategory({
        buildingCategory: endBuilding?.category,
        level: endBuilding?.level,
      })
    : null;
  const dist = contract.hexIds.length - 1;

  return (
    <div className="w-full h-[40px] bg-gray-800 rounded-xl p-2 flex justify-center items-center gap-2">
      <div className="w-[60%] h-full flex justify-between items-center">
        <div>{startName}</div>
        <div>{dist}</div>
        <div>{endName}</div>
      </div>
      <div className="flex justify-center items-center w-[40%]">
        <div
          className="flex justify-center items-center p-1 border-gray-700 border rounded-md bg-gray-900 shadow-md shadow-black"
          onClick={(e) => {
            if (e.shiftKey) {
              setAmount(Math.max(amount - 100, 0));
            } else {
              setAmount(Math.max(amount - 10, 0));
            }
          }}
        >
          <CircleMinus className="w-4 h-4 text-amber-200 "></CircleMinus>
        </div>
        {/* Display amount */}
        <div className="bg-gray-800 text-white rounded-md p-1 w-16 flex justify-center items-center">
          {numberConverter(amount.toString())}
        </div>
        {/* Addition */}
        <div
          className="flex justify-center items-center p-1 border-gray-700 border rounded-md bg-gray-900 shadow-md shadow-black"
          onClick={(e) => {
            if (e.shiftKey) {
              setAmount(Math.min(amount + 100, 1_000_000));
            } else {
              setAmount(Math.min(amount + 10, 1_000_000));
            }
          }}
        >
          <CirclePlus className="w-4 h-4 text-amber-200 "></CirclePlus>
        </div>
      </div>
    </div>
  );
}
