import z from "zod";

export const formSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100, "Your name is too long!"),
  email: z.string().trim().max(254, "Your email is too long!").pipe(z.email("Enter a valid email")),
  message: z.string().trim().min(1, "Please write a message").max(5000, "Your message is too long"),
});

export type FormData = z.infer<typeof formSchema>;
