import { Toaster as Sonner } from "sonner";
import { AlertCircle, CheckCircle, Info } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const base = "!flex !items-center !gap-[10px] !px-4 !py-3 !rounded-[12px] !shadow-[0_4px_16px_rgba(0,0,0,0.12)] !max-w-[320px] !text-[13px]";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="top-right"
      offset={24}
      duration={3000}
      className="toaster group"
      icons={{
        success: <CheckCircle size={16} color="#22C55E" />,
        error: <AlertCircle size={16} color="#EF4444" />,
        info: <Info size={16} color="#3B82F6" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: `${base} !bg-[#FFFFFF] !text-[#374151] !border !border-[#E2E8F0]`,
          success: "!bg-[#111827] !text-[#FFFFFF] !font-medium !border-[#111827]",
          error: "!bg-[#FEF2F2] !text-[#374151] !border-[#FECACA]",
          info: "!bg-[#FFFFFF] !text-[#374151] !border-[#E2E8F0]",
          description: "!text-[#94A3B8]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
