import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
	BarChart2,
	LineChart,
	LogOut,
	Receipt,
	Settings,
	TrendingUp,
	User,
	Zap,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";

const NAV_LINKS = [
	{ icon: BarChart2, label: "行情调研", to: "/market-research" },
	{ icon: TrendingUp, label: "Alpha 定投", to: "/alpha-dca" },
	{ icon: Receipt, label: "订单", to: "/orders" },
	{ icon: LineChart, label: "资金曲线", to: "/profit-curve" },
] as const;

function navClass(isActive: boolean): string {
	const base =
		"flex w-full items-center gap-3 px-5 py-3 text-sm font-medium transition-all";
	if (isActive) {
		return `${base} border-r-2 border-[#2563eb] bg-[#2563eb]/10 text-[#b4c5ff]`;
	}
	return `${base} text-[#8d90a0] hover:bg-[#131b2e] hover:text-[#dae2fd]`;
}

export default function Sidebar() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const { data: session } = authClient.useSession();
	const navigate = useNavigate();

	const handleSignOut = () => {
		authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					navigate({ to: "/login" });
				},
			},
		});
	};

	return (
		<aside className="flex h-full w-60 shrink-0 flex-col border-[#1e293b] border-r bg-[#0b1326]">
			<div className="border-[#1e293b] border-b px-6 py-5">
				<div className="flex items-center gap-3">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563eb]">
						<Zap className="h-4 w-4 text-white" />
					</div>
					<div>
						<h1 className="font-bold text-[#dae2fd] text-sm leading-tight">
							Trade Pilot
						</h1>
						<p className="text-[#8d90a0] text-[10px]">Institutional Grade</p>
					</div>
				</div>
			</div>

			<nav className="flex-1 overflow-y-auto py-4">
				{NAV_LINKS.map((link) => {
					const Icon = link.icon;
					const isActive =
						pathname === link.to || pathname.startsWith(`${link.to}/`);
					return (
						<Link className={navClass(isActive)} key={link.to} to={link.to}>
							<Icon className="h-4 w-4 shrink-0" />
							{link.label}
						</Link>
					);
				})}
			</nav>

			<div className="border-[#1e293b] border-t">
				<Link className={navClass(pathname === "/settings")} to="/settings">
					<Settings className="h-4 w-4 shrink-0" />
					设置
				</Link>

				<div className="px-4 py-4">
					{session ? (
						<div className="flex items-center gap-2 rounded-lg border border-[#1e293b] bg-[#171f33] p-3">
							<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2563eb]/20">
								<User className="h-3.5 w-3.5 text-[#b4c5ff]" />
							</div>
							<div className="min-w-0 flex-1">
								<p className="truncate font-medium text-[#dae2fd] text-xs">
									{session.user.name}
								</p>
								<p className="truncate text-[#8d90a0] text-[10px]">
									{session.user.email}
								</p>
							</div>
							<button
								className="shrink-0 rounded p-1.5 text-[#8d90a0] transition-colors hover:bg-[#222a3d] hover:text-[#ffb4ab]"
								onClick={handleSignOut}
								title="退出登录"
								type="button"
							>
								<LogOut className="h-3.5 w-3.5" />
							</button>
						</div>
					) : (
						<Link
							className="flex w-full items-center justify-center rounded-lg bg-[#2563eb] px-4 py-2.5 font-semibold text-sm text-white transition-opacity hover:opacity-90"
							to="/login"
						>
							登录账户
						</Link>
					)}
				</div>
			</div>
		</aside>
	);
}
