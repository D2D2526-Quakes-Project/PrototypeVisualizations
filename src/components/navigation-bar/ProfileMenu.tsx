import { useProfileIds, useProfileData, useProfileActions, useStoreSaving } from "@/state";
import { PROFILE_LABELS, type BuiltInProfileId } from "@/state/default";
import { MenubarContent, MenubarMenu, MenubarRadioGroup, MenubarRadioItem, MenubarTrigger } from "../ui/menubar";
import { LoaderCircleIcon } from "lucide-react";

export function ProfileMenu() {
  const profileId = useProfileData((s) => s.profileId);
  const { setActiveProfile, resetProfile } = useProfileActions();
  const availableProfileIds = useProfileIds();

  const storeSaving = useStoreSaving();

  function pickProfile(profileId: BuiltInProfileId) {
    resetProfile(profileId);
    setActiveProfile(profileId);
  }

  return (
    <MenubarMenu>
      <MenubarTrigger>
        Profiles
        <span className="ml-1 text-xs font-normal text-neutral-400">({PROFILE_LABELS[profileId] ?? profileId})</span>
        {storeSaving && (
          <span className="ml-1 text-neutral-400" title="Saving...">
            <LoaderCircleIcon className="size-3 animate-spin" />
          </span>
        )}
      </MenubarTrigger>
      <MenubarContent>
        <div className="flex flex-col gap-2">
          <div className="px-2 text-[10px] text-neutral-500">Autosaved per building.</div>
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
