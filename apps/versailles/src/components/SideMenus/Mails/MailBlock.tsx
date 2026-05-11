import { getMailText } from "@/lib/helpers/mails";
import { Mail } from "@repo/shared";

export default function MailBlock({ mail }: { mail: Mail }) {
  const text = getMailText(mail.type);

  {
    /*return (
    <div className="w-full h-auto p-1">
      <div className="flex flex-col justify-center items-center text-white">
        Header --- comment this
        <div className="w-full flex justify-start items-center">
          <span className="text-xl">{text.header}</span>
        </div>

        {/* Body --- comment this
        <div className="w-full flex justify-start items-center">
          <span className="">{text.body}</span>
        </div>

        {/* Footer --- comment this
        <div className="w-full flex-justify-end items-center">
          <span>{mail.createdAt}</span>
        </div>
      </div>
    </div>
  ); 
  */
  }
}
