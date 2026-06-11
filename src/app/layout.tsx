import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({ subsets: ["latin"] });
const geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "AQ Media Quản lý nội bộ",
	description: "Hệ thống quản lý nội bộ AQ Media",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="vi" className="h-full antialiased dark">
			<body className={`${geistSans.className} min-h-full flex flex-col bg-background text-foreground`}>
				<AuthProvider>{children}</AuthProvider>
			</body>
		</html>
	);
}
