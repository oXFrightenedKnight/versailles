"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormData, formSchema } from "@/schemas/contact";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

export default function ContactForm() {
  const [isSending, setIsSending] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<"Success!" | "Failed!" | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });
  const onSubmit = async (data: FormData) => {
    setIsSending(true);
    try {
      const result = await fetch("/api/contact", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });

      if (result.ok) {
        setStatusMessage("Success!");
        form.reset();
      } else {
        setStatusMessage("Failed!");
      }
    } catch {
      setStatusMessage("Failed!");
    } finally {
      setIsSending(false);
    }

    setTimeout(() => {
      setStatusMessage(null);
    }, 3000);
  };

  return (
    <>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full flex flex-col justify-center items-center gap-5"
      >
        <FieldGroup className="flex flex-col justify-center items-center w-full gap-2">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="w-full flex flex-col gap-0">
                <FieldLabel htmlFor={field.name}>Your Name</FieldLabel>

                <Input
                  {...field}
                  id={field.name}
                  type="text"
                  placeholder="Name"
                  aria-invalid={fieldState.invalid}
                  className="bg-card rounded-sm w-full"
                ></Input>

                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="flex flex-col gap-0">
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>

                <Input
                  {...field}
                  id={field.name}
                  type="text"
                  placeholder="email@example.com"
                  aria-invalid={fieldState.invalid}
                  className="bg-card rounded-sm"
                ></Input>

                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="message"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className=" flex flex-col gap-0">
                <FieldLabel htmlFor={field.name}>Message</FieldLabel>

                <Textarea
                  {...field}
                  id={field.name}
                  placeholder="Type your message here"
                  aria-invalid={fieldState.invalid}
                  className="h-32 resize-none bg-card rounded-sm"
                ></Textarea>

                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        <Button type="submit" className="w-full cursor-pointer text-2xl p-5" disabled={isSending}>
          {isSending ? (
            <LoaderCircle className="w-10 h-10 shrink-0 text-primary-foreground animate-spin"></LoaderCircle>
          ) : statusMessage ? (
            statusMessage
          ) : (
            "Send"
          )}
        </Button>
      </form>
    </>
  );
}
