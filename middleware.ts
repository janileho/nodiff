import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
	const session = req.cookies.get("session");
	if (req.nextUrl.pathname.startsWith("/app") && !session) {
		const url = new URL("/login", req.url);
		return NextResponse.redirect(url);
	}
	return NextResponse.next();
}

export const config = {
	matcher: ["/app/:path*"],
}; 