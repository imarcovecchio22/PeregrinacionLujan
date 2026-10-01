import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ACCESO, tokenValido } from "@/lib/acceso";

// Todo detrás del código de acceso (hay datos personales). Las Server Actions y la API
// además lo verifican por su cuenta (ver src/lib/acceso.ts).
export function proxy(req: NextRequest) {
  if (tokenValido(req.cookies.get(COOKIE_ACCESO)?.value)) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sin acceso: ingresá el código de nuevo." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/acceso";
  url.search = "";
  url.searchParams.set("siguiente", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!acceso|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest).*)"],
};
