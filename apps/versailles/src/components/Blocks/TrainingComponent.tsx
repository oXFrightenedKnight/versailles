import { Progress } from "../ui/progress";
import { Field, FieldLabel } from "../ui/field";
import Image from "next/image";
import { numberConverter } from "@/canvas/render";
import { X } from "lucide-react";
import { cancelClientTraining, cancelServerTraining, TrainingVM } from "@/lib/helpers/uiTraining";
import { useCallback } from "react";

export default function TrainingComponent({ data }: { data: TrainingVM }) {
  const value = Math.round((data.progress / data.amount) * 100);
  const ICON = `/icons/manpower.png`;

  // FUNCTIONS
  const cancelMergedTraining = useCallback(() => {
    if (data.fromServer) {
      cancelServerTraining(data.id);
    } else {
      cancelClientTraining(data.id);
    }
  }, [data]);
  return (
    <div className="w-full h-[75px] p-2">
      <div className="w-full h-full flex justify-between items-center rounded-md gap-1">
        <div className="flex items-center justify-center h-full text-white rounded-md bg-gray-900 border-gray-600 border p-1 w-18 shrink-0">
          <Image
            alt="knight icon"
            src={ICON}
            width={32}
            height={32}
            className="h-5 w-5 shrink-0"
          ></Image>
          <span className="text-[14px]">{numberConverter(data.amount.toString())}</span>
        </div>
        <Field className="w-full h-full max-w-sm bg-gray-900 border-gray-600 border rounded-md p-1">
          <FieldLabel htmlFor="progress-upload">
            <span className="text-xs">Training Progress</span>
            <span className="ml-auto">{value}%</span>
          </FieldLabel>
          <Progress value={value} className="w-[50%] bg-gray-600"></Progress>
        </Field>
        <div
          className="flex bg-gray-900 border border-gray-600 p-1 gap-1 rounded-md text-amber-200 h-full justify-center items-center"
          onClick={() => {
            cancelMergedTraining();
          }}
        >
          <X className="w-6 h-6 shrink-0"></X>
        </div>
      </div>
    </div>
  );
}
