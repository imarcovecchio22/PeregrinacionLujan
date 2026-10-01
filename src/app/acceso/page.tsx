import { FormAcceso } from "./FormAcceso";

export default async function Acceso(props: PageProps<"/acceso">) {
  const { siguiente } = await props.searchParams;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center p-4">
      <h1 className="text-xl font-bold">Peregrinación a Luján</h1>
      <p className="mt-1 text-gray-600">Ingresá el código que te pasaron los coordinadores.</p>
      <FormAcceso siguiente={typeof siguiente === "string" ? siguiente : "/"} />
    </main>
  );
}
