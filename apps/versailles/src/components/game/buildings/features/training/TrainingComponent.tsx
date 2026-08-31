import { TrainingProjection } from "@/lib/UI/mergeData/training/types";
import { numberConverter } from "@/lib/utils";
import { X } from "lucide-react";
import Image from "next/image";
import { Field, FieldLabel } from "../../../../ui/field";
import { Progress } from "../../../../ui/progress";
import { getResourceImage } from "@/lib/assets/resources";

export default function TrainingComponent({
  projection,
  cancelTraining,
  isOwnedByPlayer,
}: {
  projection: TrainingProjection;
  cancelTraining: (projection: TrainingProjection) => void;
  isOwnedByPlayer: boolean;
}) {
  const progress = projection.source === "server" ? projection.progress : 0;
  const value = Math.round((progress / projection.amount) * 100);

  return (
    <div className="w-full h-[75px] bg-gray-900 rounded-xl p-2">
      <div className="w-full h-full flex justify-between items-center gap-1">
        <div className="flex items-center justify-center h-full text-white rounded-md bg-gray-800  border-gray-600 border p-1 w-18 shrink-0">
          <Image
            alt="knight icon"
            src={getResourceImage("manpower")}
            width={32}
            height={32}
            className="h-5 w-5 shrink-0"
          ></Image>
          <span className="text-[14px]">{numberConverter(projection.amount)}</span>
        </div>
        <Field className="w-full h-full max-w-sm rounded-md p-1">
          <FieldLabel htmlFor="progress-upload">
            <span className="text-xs">Training Progress</span>
            <span className="ml-auto">{value}%</span>
          </FieldLabel>
          <Progress value={value} className="w-[50%] bg-gray-600"></Progress>
        </Field>
        <div
          inert={!isOwnedByPlayer}
          className="inert:opacity-50 flex bg-gray-800 border border-gray-600 p-1 gap-1 rounded-md text-amber-200 h-full justify-center items-center"
          onClick={() => {
            cancelTraining(projection);
          }}
        >
          <X className="w-6 h-6 shrink-0"></X>
        </div>
      </div>
    </div>
  );
}
