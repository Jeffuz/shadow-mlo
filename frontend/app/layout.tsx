import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Shadow-MLO",
    template: "%s | Shadow-MLO",
  },
  description:
    "Shadow-MLO monitors model artifacts, runs optimization candidates, and recommends deployment-ready TensorRT artifacts.",
  applicationName: "Shadow-MLO",
  keywords: [
    "Shadow-MLO",
    "model optimization",
    "TensorRT",
    "ML deployment",
    "artifact monitoring",
  ],
  openGraph: {
    title: "Shadow-MLO",
    description:
      "Monitor model artifacts, evaluate optimization candidates, and select deployment-ready runtime artifacts.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
