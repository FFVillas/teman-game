export interface LfgRole {
  name: string;
  icon: string;
}

export const lfgRoles = {
  duelist: { name: "Duelist", icon: "/roles/valorant/duelist.svg" },
  initiator: { name: "Initiator", icon: "/roles/valorant/initiator.svg" },
  sentinel: { name: "Sentinel", icon: "/roles/valorant/sentinel.svg" },
  controller: { name: "Controller", icon: "/roles/valorant/controller.svg" },
} satisfies Record<string, LfgRole>;
