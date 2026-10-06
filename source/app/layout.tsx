import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "KonfiCamp · Ev. Jugend Lauenburg⁴", description: "Materialverwaltung für das KonfiCamp der Ev. Jugend Lauenburg⁴", icons: { icon: "/jugend-logo.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="de"><body>{children}</body></html>; }
