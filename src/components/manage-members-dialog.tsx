"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	addGroupMemberAction,
	removeGroupMemberAction,
} from "@/lib/groups-actions";
import type { GroupSummary } from "@/lib/groups";
import type { UserSummary } from "@/lib/expenses";

type Props = {
	group: GroupSummary;
	members: UserSummary[];
	allUsers: UserSummary[];
};

export function ManageMembersDialog({ group, members, allUsers }: Props) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [selectedToAdd, setSelectedToAdd] = useState<string>("");
	const [pendingId, setPendingId] = useState<string | null>(null);

	const memberIds = new Set(members.map((m) => m.id));
	const candidates = allUsers.filter((u) => !memberIds.has(u.id));

	async function handleAdd() {
		if (!selectedToAdd) return;
		setPendingId(selectedToAdd);
		const result = await addGroupMemberAction({
			groupId: group.id,
			userId: selectedToAdd,
		});
		setPendingId(null);
		if (!result.ok) {
			toast.error(result.error);
			return;
		}
		toast.success("Member added");
		setSelectedToAdd("");
		router.refresh();
	}

	async function handleRemove(userId: string) {
		setPendingId(userId);
		const result = await removeGroupMemberAction({
			groupId: group.id,
			userId,
		});
		setPendingId(null);
		if (!result.ok) {
			toast.error(result.error);
			return;
		}
		toast.success("Member removed");
		router.refresh();
	}

	const candidateItems = Object.fromEntries(
		candidates.map((u) => [u.id, u.name]),
	);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={
					<Button variant="outline" size="sm" aria-label="manage members">
						<Settings />
					</Button>
				}
			/>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{group.name} — members</DialogTitle>
					<DialogDescription>
						Anyone in the group can add or remove members.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-2">
					<Label>current members</Label>
					<ul className="flex flex-col gap-1.5">
						{members.map((u) => (
							<li
								key={u.id}
								className="flex items-center justify-between gap-2 text-sm"
							>
								<span className="flex flex-col">
									<span>{u.name}</span>
									<span className="text-xs text-muted-foreground">
										{u.email}
									</span>
								</span>
								<Button
									variant="ghost"
									size="icon-sm"
									onClick={() => handleRemove(u.id)}
									disabled={pendingId === u.id || members.length <= 1}
									aria-label={`remove ${u.name}`}
								>
									<UserMinus />
								</Button>
							</li>
						))}
					</ul>
				</div>

				<Separator />

				<div className="flex flex-col gap-2">
					<Label>add a member</Label>
					{candidates.length === 0 ? (
						<p className="text-xs text-muted-foreground">
							No other users to add.
						</p>
					) : (
						<div className="flex items-center gap-2">
							<Select
								items={candidateItems}
								value={selectedToAdd}
								onValueChange={(v) => setSelectedToAdd(v as string)}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Choose a user" />
								</SelectTrigger>
								<SelectContent>
									{candidates.map((u) => (
										<SelectItem key={u.id} value={u.id}>
											<span className="flex flex-col text-left">
												<span>{u.name}</span>
												<span className="text-xs text-muted-foreground">
													{u.email}
												</span>
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Button
								type="button"
								size="sm"
								onClick={handleAdd}
								disabled={!selectedToAdd || pendingId === selectedToAdd}
							>
								<UserPlus />
								add
							</Button>
						</div>
					)}
				</div>

				<DialogFooter>
					<DialogClose render={<Button variant="outline" />}>
						done
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
