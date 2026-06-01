"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGroupAction } from "@/lib/groups-actions";
import type { UserSummary } from "@/lib/expenses";

type Props = {
	allUsers: UserSummary[];
	currentUserId: string;
};

export function CreateGroupDialog({ allUsers, currentUserId }: Props) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [memberIds, setMemberIds] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	function reset() {
		setName("");
		setMemberIds([]);
		setError(null);
	}

	function handleOpenChange(next: boolean) {
		setOpen(next);
		if (!next) reset();
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		if (!name.trim()) {
			setError("Name is required");
			return;
		}
		setIsSubmitting(true);
		const result = await createGroupAction({
			name: name.trim(),
			memberUserIds: memberIds,
		});
		setIsSubmitting(false);
		if (!result.ok) {
			setError(result.error);
			toast.error(result.error);
			return;
		}
		toast.success("Group created");
		setOpen(false);
		reset();
		router.refresh();
	}

	const otherUsers = allUsers.filter((u) => u.id !== currentUserId);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger
				render={
					<Button variant="outline" size="sm">
						<Plus />
						new group
					</Button>
				}
			/>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>new group</DialogTitle>
					<DialogDescription>
						You'll be added automatically. Pick any other members.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="group-name">name</Label>
						<Input
							id="group-name"
							placeholder="roommates"
							value={name}
							onChange={(e) => setName(e.target.value)}
							disabled={isSubmitting}
							autoFocus
						/>
					</div>

					{otherUsers.length > 0 ? (
						<div className="flex flex-col gap-2">
							<Label>members</Label>
							<div className="flex flex-col gap-2 min-h-20 max-h-60 overflow-y-auto">
								{otherUsers.map((u) => {
									const checked = memberIds.includes(u.id);
									return (
										<label
											key={u.id}
											className="flex items-center gap-2 text-sm"
										>
											<Checkbox
												checked={checked}
												onCheckedChange={(isChecked) => {
													if (isChecked) {
														setMemberIds((prev) => [...prev, u.id]);
													} else {
														setMemberIds((prev) =>
															prev.filter((id) => id !== u.id),
														);
													}
												}}
												disabled={isSubmitting}
											/>
											<span>{u.name}</span>
											<span className="text-muted-foreground text-xs">
												{u.email}
											</span>
										</label>
									);
								})}
							</div>
						</div>
					) : (
						<p className="text-xs text-muted-foreground">
							No other users to add yet — you can invite them later.
						</p>
					)}

					{error ? (
						<p className="text-xs text-destructive">{error}</p>
					) : null}

					<DialogFooter>
						<DialogClose render={<Button variant="outline" />}>
							cancel
						</DialogClose>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "creating..." : "create group"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
