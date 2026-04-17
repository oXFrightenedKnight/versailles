import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import React from "react";

export type DropdownItem<T> = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  value: T;
};

export function Dropdown<T>({
  renderItem,
  renderButton,
  items,
  setValue,
  value,
}: {
  items: DropdownItem<T>[];
  renderButton?: (item?: DropdownItem<T>) => React.ReactNode;
  renderItem?: (item: DropdownItem<T>, isSelected: boolean) => React.ReactNode;
  setValue: React.Dispatch<React.SetStateAction<T>>;
  value: T;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {renderButton ? renderButton() : <Button variant="outline">Open</Button>}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40 bg-gray-800 border-gray-600" align="start">
        <DropdownMenuGroup>
          {items.map((item) => {
            const isSelected = item.value === value;

            return (
              <DropdownMenuItem
                key={item.id}
                className="cursor-pointer focus:bg-gray-700"
                onClick={() => setValue(item.value)}
              >
                {renderItem ? renderItem(item, isSelected) : item.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
