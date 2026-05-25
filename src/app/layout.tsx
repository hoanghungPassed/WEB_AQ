import type { Metadata } from"next";
import { Geist, Geist_Mono } from"next/font/google";
import"./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
 variable:"--font-geist-sans",
 subsets: ["latin"],
});

const geistMono = Geist_Mono({
 variable:"--font-geist-mono",
 subsets: ["latin"],
});

export const metadata: Metadata = {
 title:"AQ Media Quản lý nội bộ",
 description:"Hệ thống quản lý nội bộ AQ Media",
};

export default function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 return (
 <html
 lang="en"
 className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
 >
 <body className="min-h-full flex flex-col">
 <AuthProvider>{children}</AuthProvider>
 </body>
 </html>
 );
}
