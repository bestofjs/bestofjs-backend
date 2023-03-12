export type Project = {
  created_at: string;
  delta: number;
  description: string;
  full_name: string;
  icon: string;
  monthly: number[];
  name: string;
  owner_id: number;
  repository: string;
  slug: string;
  stars: number;
  tags: string[];
  url: string;
};

export type Category = {
  key: string;
  tags: string[];
  excluded: string[];
  count: number;
  disabled: boolean;
};
