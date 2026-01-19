export interface Student {
  id: string;
  student_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  department: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface EquipmentMaster {
  id: string;
  category_id: string;
  subcategory_id: string | null;
  name: string;
  manufacturer: string | null;
  model: string | null;
  total_quantity: number;
  available_quantity: number;
  is_set: boolean;
  set_description: string | null;
  description: string | null;
  // any 제거 -> Record<string, string | number> 로 변경
  specifications: Record<string, string | number>;
  notes: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  // any 제거 -> string[] 로 변경
  additional_images: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  reservation_number: string;
  leader_student_id: string;
  leader_name: string;
  leader_phone: string;
  director_name: string | null;
  team_members: string | null;
  purpose: string;
  purpose_detail: string | null;
  shoot_date: string;
  start_datetime: string;
  end_datetime: string;
  status: string;
  created_at: string;
  updated_at: string;
}
