import { useProfileIds, useProfileStore } from "@/state";
import { RotateCcwIcon } from "lucide-react";
import { Button } from "../ui/button";
import { MenubarContent, MenubarMenu, MenubarRadioGroup, MenubarRadioItem, MenubarTrigger } from "../ui/menubar";

export function ProfileMenu() {
  const profileId = useProfileStore((s) => s.profileId);
  const setActiveProfile = useProfileStore((s) => s.setActiveProfile);
  const availableProfileIds = useProfileIds();

  const resetProfile = useProfileStore((s) => s.resetProfile);

  const handleResetProfile = (e: React.MouseEvent, profId: string) => {
    e.stopPropagation();
    if (!window.confirm(`Reset profile "${profId}" to its default state?`)) return;
    resetProfile(profId);
  };

  // void refreshToken;

  return (
    <MenubarMenu>
      <MenubarTrigger>Profiles</MenubarTrigger>
      <MenubarContent>
        <div className="flex flex-col gap-2">
          <div className="px-2 text-[10px] text-neutral-500">Autosaved per building.</div>
          <MenubarRadioGroup value={profileId} onValueChange={setActiveProfile}>
            {availableProfileIds.map((profile) => (
              <MenubarRadioItem key={profile} value={profile} className="justify-between capitalize">
                {profile}
                <Button variant={"ghost"} size={"icon-xs"} onClick={(e) => handleResetProfile(e, profile)}>
                  <RotateCcwIcon />
                </Button>
              </MenubarRadioItem>
            ))}
          </MenubarRadioGroup>
        </div>
      </MenubarContent>
    </MenubarMenu>
  );
}
