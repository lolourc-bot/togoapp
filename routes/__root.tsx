import { Toaster } from "@/components/ui/sonner";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { AthleteTimer } from "@/components/togo/AthleteTimer";
import { ToguitoAssistant } from "@/components/togo/ToguitoAssistant";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "color-scheme", content: "light" },
      { title: "TOGO — Coaching deportivo" },
      { name: "description", content: "Plataforma de entrenamiento para coaches, atletas e instituciones." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "TOGO — Coaching deportivo" },
      { property: "og:description", content: "Plataforma de entrenamiento para coaches, atletas e instituciones." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Panel grande de escritorio para coaches (Sidebar) — no tiene equivalente en la app mobile
// de coach, así que si alguien llega acá desde un celular lo mandamos a /coach-app en vez de
// mostrarle el panel grande apretado en una pantalla chica. "/" queda afuera a propósito:
// routes/index.tsx ya resuelve esa redirección con el chequeo de rol (atleta/institución/coach).
const DESKTOP_COACH_PATH_PREFIXES = [
  "/atletas", "/equipos", "/biblioteca", "/marketplace-coach", "/facturacion",
  "/mensajes", "/bienestar", "/lab", "/configuracion", "/coach-notificaciones", "/sesiones",
];

function DeviceGuard() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.innerWidth < 768;
    const isDesktopCoachPath = DESKTOP_COACH_PATH_PREFIXES.some((p) => pathname.startsWith(p));
    // Ojo: a propósito NO redirigimos en sentido contrario (desktop -> "/" al entrar a
    // /coach-app). Mientras se está diseñando la app mobile, hace falta poder abrirla desde
    // una compu para iterar rápido sin depender de un celu/túnel.
    if (isMobile && isDesktopCoachPath) {
      navigate({ to: "/coach-app" });
    }
  }, [pathname, navigate]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // La app mobile de coach tiene su propio Toguito (el planificador por voz, en el tab de
  // abajo) — el bubble flotante global de dudas administrativas no entra ahí: queda fijo
  // abajo a la derecha y tapa justo ese tab.
  const showGlobalToguito = !pathname.startsWith("/coach-app");

  return (
    <QueryClientProvider client={queryClient}>
      <DeviceGuard />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster />
      <AthleteTimer />
      {showGlobalToguito ? <ToguitoAssistant /> : null}
    </QueryClientProvider>
  );
}
