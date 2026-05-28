import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/ThemeProvider";
import { MenubarItem, MenubarSub, MenubarSubContent, MenubarSubTrigger } from "@/components/ui/menubar";

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <MenubarSub>
      <MenubarSubTrigger>
        <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        <span>Color theme</span>
      </MenubarSubTrigger>
      <MenubarSubContent>
        <MenubarItem onClick={() => setTheme("light")}>Light</MenubarItem>
        <MenubarItem onClick={() => setTheme("dark")}>Dark</MenubarItem>
        <MenubarItem onClick={() => setTheme("system")}>System</MenubarItem>
      </MenubarSubContent>
    </MenubarSub>
  );
}
