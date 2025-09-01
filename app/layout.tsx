import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import TopBar from "@/components/TopBar";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Laakaii - AI-Powered Math Tutoring for Medical School Entrance Exams",
	description: "Master mathematics for medical school entrance exams with Laakaii's AI-powered tutoring platform. Get personalized guidance, step-by-step solutions, and comprehensive practice problems.",
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="h-full">
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full flex flex-col`} suppressHydrationWarning>
				<TopBar />
				<main className="flex-1 min-h-0 pt-14">
					{children}
				</main>
			</body>
		</html>
	);
}
