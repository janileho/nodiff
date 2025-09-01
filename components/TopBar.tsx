import Link from "next/link";
import { getCurrentUserFromSession } from "@/lib/auth";
import UserMenu from "@/components/UserMenu";

export default async function TopBar() {
	const user = await getCurrentUserFromSession();
	
	return (
		<header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-50/80 via-cyan-50/80 to-indigo-100/80 backdrop-blur-md border-b border-white/40 shadow-md">
			<nav className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between">
				{/* Left side - Logo */}
				<div className="flex items-center">
					<Link href="/" className="font-bold text-blue-900 text-lg hover:text-blue-700 transition-colors">
						Laak AI
					</Link>
				</div>
				
				{/* Right side - Navigation */}
				<div className="flex items-center gap-4">
					{user ? (
						<>
							<Link 
								href="/app" 
								className="hidden sm:inline text-blue-700 hover:text-blue-900 transition-colors font-medium px-2.5 py-1.5 rounded-md hover:bg-white/20 text-sm"
							>
								App
							</Link>
							<UserMenu user={user} />
						</>
					) : (
						<>
							<Link 
								href="/login" 
								className="text-blue-700 hover:text-blue-900 transition-colors font-medium px-2.5 py-1.5 rounded-md hover:bg-white/20 text-sm"
							>
								Login
							</Link>
						</>
					)}
				</div>
			</nav>
		</header>
	);
} 