import { Progress } from "../ui/progress";
import { Field, FieldLabel } from "../ui/field";

export default function TrainingComponent({
  amount,
  progress,
}: {
  amount: number;
  progress: number;
}) {
  const value = progress * 100;
  return (
    <div className="w-full h-[40px] bg-gray-800 rounded-xl p-2">
      <div className="w-full h-full flex justify-between items-center">
        <div className="bg-gray-700 text-white">{amount}</div>
        <Field className="w-full max-w-sm">
          <FieldLabel htmlFor="progress-upload">
            <span>Training Progress</span>
            <span className="ml-auto">{value}</span>
          </FieldLabel>
          <Progress value={value} className="w-[50%]"></Progress>
        </Field>
      </div>
    </div>
  );
}
