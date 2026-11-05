import { RowDataPacket } from "mysql2/promise";

export interface UserRecord extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  profile_image: string | null;
  is_online: number;
  last_seen: Date | null;
}
