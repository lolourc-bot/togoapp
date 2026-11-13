import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BrandLogo } from "./BrandLogo";
import { SessionPhone } from "./landing/HeroPhone";

/**
 * Left side of the desktop login: a full-bleed photo of someone training, darkened for legibility, with the real
 * athlete session screen floating on a phone in front. Without the photo file it falls back to a brand gradient.
 */
const PHOTO = "/login-athlete.jpg";

const POINTS = ["Planificá semanas enteras en minutos", "Tus atletas entrenan desde el celular", "Cobrá las cuotas desde el mismo lugar"];

export function LoginShowcase() {
  // Only show the photo once it has actually loaded, so a missing file never shows a broken image.
  const [photoOk, setPhotoOk] = useState(false);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setPhotoOk(true);
    img.src = PHOTO;
  }, []);
  return (
    <div className="relative hidden flex-1 overflow-hidden bg-[linear-gradient(150deg,#023E66_0%,#011726_70%)] md:block">
      {photoOk ? (
        <img
          src={PHOTO}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[34%_center]"
        />
      ) : null}
      {/* legibility: dark from the left and the bottom, photo stays visible top-right */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(1,23,38,0.92)_0%,rgba(1,23,38,0.7)_40%,rgba(1,23,38,0.05)_75%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(0deg,rgba(1,23,38,0.85),transparent)]" />

      <div className="relative flex h-full min-h-screen flex-col justify-between p-14 xl:p-20">
        <div className="flex items-center gap-2.5 text-white">
          <BrandLogo className="h-9 w-9" />
          <span className="text-[24px] font-extrabold tracking-tight">TOGO</span>
        </div>

        <div className="max-w-[440px]">
          <h2 className="text-[40px] font-extrabold leading-[1.08] tracking-tight text-white xl:text-[46px]">
            Entrenar a tus atletas nunca fue tan fácil.
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-white/70">
            El sistema operativo para entrenadores y clubes.
          </p>
          <ul className="mt-8 flex flex-col gap-3">
            {POINTS.map((t) => (
              <li key={t} className="flex items-center gap-3 text-[15px] text-white/90">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0272B7] text-[11px] font-bold text-white">✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <span className="text-[12px] text-white/40">© {new Date().getFullYear()} TOGO</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute bottom-10 right-10 hidden w-[200px] xl:block xl:w-[220px] [@media(max-height:760px)]:hidden"
      >
        <SessionPhone />
      </motion.div>
    </div>
  );
}
