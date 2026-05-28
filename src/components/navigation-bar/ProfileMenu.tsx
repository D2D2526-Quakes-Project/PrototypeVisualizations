import { useProfileIds, useProfileData, useProfileActions, useStoreSaving } from "@/state";
import { PROFILE_LABELS, type BuiltInProfileId } from "@/state/default";
import { MenubarContent, MenubarMenu, MenubarRadioGroup, MenubarRadioItem, MenubarTrigger } from "../ui/menubar";
import { LoaderCircleIcon } from "lucide-react";

export function ProfileMenu() {
  const profileId = useProfileData((s) => s.profileId);
  const { setActiveProfile } = useProfileActions();
  const availableProfileIds = useProfileIds();

  const storeSaving = useStoreSaving();

  function pickProfile(profileId: BuiltInProfileId) {
    setActiveProfile(profileId);
  }

  return (
    <MenubarMenu>
      <MenubarTrigger>
        Profiles
        <span className="text-muted-foreground ml-1 text-xs font-normal">
          ({PROFILE_LABELS[profileId] ?? profileId})
        </span>
        {storeSaving && (
          <span className="text-muted-foreground ml-1" title="Saving...">
            <LoaderCircleIcon className="size-3 animate-spin" />
          </span>
        )}
      </MenubarTrigger>
      <MenubarContent>
        <div className="flex flex-col gap-2">
          <div className="text-muted-foreground px-2 text-[10px]">Autosaved per building.</div>
          <MenubarRadioGroup
            value={profileId}
            onValueChange={(profileId) => pickProfile(profileId as BuiltInProfileId)}>
            {availableProfileIds.map((profile) => (
              <MenubarRadioItem key={profile} value={profile} className="justify-between">
                {PROFILE_LABELS[profile] ?? profile}
              </MenubarRadioItem>
            ))}
          </MenubarRadioGroup>
        </div>
      </MenubarContent>
    </MenubarMenu>
  );
}
