"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { setActiveGroupAction } from "@/lib/groups-actions";
import type { GroupSummary } from "@/lib/groups";

type Props = {
	groups: GroupSummary[];
	activeGroupId: string;
};

export function GroupSwitcher({ groups, activeGroupId }: Props) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const items = Object.fromEntries(groups.map((g) => [g.id, g.name]));

	function handleChange(next: string) {
		if (next === activeGroupId) return;
		startTransition(async () => {
			const result = await setActiveGroupAction({ groupId: next });
			if (!result.ok) {
				toast.error(result.error);
				return;
			}
			router.refresh();
		});
	}

	return (
		<Select
			items={items}
			value={activeGroupId}
			onValueChange={(v) => handleChange(v as string)}
			disabled={isPending}
		>
			<SelectTrigger className="min-w-40">
				<SelectValue placeholder="Select group" />
			</SelectTrigger>
			<SelectContent>
				{groups.map((g) => (
					<SelectItem key={g.id} value={g.id}>
						{g.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
