"use client";

export type Info = {
  key: string;
  value: string;
}[];

export default function InfoComponent({ info }: { info: Info }) {
  return (
    <div className="w-full rounded-xl flex flex-col justify-center items-center relative group p-2">
      {info.map((i, key) => (
        <div key={key} className="flex w-full justify-between items-center">
          <div>{i.key}</div>
          <div>{i.value}</div>
        </div>
      ))}
    </div>
  );
}
