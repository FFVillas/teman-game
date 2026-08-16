export interface LfgRole {
  name: string;
  icon: string;
}

export const lfgRoles = {
  duelist: { name: "Duelist", icon: "/icons/role-duelist.svg" },
  initiator: { name: "Initiator", icon: "/icons/role-initiator.svg" },
  sentinel: { name: "Sentinel", icon: "/icons/role-sentinel.svg" },
  controller: { name: "Controller", icon: "/icons/role-controller.svg" },
} satisfies Record<string, LfgRole>;
