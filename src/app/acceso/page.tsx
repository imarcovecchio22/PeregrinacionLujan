import type { Viewport } from "next";
import Image from "next/image";
import { Cinzel } from "next/font/google";
import { FondoTreboles } from "@/components/marca/FondoTreboles";
import { VirgenLujan } from "@/components/marca/VirgenLujan";
import { FormAcceso } from "./FormAcceso";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["600", "700"] });

// Barra del navegador del celular en el verde de San Patricio.
export const viewport: Viewport = { themeColor: "#0E5A32" };

export default async function Acceso(props: PageProps<"/acceso">) {
  const { siguiente } = await props.searchParams;
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-[#0E5A32] via-[#0B4A29] to-[#06331C]">
      <FondoTreboles />

      <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col items-center px-5 pt-6 pb-8">
        <div className="rounded-2xl bg-white p-1.5 shadow-lg ring-2 ring-[#E9B949]/70">
          <Image src="/escudo.webp" alt="Escudo del Grupo Scout N° 91 San Patricio" width={72} height={72} priority unoptimized />
        </div>

        <VirgenLujan className="mt-3 h-52 w-auto drop-shadow-[0_6px_14px_rgba(0,0,0,0.35)]" />

        <h1 className={`${cinzel.className} mt-2 text-center text-[1.65rem] leading-tight font-bold text-white`}>
          Peregrinación
          <br />a Luján
        </h1>
        <p className="mt-1 text-center text-sm font-medium tracking-wide text-[#F4E3A8]">Grupo Scout N° 91 · San Patricio</p>

        <div className="mt-5 w-full rounded-3xl border-t-4 border-[#E9B949] bg-white p-5 shadow-2xl">
          <FormAcceso siguiente={typeof siguiente === "string" ? siguiente : "/"} />
        </div>

        <p className={`${cinzel.className} mt-auto pt-6 text-center text-lg text-[#F4E3A8]`}>☘ Peregrinamos juntos ☘</p>
      </div>
    </main>
  );
}
