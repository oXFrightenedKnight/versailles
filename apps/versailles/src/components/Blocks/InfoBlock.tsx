import InfoComponent, { Info } from "./InfoComponent";

export default function InfoBlock({ info }: { info: Info }) {
  const type = info.find((obj) => obj.key === "Type")?.value;
  return (
    <div className="w-full bg-gray-800 rounded-xl">
      <div className="flex w-full justify-between items-center bg-gray-700 p-2 rounded-t-xl">
        <p>{type} Info</p>
      </div>

      <InfoComponent info={info}></InfoComponent>
    </div>
  );
}
