import { Building } from "@repo/shared";
import StorageComponent from "./StorageComponent";

export default function StorageBlock({
  building,
  buildingType,
}: {
  building: Building;
  buildingType: string;
}) {
  return (
    <>
      {building.storage && building.storage.length > 0 && (
        <div className="w-full bg-gray-800 rounded-xl">
          <div className="flex w-full justify-between items-center bg-gray-700 p-2 rounded-t-xl">
            <p>{buildingType} Storage</p>
          </div>

          <div className="w-full grid grid-cols-4 gap-2">
            {building.storage.map((storage, key) => (
              <StorageComponent
                key={key}
                amount={storage.amount}
                type={storage.type}
                building={building}
              ></StorageComponent>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
