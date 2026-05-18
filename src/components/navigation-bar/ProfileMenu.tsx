import { useProfileIds, useProfileData, useProfileActions } from "@/state";
import { MenubarContent, MenubarMenu, MenubarRadioGroup, MenubarRadioItem, MenubarTrigger } from "../ui/menubar";

export function ProfileMenu() {
  const profileId = useProfileData((s) => s.profileId);
  const { setActiveProfile } = useProfileActions();
  const availableProfileIds = useProfileIds();

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
              </MenubarRadioItem>
            ))}
          </MenubarRadioGroup>
        </div>
      </MenubarContent>
    </MenubarMenu>
  );
}
