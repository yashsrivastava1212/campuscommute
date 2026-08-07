export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  isNewUser: boolean;
  profileComplete: boolean;
  activeCarpoolId?: string | null;
  isAdmin?: boolean;
};
