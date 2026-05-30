import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useProfileIds, useProfileData, useProfileActions, useStoreSaving } from "@/state";
import { BUILT_IN_PROFILE_DEFINITIONS, PROFILE_LABELS, type BuiltInProfileId } from "@/state/default";
import { MenubarContent, MenubarMenu, MenubarRadioGroup, MenubarRadioItem, MenubarTrigger } from "../ui/menubar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DATASET_LABELS, type OptionalDatasetKey } from "@/features/animation-data/data-loading/loadingTypes";
import { LoaderCircleIcon } from "lucide-react";

export function ProfileMenu() {
  const profileId = useProfileData((s) => s.profileId);
  const { setActiveProfile } = useProfileActions();
  const availableProfileIds = useProfileIds();
  const { datasetStates } = useAnimationData();

  const storeSaving = useStoreSaving();

  function pickProfile(profileId: BuiltInProfileId) {
    setActiveProfile(profileId);
  }

  function isProfileAvailable(profile: BuiltInProfileId): boolean {
    const def = BUILT_IN_PROFILE_DEFINITIONS.find((d) => d.profileId === profile);
    if (!def || def.requiredDatasets.length === 0) return true;
    return def.requiredDatasets.every((key) => datasetStates?.[key]?.available === true);
  }

  function unavailableDatasets(profile: BuiltInProfileId): OptionalDatasetKey[] {
    const def = BUILT_IN_PROFILE_DEFINITIONS.find((d) => d.profileId === profile);
    if (!def) return [];
    return def.requiredDatasets.filter((key) => datasetStates?.[key]?.available !== true);
  }

  return (
    <MenubarMenu>
      <MenubarTrigger className="whitespace-nowrap">
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
            {availableProfileIds.map((profile) => {
              const available = isProfileAvailable(profile);
              const missing = unavailableDatasets(profile);
              const item = (
                <MenubarRadioItem
                  key={profile}
                  value={profile}
                  disabled={!available}
                  className="justify-between"
                  onSelect={(e) => {
                    if (!available) e.preventDefault();
                  }}>
                  {PROFILE_LABELS[profile] ?? profile}
                </MenubarRadioItem>
              );

              if (available) return item;

              return (
                <Tooltip key={profile}>
                  <TooltipTrigger asChild>{item}</TooltipTrigger>
                  <TooltipContent side="right" className="max-w-60">
                    Requires {missing.map((k) => DATASET_LABELS[k as keyof typeof DATASET_LABELS]).join(", ")} &mdash; not available for this simulation
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </MenubarRadioGroup>
        </div>
      </MenubarContent>
    </MenubarMenu>
  );
}
