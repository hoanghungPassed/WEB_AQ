import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({ subsets: ["latin"] });

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
		<html lang="en" className="h-full antialiased dark">
			<body className={`${inter.className} min-h-full flex flex-col`}>
				<AuthProvider>{children}</AuthProvider>
			</body>
		</html>
	);
}
