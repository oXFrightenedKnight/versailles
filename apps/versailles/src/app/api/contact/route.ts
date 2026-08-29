import { formSchema } from "@/schemas/contact";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import z from "zod";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const result = formSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid form data", issues: z.treeifyError(result.error) },
        { status: 400 }
      );
    }

    if (!process.env.NOTIFY_EMAIL || !process.env.NOTIFY_PASS) {
      throw new Error("Email environment variables are missing");
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: process.env.NOTIFY_EMAIL, pass: process.env.NOTIFY_PASS },
    } satisfies SMTPTransport.Options);

    const info = await transporter.sendMail({
      from: `"Versailles Contact Form" <${process.env.NOTIFY_EMAIL}>`,
      to: process.env.NOTIFY_EMAIL,
      replyTo: result.data.email,
      subject: `Message from ${result.data.name} at Versailles form.`,
      text: `
        Name: ${result.data.name}
        Email: ${result.data.email}

        ${result.data.message}
      `.trim(),
    });

    return NextResponse.json({ ok: true, messageId: info.messageId }, { status: 200 });
  } catch (err) {
    console.log("Contact Sending Failed For:", err);
    return NextResponse.json({ error: "Contact form submission failed" }, { status: 500 });
  }
}
