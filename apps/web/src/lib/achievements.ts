import { toast } from "sonner";
import type { Achievement } from "@/lib/api";

export function toastNewAchievements(achievements: Achievement[]) {
  for (const achievement of achievements) {
    toast.success(`Achievement unlocked: ${achievement.title}`, {
      description: achievement.description,
    });
  }
}
