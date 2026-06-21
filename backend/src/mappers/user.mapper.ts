import type { UserDTO } from "../../contracts/api.js";

type UserLike = {
  _id: unknown;
  name: string;
  email: string;
  avatarUrl?: string | null;
  initials: string;
  locale: string;
  preferences: string[];
  roles: string[];
  companyId: unknown;
};

export function toUserDTO(user: UserLike): UserDTO {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? undefined,
    initials: user.initials,
    locale: user.locale,
    preferences: user.preferences,
    roles: user.roles as UserDTO["roles"],
    companyId: String(user.companyId)
  };
}
